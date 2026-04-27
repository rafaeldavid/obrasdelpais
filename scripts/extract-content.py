#!/usr/bin/env python3
"""
Extract images, YouTube video IDs, and descriptions from the live obrasdelpais.com
artisan pages, and update preview-site/assets/data/{artisans,videos}.json
plus download cover images to preview-site/assets/img/artisans/.

Run:  python3 scripts/extract-content.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "preview-site"
THEME = ROOT / "obras-del-pais-theme"
IMG_DIR = PREVIEW / "assets/img/artisans"
IMG_DIR.mkdir(parents=True, exist_ok=True)
(THEME / "assets/img/artisans").mkdir(parents=True, exist_ok=True)

# (clean_slug, legacy_slug_on_obrasdelpais.com)
SLUG_MAP = [
    ("antonio-nieves",                            "microdocumental-1-antonionieves"),
    ("jorge-rivera-tornero-de-lajas",             "microdoc-2-jorge-rivera-tornero-de-lajas"),
    ("gloria-lopez-estrella-talladora-de-santos", "microdoc-3-gloria-lopez-estrella-talladora-de-santos"),
    ("alex-rios-tallador-de-aves",                "microdoc-4-alex-rios-tallador-de-aves"),
    ("rafael-aviles-vazquez-lutier",              "microdoc-5-rafael-aviles-vazquez-lutier"),
    ("kenneth-melendez",                          "microdoc-6-100-kenneth-melendez"),
    ("wanda-ramirez-flora-en-cuero",              "microdoc-7-100-wanda-ramirez-flora-en-cuero"),
    ("eliseo-elo-molina",                         "microdoc-8-100-eliseo-elo-molina"),
    ("norma-gomez-petate",                        "microdoc-9-100-norma-gomez-petate"),
    ("teissonniere-tallador-de-gallos",           "teissonniere-tallador-de-gallos"),
    ("anna-nicholson-grabados",                   "anna-nicholson-grabados"),
    ("nellie-y-sandra-tejedoras-de-mundillo",     "nellie-y-sandra-tejedoras-de-mundillo"),
    ("edwin-marcucci-cesteria",                   "edwin-marcucci-cesteria"),
    ("jose-antonio-escultor-en-piedra",           "jose-antonio-escultor-en-piedra"),
    ("nicholas-damiani-alfareria",                "nuevo-microdoc-nicholas-damiani-alfareria"),
    ("lourdes-soto-ramos-metal-repujado",         "nuevo-microdoc-lourdes-soto-ramos-metal-repujado"),
    ("masaro-perez-escultura-en-ceramica",        "nuevo-microdoc-masaro-perez-escultura-en-ceramica"),
    ("gerardo-hernandez-cortes-flautas-de-madera","gerardo-hernandez-cortes-flautas-de-madera"),
    ("deborah-feliciano-fachadas-sobre-bambu",    "nuevo-microdoc-deborah-feliciano-fachadas-sobre-bambu"),
    ("teddy-vazquez-y-wilda-cruz",                "nuevo-microdoc-teddy-vazquez-y-wilda-cruz"),
    ("teresa-melendez-munecas-de-trapo",          "teresa-melendez-munecas-de-trapo-artesanos-de-puerto-rico"),
    ("wilzen-cuco-perez-los-reyes-en-carretas",   "nuevo-microdoc-wilzen-cuco-perez-los-reyes-en-carretas"),
    ("gladys-serrano-textiles-tenidos",           "nuevo-microdoc-gladys-serrano-textiles-tenidos-y-estampados"),
    ("guadalupe-villalobos-muebles-de-enea",      "guadalupe-villalobos-muebles-de-enea"),
    ("jose-hernandez-y-carmen-soto-hamacas",      "nuevo-microdoc-jose-hernandez-y-carmen-soto-hamacas"),
    ("iris-torres-talla-de-hueso",                "iris-torres-talla-de-hueso"),
    ("victor-ivan-sosa-casitas-tipicas-en-barro", "victor-ivan-sosa-casitas-tipicas-en-barro"),
    ("evelyn-vazquez-talla-de-madera",            "evelyn-vazquez-talla-de-madera"),
    ("juan-irizarry-artesano-tabaco",             "juan-irizarry-artesano-tabaco"),
    ("bacaju-artesania-como-practica-de-vida",    "bacaju-artesania-como-practica-de-vida"),
    ("angel-lopez-la-pava-sombrero-jibaro",       "angel-lopez-la-pava-sombrero-jibaro-de-puerto-rico"),
    ("misael-fernandez-cuchilleria",              "misael-fernandez-artesano-cuchilleria"),
    ("limary-rivera-trajes-y-mascaras-de-vejigantes", "limary-rivera-trajes-y-mascaras-de-vejigantes-2"),
    ("alice-cheverez-alfareria-ancestral",        "alice-cheverez-alfareria-ancestral-de-boriken"),
    ("pesca-artesanal-memorias",                  "pesca-artesanal-memorias-de-una-comunidad-pesquera"),
    ("ibsen-peralta-talla-de-santos",             "ibsen-peralta-talla-de-santos"),
    ("milly-borrero-soles-de-naranjito",          "milly-borrero-soles-de-naranjito"),
    ("rafael-y-rosa-juguetes-de-madera",          "rafael-y-rosa-juguetes-de-madera"),
]

OG_IMG_RE = re.compile(r'property="og:image"[^>]*content="([^"]+)"')
OG_DESC_RE = re.compile(r'property="og:description"[^>]*content="([^"]+)"')
OG_TITLE_RE = re.compile(r'property="og:title"[^>]*content="([^"]+)"')
EMBED_RE = re.compile(r'youtube\.com/embed/([A-Za-z0-9_-]{11})')

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def extract(clean_slug, legacy_slug):
    url = f"https://www.obrasdelpais.com/{legacy_slug}/"
    try:
        body = fetch(url).decode("utf-8", errors="ignore")
    except Exception as e:
        return {"slug": clean_slug, "legacy_slug": legacy_slug, "error": str(e)}
    img = OG_IMG_RE.search(body)
    desc = OG_DESC_RE.search(body)
    title = OG_TITLE_RE.search(body)
    vid = EMBED_RE.search(body)
    return {
        "slug": clean_slug,
        "legacy_slug": legacy_slug,
        "image_url": img.group(1) if img else None,
        "description": desc.group(1) if desc else None,
        "title": title.group(1) if title else None,
        "videoId": vid.group(1) if vid else None,
    }


def download(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        return f"skip {dest.name}"
    try:
        # Strip Ghost size param to get the largest version, then re-add a sensible cap
        # Original looks like .../images/size/w1200/2021/04/file.jpg
        # We'll request w1600 to balance quality and size for the rebuild
        big_url = re.sub(r"/size/w\d+(h\d+)?/", "/size/w1600/", url)
        data = fetch(big_url)
        dest.write_bytes(data)
        return f"ok   {dest.name} ({len(data) // 1024} KB)"
    except Exception as e:
        return f"FAIL {dest.name} {e}"


def main():
    print(f"Fetching {len(SLUG_MAP)} artisan pages from obrasdelpais.com…")
    results = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(extract, c, l): c for c, l in SLUG_MAP}
        for f in as_completed(futures):
            r = f.result()
            results.append(r)
            tag = "✓" if (r.get("image_url") and r.get("videoId")) else ("•" if r.get("image_url") or r.get("videoId") else "✗")
            err = f" — {r['error']}" if r.get("error") else ""
            print(f"  {tag} {r['slug']:48} img={'Y' if r.get('image_url') else 'n'} vid={r.get('videoId') or '—'}{err}")

    by_slug = {r["slug"]: r for r in results}

    # Update artisans.json
    art_path = PREVIEW / "assets/data/artisans.json"
    artisans = json.loads(art_path.read_text())
    for a in artisans:
        r = by_slug.get(a["slug"])
        if not r:
            continue
        a["legacy_slug"] = r["legacy_slug"]
        if r.get("image_url"):
            a["image"] = f"/assets/img/artisans/{a['slug']}.jpg"
        if r.get("description"):
            a["description"] = r["description"]
        if r.get("videoId"):
            a["videoId"] = r["videoId"]
    art_path.write_text(json.dumps(artisans, ensure_ascii=False, indent=2) + "\n")
    (THEME / "assets/data/artisans.json").write_text(art_path.read_text())
    print(f"\nWrote artisans.json ({len(artisans)} entries).")

    # Build videos.json
    videos = []
    for a in artisans:
        if a.get("videoId"):
            videos.append({
                "n": a["n"],
                "slug": a["slug"],
                "videoId": a["videoId"],
                "title_es": (by_slug.get(a["slug"]) or {}).get("title") or f"{a['craft_es']} · {a['name']}",
                "title_en": f"{a['craft_en']} — {a['name']}",
                "description": a.get("description"),
                "place_es": a.get("place_es"),
                "region_es": a.get("region_es"),
            })
    videos.sort(key=lambda v: -v["n"])
    out = {
        "_comment": "Generated by scripts/extract-content.py from the live obrasdelpais.com pages.",
        "lastSyncedISO": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "videos": videos,
    }
    vpath = PREVIEW / "assets/data/videos.json"
    vpath.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    (THEME / "assets/data/videos.json").write_text(vpath.read_text())
    print(f"Wrote videos.json ({len(videos)} videos with valid YouTube IDs).")

    # Download images in parallel
    print(f"\nDownloading {sum(1 for r in results if r.get('image_url'))} cover images…")
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = []
        for r in results:
            if not r.get("image_url"):
                continue
            dest = IMG_DIR / f"{r['slug']}.jpg"
            futures.append(ex.submit(download, r["image_url"], dest))
        for f in as_completed(futures):
            print(f"  {f.result()}")

    # Mirror into theme
    theme_img = THEME / "assets/img/artisans"
    for src in IMG_DIR.glob("*.jpg"):
        dst = theme_img / src.name
        dst.write_bytes(src.read_bytes())
    print(f"\nMirrored {len(list(IMG_DIR.glob('*.jpg')))} images into Ghost theme.")
    print("\nDone.")


if __name__ == "__main__":
    main()
