#!/usr/bin/env python3
"""
Scrape ALL images from obrasdelpais.com (artisan pages, homepage, about, news,
events, accessibility) and download them under preview-site/assets/img/library/,
producing a tagged manifest at preview-site/assets/data/images.json.

Tags assigned per image:
  - source_url:   the page the image was found on
  - source_kind:  artisan | post | page
  - artisan_slug: only when source is an artisan page
  - position:     "cover" (og:image), "content_<i>" (in-body, ordered)
  - alt:          alt text if present
  - filename:     stable filename derived from the Ghost storage URL

Run:  python3 scripts/scrape-all-images.py
"""
import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "preview-site"
THEME = ROOT / "obras-del-pais-theme"
LIB = PREVIEW / "assets/img/library"
LIB.mkdir(parents=True, exist_ok=True)
(THEME / "assets/img/library").mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
SITE = "https://www.obrasdelpais.com"

OG_IMG_RE = re.compile(r'property="og:image"[^>]*content="([^"]+)"')
IMG_TAG_RE = re.compile(r'<img[^>]+>', re.I)
SRC_RE = re.compile(r'\bsrc="([^"]+)"', re.I)
ALT_RE = re.compile(r'\balt="([^"]*)"', re.I)
SRCSET_RE = re.compile(r'\bsrcset="([^"]+)"', re.I)

KEEP_HOSTS = {"storage.ghost.io", "static.ghost.org"}


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def fetch_text(url):
    return fetch(url).decode("utf-8", errors="ignore")


def list_sitemap():
    """Pull all page + post URLs from the Ghost sitemap index."""
    urls = []
    try:
        index = fetch_text(f"{SITE}/sitemap.xml")
    except Exception as e:
        print(f"sitemap.xml failed: {e}", file=sys.stderr)
        return urls
    for child in re.findall(r"<loc>([^<]+)</loc>", index):
        if "sitemap-" in child and child.endswith(".xml"):
            try:
                sub = fetch_text(child)
                urls.extend(re.findall(r"<loc>([^<]+)</loc>", sub))
            except Exception as e:
                print(f"  {child} failed: {e}", file=sys.stderr)
    return urls


def biggest_size_url(url):
    """Rewrite Ghost size param to a large variant for download."""
    return re.sub(r"/size/w\d+(h\d+)?/", "/size/w2400/", url)


def normalize_filename(url):
    """Stable filename derived from the storage path so duplicates dedupe."""
    p = urlparse(url).path
    p = re.sub(r"/size/w\d+(h\d+)?/", "/", p)
    name = p.lstrip("/").replace("/", "_")
    name = re.sub(r"^content_images_", "", name)
    return name[-160:]  # avoid filesystem name limits


def parse_page(url):
    try:
        body = fetch_text(url)
    except Exception as e:
        return {"url": url, "error": str(e), "images": []}
    images = []
    seen = set()

    og = OG_IMG_RE.search(body)
    if og:
        u = og.group(1)
        if any(h in u for h in KEEP_HOSTS):
            images.append({"url": u, "alt": "", "position": "cover"})
            seen.add(u.split("?")[0])

    for i, tag in enumerate(IMG_TAG_RE.findall(body)):
        m = SRC_RE.search(tag)
        if not m:
            continue
        u = m.group(1)
        if u.startswith("//"):
            u = "https:" + u
        if not u.startswith("http"):
            continue
        host = urlparse(u).netloc
        if host not in KEEP_HOSTS:
            continue
        # skip logos and tiny avatars
        if "ODP-Logo" in u or "favicon" in u or "/avatar" in u:
            continue
        # prefer largest from srcset if present
        ssm = SRCSET_RE.search(tag)
        if ssm:
            cands = []
            for entry in ssm.group(1).split(","):
                bits = entry.strip().split()
                if len(bits) == 2 and bits[1].endswith("w"):
                    try:
                        cands.append((int(bits[1][:-1]), bits[0]))
                    except ValueError:
                        pass
            if cands:
                u = max(cands, key=lambda x: x[0])[1]
        key = u.split("?")[0]
        if key in seen:
            continue
        seen.add(key)
        alt = ALT_RE.search(tag)
        images.append({
            "url": u,
            "alt": (alt.group(1) if alt else "").strip(),
            "position": f"content_{i+1}",
        })
    return {"url": url, "images": images}


