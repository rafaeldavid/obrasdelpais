#!/usr/bin/env python3
"""
Wire Wikimedia Commons SVG flag URLs (as PNG thumbnails) into municipios.json
for the 27 municipios with documented artisans.

We don't download — we embed Special:FilePath URLs that the visitor's browser
fetches directly from Wikimedia's CDN. This:
- Keeps the repo small (no flag binaries)
- Gives each visitor their own rate-limit budget
- Lets Wikimedia cache CDN-side
- Always reflects whatever current flag is on Commons

Run: python3 scripts/fetch-muni-flags.py
"""
import json, pathlib, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "preview-site"
THEME = ROOT / "obras-del-pais-theme"

# muni-slug -> wikimedia commons filename (without "File:" prefix)
FLAG_FILES = {
    "adjuntas":      "Flag of Adjuntas, Puerto Rico.svg",
    "aguada":        "Flag of Aguada (PR).svg",
    "aguas-buenas":  "Flag of Aguas Buenas.svg",
    "bayamon":       "Flag of Bayamon.svg",
    "cabo-rojo":     "Flag of Cabo Rojo.svg",
    "caguas":        "Flag of Caguas.svg",
    "camuy":         "CamuyFlag.svg",
    "canovanas":     "Bandera de Canóvanas, Puerto Rico.svg",
    "carolina":      "Flag of Carolina, Puerto Rico.svg",
    "ciales":        "Flag of Ciales.svg",
    "guanica":       "Flag of Guanica.svg",
    "guaynabo":      "Flag of Guaynabo.svg",
    "isabela":       "Flag of Isabela.svg",
    "lajas":         "Flag of Lajas (PR).svg",
    "lares":         "Flag of Lares (1956).svg",
    "loiza":         "Loiza Flag.svg",
    "moca":          "Flag of Moca.svg",
    "morovis":       "Bandera de Morovis, Puerto Rico.svg",
    "naranjito":     "Flag of Naranjito, Puerto Rico.svg",
    "orocovis":      "Flag of Orocovis, Puerto Rico.svg",
    "penuelas":      "Bandera-peñuelas.svg",
    "ponce":         "Flag of Ponce, Puerto Rico - 1877 version.svg",
    "sabana-grande": "Bandera de Sabana Grande, Puerto Rico.svg",
    "salinas":       "Flag of Salinas, Puerto Rico.svg",
    "san-juan":      "Flag of San Juan, Puerto Rico.svg",
    "san-sebastian": "Flag of San Sebastián, Puerto Rico.svg",
    "toa-alta":      "Flag of Toa Alta.svg",
}


def thumb_url(filename, width=200):
    return ("https://commons.wikimedia.org/wiki/Special:FilePath/"
            + urllib.parse.quote(filename) + f"?width={width}")


muni_path = PREVIEW / "assets/data/municipios.json"
muni = json.loads(muni_path.read_text())

# Clear any previous local flag paths and replace with Wikimedia URLs
for slug, info in muni["by_municipio"].items():
    fname = FLAG_FILES.get(slug)
    if fname:
        info["flag"] = thumb_url(fname, 200)
        info["flag_attribution"] = f"Wikimedia Commons · {fname}"
    else:
        info.pop("flag", None)

muni_path.write_text(json.dumps(muni, ensure_ascii=False, indent=2) + "\n")
(THEME / "assets/data/municipios.json").write_text(muni_path.read_text())

# Drop the partial downloads since we're not using local flags
flags_dir = PREVIEW / "assets/img/flags"
if flags_dir.exists():
    for f in flags_dir.glob("*.svg"):
        f.unlink()
    flags_dir.rmdir()
theme_flags = THEME / "assets/img/flags"
if theme_flags.exists():
    for f in theme_flags.glob("*.svg"):
        f.unlink()
    theme_flags.rmdir()

n = sum(1 for info in muni["by_municipio"].values() if info.get("flag"))
print(f"Wired Wikimedia flag URLs for {n}/{len(muni['by_municipio'])} municipios.")
