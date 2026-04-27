#!/usr/bin/env python3
"""
For each artisan, scrape the live obrasdelpais.com profile page and extract:
- narrative paragraphs (the artisan's story / what makes their craft worth
  documenting), with boilerplate (copyright, viewing instructions,
  not-selling notice, social-follow CTA) removed
- a structured contact block (phone, email, Instagram, Facebook,
  especialidad, talleres availability, time-per-piece, catalogue link)
  parsed out of the emoji-separated paragraph
- gallery image URLs

Output: preview-site/assets/data/artisans/<slug>.json (mirrored to theme)

Run: python3 scripts/enrich-artisans.py
"""
import json, re, pathlib, urllib.request, time
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

# Patterns that flag a paragraph as boilerplate (same across every artisan page).
BOILERPLATE_PATTERNS = [
    re.compile(r"Duraci[óo]n\s*:\s*\d+\s*minutos?", re.I),
    re.compile(r"Recomendamos ver", re.I),
    re.compile(r"derechos? de autor", re.I),
    re.compile(r"no est[áa] permitido descargar", re.I),
    re.compile(r"compartir de otra manera|coordinar talleres, comun[íi]cate", re.I),
    re.compile(r"Obras del Pa[íi]s no\s+(vende|est[áa])", re.I),
    re.compile(r"Si deseas colaborar", re.I),
    re.compile(r"Agradecemos y fomentamos que compartas", re.I),
    re.compile(r"S[íi]guenos en\s+Instagram", re.I),
    re.compile(r"¿Te quedaste con ganas", re.I),
    re.compile(r"NOTA\s*:\s*Obras del Pa[íi]s", re.I),
    re.compile(r"piensa en un artesano boricua", re.I),
    re.compile(r"Transforma tu clase con este documental", re.I),
    re.compile(r"Plan de Lecci[óo]n", re.I),
    re.compile(r"interpretaci[óo]n en Lengua de Se[ñn]as", re.I),
    re.compile(r"vocabulario en lengua de se[ñn]as", re.I),
    re.compile(r"al taller de\s+\w+\s+y\s+\w+\b", re.I),  # "al taller de Rafael y Rosa..." sometimes lifted into intro
]

# Emoji-keyed structured fields. Pattern: emoji + label + colon + value.
FIELD_PATTERNS = {
    "phone":         re.compile(r"(?:📞|☎)[\s ]*(?:Tel[ée]fono\s*:?\s*)?([\d\s\-\.\(\)]{7,20})", re.I),
    "email":         re.compile(r"(?:📧|✉)[\s ]*(?:Email\s*:?\s*|Correo\s*:?\s*)?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})", re.I),
    "instagram":     re.compile(r"(?:🌅|📷|📸|💜)[\s ]*Instagram\s*:?\s*([a-z0-9_.]{2,32})", re.I),
    "facebook":      re.compile(r"(?:👥|📘|💙)[\s ]*Facebook\s*:?\s*([a-z0-9_. ]{2,60})", re.I),
    "especialidad":  re.compile(r"(?:🎭|🎨|🛠|🪵|🏺|🧵)[\s ]*Especialidad\s*:?\s*([^📍📞📧🌅👥🎭📖🛠⏳⏱🕒📅🌐💬🇵🇷📺🤟🎥]+?)(?=📍|📞|📧|🌅|👥|🎭|📖|🛠|⏳|⏱|🕒|📅|🌐|💬|🇵🇷|$)", re.I | re.S),
    "talleres":      re.compile(r"(?:🛠️?|🎓|🪚)[\s ]*TALLERES\s*:?\s*([^📍📞📧🌅👥🎭📖🛠⏳⏱🕒📅🌐💬🇵🇷📺🤟🎥]+?)(?=📍|📞|📧|🌅|👥|🎭|📖|🛠|⏳|⏱|🕒|📅|🌐|💬|🇵🇷|$)", re.I | re.S),
    "timeline":      re.compile(r"(?:⏳|⏱|🕒)[\s ]*([^📍📞📧🌅👥🎭📖🛠⏳⏱🕒📅🌐💬🇵🇷📺🤟🎥]+?)(?=📍|📞|📧|🌅|👥|🎭|📖|🛠|⏳|⏱|🕒|📅|🌐|💬|🇵🇷|$)", re.I | re.S),
}
CATALOG_HREF_RE = re.compile(r"📖[^<]*<a[^>]+href=\"([^\"]+)\"", re.I)


class TagStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.in_skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.in_skip += 1
    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.in_skip:
            self.in_skip -= 1
    def handle_data(self, d):
        if not self.in_skip:
            self.text.append(d)
    def handle_entityref(self, name):
        # &nbsp; -> regular space; rest passthrough is fine
        if name == "nbsp":
            self.text.append(" ")


def strip_tags(s):
    p = TagStripper()
    p.feed(s)
    return "".join(p.text)


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="ignore")


def is_boilerplate(text):
    return any(p.search(text) for p in BOILERPLATE_PATTERNS)


