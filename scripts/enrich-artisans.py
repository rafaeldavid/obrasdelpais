#!/usr/bin/env python3
"""
For each artisan, scrape the full live obrasdelpais.com profile page and
write a per-slug JSON file with the rich body content, gallery, and any
contact info we can find.

Output: preview-site/assets/data/artisans/<slug>.json
- body_es:  cleaned HTML of the article body (paragraphs + headings)
- gallery:  list of image URLs (Ghost CDN), excluding the cover and logo
- phone:    Puerto Rico phone number if mentioned
- timeline: production-time string if mentioned (rough heuristic)

Run: python3 scripts/enrich-artisans.py
"""
import json, re, pathlib, urllib.request, urllib.parse, html as html_lib, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "preview-site"
THEME = ROOT / "obras-del-pais-theme"
ART_DIR = PREVIEW / "assets/data/artisans"
ART_DIR.mkdir(parents=True, exist_ok=True)
THEME_ART_DIR = THEME / "assets/data/artisans"
THEME_ART_DIR.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

PHONE_RE = re.compile(r"\b7\d{2}[\s\-\.]?\d{3}[\s\-\.]?\d{4}\b")
EMAIL_RE = re.compile(r"\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b", re.I)
IG_RE = re.compile(r"(?:instagram\.com/|@)([a-z0-9_.]{2,30})", re.I)
TIMELINE_RE = re.compile(
    r"\b(\d+(?:\s*(?:a|–|-)\s*\d+)?)\s*(meses|mes|d[ií]as|dia|d[íi]a|semanas|semana|horas|hora)\b",
    re.I
)

# Ghost wraps post content in <section class="post-content gh-content"> or similar.
# We extract that block, then prune nav/comments/share-block/etc.
POST_CONTENT_RE = re.compile(
    r'<section[^>]*class="[^"]*\bgh-content\b[^"]*"[^>]*>(.+?)</section>',
    re.I | re.S
)
ARTICLE_RE = re.compile(r"<article[^>]*>(.+?)</article>", re.I | re.S)

# Ghost CDN image base
GHOST_CDN = "https://storage.ghost.io"


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="ignore")


class TagStripper(HTMLParser):
    """Plain-text extractor for body text (used for phone/timeline regex)."""
    def __init__(self):
        super().__init__()
        self.text = []
    def handle_data(self, d):
        self.text.append(d)


def strip_tags(s):
    p = TagStripper()
    p.feed(s)
    return "".join(p.text)


def clean_body(html):
    """Trim Ghost cruft from a body chunk: nav/share/related/footer/promo."""
    # Drop entire <figure class="kg-card kg-bookmark-card"> blocks (related-link cards)
    html = re.sub(r"<figure[^>]*kg-bookmark-card[^>]*>.+?</figure>", "", html, flags=re.S | re.I)
    # Drop kg-button-card
    html = re.sub(r"<div[^>]*kg-button-card[^>]*>.+?</div>", "", html, flags=re.S | re.I)
    # Drop iframe wrappers (we link out to YouTube on our side)
    html = re.sub(r"<iframe[^>]*>.*?</iframe>", "", html, flags=re.S | re.I)
    # Drop empty paragraphs
    html = re.sub(r"<p>\s*</p>", "", html, flags=re.I)
    # Drop QR-code download blocks (heuristic — they say "QR" or "código")
    html = re.sub(
        r'<figure[^>]*>(?:(?!</figure>).)*?(?:QR|c[oó]digo)(?:(?!</figure>).)*?</figure>',
        "", html, flags=re.S | re.I
    )
    return html.strip()


def extract_body(page_html):
    m = POST_CONTENT_RE.search(page_html)
    if m:
        return clean_body(m.group(1))
    m = ARTICLE_RE.search(page_html)
    if m:
        return clean_body(m.group(1))
    return ""


def extract_images(body_html, cover_url):
    urls = re.findall(r'<img[^>]+src="([^"]+)"', body_html)
    out = []
    seen = set()
    for u in urls:
        if "ODP-Logo" in u or "favicon" in u or "/avatar" in u:
            continue
        # normalize to a stable, large-size URL
        big = re.sub(r"/size/w\d+(h\d+)?/", "/size/w1600/", u)
        key = big.split("?")[0]
        # skip the cover (we already render it)
        if cover_url and key == cover_url.split("?")[0]:
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(big)
    return out[:8]  # cap to 8 gallery images per artisan


def extract_meta(body_html, page_html):
    text = strip_tags(body_html + " " + page_html)
    phones = list(dict.fromkeys(PHONE_RE.findall(text)))
    emails = [e for e in dict.fromkeys(EMAIL_RE.findall(text))
              if "obrasdelpais" not in e and "ghost" not in e]
    igs = [m for m in dict.fromkeys(IG_RE.findall(text))
           if m.lower() != "obrasdelpais"]
    tl = TIMELINE_RE.search(text)
    return {
        "phone": phones[0] if phones else None,
        "email": emails[0] if emails else None,
        "instagram": igs[0] if igs else None,
        "timeline": tl.group(0) if tl else None,
    }


def enrich_one(artisan):
    slug = artisan["slug"]
    legacy = artisan.get("legacy_slug")
    if not legacy:
        return slug, None, "no legacy_slug"
    url = f"https://www.obrasdelpais.com/{legacy}/"
    try:
        page = fetch(url)
    except Exception as e:
        return slug, None, f"fetch failed: {e}"
    body = extract_body(page)
    if not body:
        return slug, None, "no body found"
    cover = artisan.get("image_cdn") or ""
    gallery = extract_images(body, cover)
    meta = extract_meta(body, page)
    out = {
        "slug": slug,
        "name": artisan["name"],
        "body_es": body,
        "gallery": gallery,
        **meta,
    }
    (ART_DIR / f"{slug}.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    (THEME_ART_DIR / f"{slug}.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    return slug, len(body), None


def main():
    artisans = json.loads((PREVIEW / "assets/data/artisans.json").read_text())
    print(f"Enriching {len(artisans)} artisans…")
    ok, fail = 0, []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(enrich_one, a): a["slug"] for a in artisans}
        for f in as_completed(futures):
            slug, sz, err = f.result()
            if err:
                fail.append((slug, err))
                print(f"  FAIL {slug:46} {err}")
            else:
                ok += 1
                print(f"  ok   {slug:46} body={sz} chars")
            time.sleep(0.05)
    print(f"\n{ok} ok, {len(fail)} failed.")

    # Patch artisans.json so the renderer knows which entries have rich bodies
    enriched_slugs = {p.stem for p in ART_DIR.glob("*.json")}
    for a in artisans:
        a["enriched"] = a["slug"] in enriched_slugs
    (PREVIEW / "assets/data/artisans.json").write_text(
        json.dumps(artisans, ensure_ascii=False, indent=2) + "\n"
    )
    (THEME / "assets/data/artisans.json").write_text((PREVIEW / "assets/data/artisans.json").read_text())
    print("Updated artisans.json with `enriched` flag.")


if __name__ == "__main__":
    main()
