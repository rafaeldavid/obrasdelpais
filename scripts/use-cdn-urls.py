#!/usr/bin/env python3
"""
Rewrite artisans.json `image` field from local path → Ghost CDN URL,
and emit a `cdn` map in images.json so the JS can prefer remote URLs.
This keeps the local copies in the repo for offline reference but lets
the live site pull from Ghost's CDN (no need to ship 211MB to here.now).
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "preview-site"

artisans = json.loads((PREVIEW / "assets/data/artisans.json").read_text())
images = json.loads((PREVIEW / "assets/data/images.json").read_text())

# Build slug -> cover CDN URL from images.json
cover_by_slug = {}
for fname, info in images["images_by_filename"].items():
    src = info["src_original"]
    for tag in info["tags"]:
        if tag["source_kind"] == "artisan" and tag["position"] == "cover":
            cover_by_slug[tag["page_slug"]] = src

# Also build by page_slug for non-artisan pages so we can use rich imagery
images_by_page = {}
for fname, info in images["images_by_filename"].items():
    for tag in info["tags"]:
        slug = tag.get("page_slug")
        if not slug:
            continue
        images_by_page.setdefault(slug, []).append({
            "url": info["src_original"],
            "alt": tag.get("alt"),
            "position": tag.get("position"),
            "source_kind": tag.get("source_kind"),
        })

# Patch artisans.json with image_cdn (keep local image path as fallback)
patched = 0
for a in artisans:
    cdn = cover_by_slug.get(a["slug"])
    if cdn:
        a["image_cdn"] = cdn
        patched += 1
(PREVIEW / "assets/data/artisans.json").write_text(json.dumps(artisans, ensure_ascii=False, indent=2) + "\n")
print(f"Added image_cdn to {patched}/{len(artisans)} artisans.")

# Mirror to theme
theme_artisans = ROOT / "obras-del-pais-theme/assets/data/artisans.json"
theme_artisans.write_text((PREVIEW / "assets/data/artisans.json").read_text())

# Curate a "library by page" map exported as a separate file for the homepage to use
curated = {
    "home": [],
    "quienes-somos": [],
    "donar": [],
    "noticias-y-eventos": [],
    "accesibilidad-en-lengua-de-senas": [],
}
for slug in curated:
    curated[slug] = [im for im in images_by_page.get(slug, []) if im["position"].startswith("content")][:12]

# Pull a curated set of "hero rotation" candidates: the cover photos of artisans 1-10 (proven format)
hero_rotation = []
for a in artisans[:12]:
    if a.get("image_cdn"):
        hero_rotation.append({"url": a["image_cdn"], "name": a["name"], "slug": a["slug"]})

# Pull team / about photos: any image from quienes-somos page that has alt text or appears multiple times
team_candidates = []
for img in images_by_page.get("quienes-somos", []):
    team_candidates.append({"url": img["url"], "alt": img["alt"], "position": img["position"]})

# Group: behind the scenes / events from /noticias-y-eventos posts
event_candidates = []
for slug, imgs in images_by_page.items():
    for img in imgs:
        if img["source_kind"] == "post" and img["position"] != "cover":
            event_candidates.append({"url": img["url"], "alt": img["alt"], "page_slug": slug})
event_candidates = event_candidates[:30]

curated_path = PREVIEW / "assets/data/curated.json"
curated_path.write_text(json.dumps({
    "hero_rotation": hero_rotation,
    "team": team_candidates[:8],
    "events": event_candidates,
}, ensure_ascii=False, indent=2) + "\n")
(ROOT / "obras-del-pais-theme/assets/data/curated.json").write_text(curated_path.read_text())
print(f"Wrote curated.json: {len(hero_rotation)} hero · {len(team_candidates[:8])} team · {len(event_candidates)} events")