def classify(url):
    """Return (kind, slug) for a page URL — slug used for artisan grouping."""
    path = urlparse(url).path.strip("/")
    if path == "":
        return ("home", "home")
    if path in {"quienes-somos", "donar", "contactanos", "contacto", "noticias-y-eventos",
                "preguntas-frecuentes", "accesibilidad-en-lengua-de-senas",
                "lengua-de-senas", "directorio-de-artesanos", "membership",
                "propuesta-para-auspicio", "terminos-y-condiciones-de-uso",
                "politica-de-privacidad", "suscribete"}:
        return ("page", path)
    # artisan pages share recognizable prefixes/slugs
    if any(path.startswith(p) for p in ("microdoc", "nuevo-microdoc", "microdocumental", "rafael-y-rosa", "milly-borrero", "ibsen-peralta", "pesca-artesanal", "alice-cheverez", "limary-rivera", "misael-fernandez", "angel-lopez", "bacaju", "juan-irizarry", "evelyn-vazquez", "victor-ivan-sosa", "iris-torres", "guadalupe-villalobos", "gerardo-hernandez", "edwin-marcucci", "jose-antonio", "anna-nicholson", "nellie-y-sandra", "teissonniere", "teresa-melendez")):
        return ("artisan", path)
    return ("post", path)


def main():
    print("Loading sitemap…")
    urls = sorted(set(list_sitemap()))
    urls = [u for u in urls if "obrasdelpais.com" in u]
    print(f"  {len(urls)} URLs to scan.")

    # Load the slug map to translate legacy artisan slugs -> clean slugs
    artisans_path = PREVIEW / "assets/data/artisans.json"
    artisans = json.loads(artisans_path.read_text())
    legacy_to_clean = {a.get("legacy_slug"): a["slug"] for a in artisans if a.get("legacy_slug")}

    pages = []
    print("Parsing pages in parallel…")
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(parse_page, u): u for u in urls}
        for f in as_completed(futures):
            r = f.result()
            pages.append(r)
            n = len(r.get("images", []))
            err = f"  ERR {r.get('error')}" if r.get("error") else ""
            print(f"  {n:3} imgs  {urlparse(r['url']).path}{err}")

    # Build manifest + collect downloads
    manifest = {
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": SITE,
        "pages": [],
        "images_by_filename": {},
    }
    downloads = {}  # filename -> (url, [tag dicts])
    for p in pages:
        if p.get("error"):
            continue
        kind, raw_slug = classify(p["url"])
        clean = legacy_to_clean.get(raw_slug, raw_slug) if kind == "artisan" else raw_slug
        page_entry = {"url": p["url"], "kind": kind, "slug": clean, "image_count": len(p["images"])}
        manifest["pages"].append(page_entry)
        for img in p["images"]:
            fname = normalize_filename(img["url"])
            tag = {
                "source_url": p["url"],
                "source_kind": kind,
                "page_slug": clean,
                "artisan_slug": clean if kind == "artisan" else None,
                "position": img["position"],
                "alt": img["alt"] or None,
            }
            downloads.setdefault(fname, (img["url"], []))[1].append(tag)

    print(f"\n{len(downloads)} unique images to download.")

    def dl(fname, url):
        dest = LIB / fname
        if dest.exists() and dest.stat().st_size > 0:
            return f"skip {fname}"
        try:
            data = fetch(biggest_size_url(url))
            dest.write_bytes(data)
            return f"ok   {fname} ({len(data)//1024} KB)"
        except Exception as e:
            return f"FAIL {fname} {e}"

    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(dl, fname, info[0]): fname for fname, info in downloads.items()}
        ok = fail = skip = 0
        for f in as_completed(futures):
            line = f.result()
            if line.startswith("ok"):
                ok += 1
            elif line.startswith("skip"):
                skip += 1
            else:
                fail += 1
            if (ok + fail + skip) % 25 == 0 or line.startswith("FAIL"):
                print(f"  [{ok+fail+skip}/{len(downloads)}] {line}")
        print(f"  done: {ok} ok, {skip} skipped, {fail} failed")

    # Write manifest
    for fname, (src_url, tags) in downloads.items():
        manifest["images_by_filename"][fname] = {
            "src_original": src_url,
            "local": f"/assets/img/library/{fname}",
            "tags": tags,
        }
    images_path = PREVIEW / "assets/data/images.json"
    images_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (THEME / "assets/data/images.json").write_text(images_path.read_text())
    print(f"\nWrote manifest to {images_path} ({len(downloads)} images, {len(manifest['pages'])} pages).")

    # Mirror to theme
    theme_lib = THEME / "assets/img/library"
    for f in LIB.glob("*"):
        if f.is_file():
            (theme_lib / f.name).write_bytes(f.read_bytes())
    print(f"Mirrored library into Ghost theme.")


if __name__ == "__main__":
    main()