def extract_post_wrap(html):
    m = re.search(
        r'<div[^>]*class="post-wrap[^"]*"[^>]*>(.+?)(?:<footer|<div class="prev-next)',
        html, re.S
    )
    if not m:
        return ""
    body = m.group(1)
    # drop the featured-image header so we don't capture the title twice
    body = re.sub(
        r'<div class="section-featured[^"]*"[^>]*>.+?(?=<div class="section-content)',
        '', body, flags=re.S
    )
    return body


def extract_paragraphs(body):
    raw = re.findall(r'<p[^>]*>(.+?)</p>', body, re.S)
    items = []
    for r in raw:
        text = strip_tags(r)
        text = re.sub(r"\s+", " ", text).strip()
        if not text or len(text) < 12:
            continue
        items.append({"text": text, "html": r})
    return items


def extract_gallery(body, cover_url):
    urls = re.findall(r'<img[^>]+src="([^"]+)"', body)
    out, seen = [], set()
    cover_key = cover_url.split("?")[0] if cover_url else ""
    for u in urls:
        if "ODP-Logo" in u or "/avatar" in u or "favicon" in u:
            continue
        big = re.sub(r"/size/w\d+(h\d+)?/", "/size/w1600/", u)
        key = big.split("?")[0]
        if cover_key and (key == cover_key or key.endswith(cover_key.rsplit("/", 1)[-1])):
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(big)
    return out[:8]


def parse_contact_paragraph(text):
    """Extract structured fields from the emoji-separated paragraph."""
    fields = {}
    for k, pattern in FIELD_PATTERNS.items():
        m = pattern.search(text)
        if not m:
            continue
        val = m.group(1).strip().rstrip(".,;:")
        # collapse internal whitespace
        val = re.sub(r"\s+", " ", val)
        if val:
            fields[k] = val
    return fields


def categorize(items):
    """
    Return a tuple of:
      narrative: list of {text, html} — actual story prose
      contact_p: dict of structured fields parsed from the emoji paragraph
      catalog_href: url string if a "📖 Accede al catálogo" link was found
    """
    narrative = []
    contact = {}
    catalog_href = None
    for it in items:
        t = it["text"]
        if is_boilerplate(t):
            continue
        # Heuristic for the structured contact paragraph:
        if re.search(r"📍|📞|📧|🌅|👥|🎭|🛠|Especialidad\s*:", t):
            contact.update(parse_contact_paragraph(t))
            cm = CATALOG_HREF_RE.search(it["html"])
            if cm:
                catalog_href = cm.group(1)
            continue
        # Otherwise it's narrative
        narrative.append(it["text"])
    return narrative, contact, catalog_href


def enrich_one(artisan):
    slug = artisan["slug"]
    legacy = artisan.get("legacy_slug")
    if not legacy:
        return slug, "no legacy_slug"
    url = f"https://www.obrasdelpais.com/{legacy}/"
    try:
        page = fetch(url)
    except Exception as e:
        return slug, f"fetch failed: {e}"
    body = extract_post_wrap(page)
    if not body:
        return slug, "no post-wrap"
    items = extract_paragraphs(body)
    narrative, contact, catalog_href = categorize(items)
    gallery = extract_gallery(body, artisan.get("image_cdn", ""))
    out = {
        "slug": slug,
        "name": artisan["name"],
        "narrative_es": narrative,
        "phone": contact.get("phone"),
        "email": contact.get("email"),
        "instagram": contact.get("instagram"),
        "facebook": contact.get("facebook"),
        "especialidad": contact.get("especialidad"),
        "talleres": contact.get("talleres"),
        "timeline": contact.get("timeline"),
        "catalog_url": catalog_href,
        "gallery": gallery,
    }
    (ART_DIR / f"{slug}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n"
    )
    (THEME_ART_DIR / f"{slug}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n"
    )
    return slug, None


def main():
    artisans = json.loads((PREVIEW / "assets/data/artisans.json").read_text())
    print(f"Enriching {len(artisans)} artisans…")
    ok, fail = 0, []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(enrich_one, a): a["slug"] for a in artisans}
        for f in as_completed(futures):
            slug, err = f.result()
            if err:
                fail.append((slug, err))
                print(f"  FAIL {slug:46} {err}")
            else:
                ok += 1
                d = json.loads((ART_DIR / f"{slug}.json").read_text())
                bits = []
                if d.get("phone"): bits.append("phone")
                if d.get("email"): bits.append("email")
                if d.get("instagram"): bits.append("ig")
                if d.get("facebook"): bits.append("fb")
                if d.get("especialidad"): bits.append("esp")
                if d.get("talleres"): bits.append("talleres")
                if d.get("timeline"): bits.append("time")
                print(f"  ok   {slug:46} narrative={len(d['narrative_es'])} gallery={len(d['gallery'])} fields=[{','.join(bits)}]")
            time.sleep(0.05)
    print(f"\n{ok} ok, {len(fail)} failed.")

    # Mirror the canonical artisans.json with `enriched: true`
    enriched = {p.stem for p in ART_DIR.glob("*.json")}
    for a in artisans:
        a["enriched"] = a["slug"] in enriched
    (PREVIEW / "assets/data/artisans.json").write_text(
        json.dumps(artisans, ensure_ascii=False, indent=2) + "\n"
    )
    (THEME / "assets/data/artisans.json").write_text(
        (PREVIEW / "assets/data/artisans.json").read_text()
    )


if __name__ == "__main__":
    main()
