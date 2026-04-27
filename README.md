# Obras del País — Website Rebuild

> 👋 **¿Eres Isaak (o cualquier persona nueva en el proyecto)?** Empieza por **[`START_HERE.md`](START_HERE.md)** — guía paso a paso para Mac y Windows, instalar Claude Code, conectarte a GitHub, y terminar el sitio.

> 🏁 **v0.1.0 milestone — Preview is live and feature-complete** at https://obrasdelpais.info/. Pending Isaak review + four content decisions (EIN, ATH Móvil handle, Stripe Y/N, newsletter destination) before Ghost theme upload to production. See [`HANDOVER.md`](HANDOVER.md) §Milestones and §What's next for the full status.

Editorial-style rebuild of [obrasdelpais.com](https://www.obrasdelpais.com/), a Puerto Rican 501(c)(3) that documents artisans through micro-documentaries.

| Where | What |
|---|---|
| **Live preview** | **https://obrasdelpais.info/** (canonical) · also at https://steady-glacier-drz3.here.now/ |
| **Source** | https://github.com/rafaeldavid/obrasdelpais (this repo) |
| **Production target** | Existing Ghost(Pro) at obrasdelpais.com (theme upload, no DNS change yet) |
| **Brand reference** | `Obras del Pais. The Beauty of Puerto Rican Folklore.pdf` (2026 brochure, in repo root) |

The overarching goal is a redesign that **continues to support email newsletter signups and donations through the existing linked services** (PayPal hosted button, ATH Móvil, recurring "Padrino · Madrina" via PayPal, plus Ghost Members for newsletter). Nothing about that stack changes — we're rebuilding the surface, not the plumbing.

---

## What's in this repo

```
preview-site/                 → static HTML/CSS/JS, deployed to here.now
obras-del-pais-theme/         → production Ghost(Pro) theme (.zip-ready)
archive-library/              → 711 raw images scraped from the live site
                                (not published, kept for offline curation)
scripts/                      → Python scrapers + sync utilities
HANDOVER.md                   → detailed project state + pending work
README.md                     → this file
Obras del Pais...pdf          → brand brochure (visual + voice reference)
```

Both deliverables share the same `assets/css/style.css`, `assets/js/app.js`, and content JSON. Editing one and copying to the other keeps them aligned.

---

## Quick start

### See it live
```
open https://obrasdelpais.info/
```

### Run locally
```bash
cd preview-site && python3 -m http.server 4747
# → http://127.0.0.1:4747/
```

### Re-publish the live preview after changes
```bash
cd preview-site
~/.claude/skills/here-now/scripts/publish.sh . \
  --slug steady-glacier-drz3 \
  --client claude-code \
  --title "Obras del País" \
  --description "El folklore puertorriqueño en tus manos"
```

### Package the Ghost theme for upload
```bash
cd obras-del-pais-theme
zip -rq ../obras-del-pais-theme.zip . -x ".DS_Store" -x "scripts/*"
# upload obras-del-pais-theme.zip in Ghost admin → Settings → Design → Themes
```

### Refresh content from the live site (artisans + videos + images)
```bash
python3 scripts/extract-content.py     # 38 artisans + 38 video IDs + cover images
python3 scripts/scrape-all-images.py   # 711 images + tagged manifest
python3 scripts/use-cdn-urls.py        # Ghost CDN URLs into artisans.json + curated.json
```

---

## Architecture

### Pages (parity with the original site)

| Path | Static file | Ghost template | Source of truth |
|---|---|---|---|
| `/` | `index.html` | `home.hbs` | hardcoded copy + JS-rendered featured cards |
| `/documentales/` | `documentales.html` | `page-documentales.hbs` | `videos.json` enriched live via YouTube oembed |
| `/directorio/` | `directorio.html` | `page-directorio.hbs` | `artisans.json` (38 entries) |
| `/artesano/` | `artesano.html?slug=...` | (Ghost: per-post pages) | `artisans.json` + `videos.json` |
| `/quienes-somos/` | `quienes-somos.html` | `page-quienes-somos.hbs` | hardcoded copy |
| `/donar/` | `donar.html` | `page-donar.hbs` | hardcoded copy + theme custom fields |
| `/noticias/` | `noticias.html` | `index.hbs` | hardcoded cards (static) / Ghost posts (theme) |
| `/lengua-de-senas/` | `lengua-de-senas.html` | `page-lengua-de-senas.hbs` | hardcoded |
| `/preguntas-frecuentes/` | `preguntas-frecuentes.html` | `page-preguntas-frecuentes.hbs` | hardcoded grid + Ghost posts tagged `guia` |
| `/contactanos/` | `contactanos.html` | `page-contactanos.hbs` | hardcoded |
| `/404` | `404.html` | `error.hbs` | "Esta historia aún no se ha contado." |

### Linked services (configured, not changed)

| Service | What it powers | How it's wired |
|---|---|---|
| **PayPal hosted button** | One-time donations + Padrino monthly recurring | Hardcoded URL `https://www.paypal.com/donate/?hosted_button_id=97XWVQV6YQT6C&source=qr` in `donar.html`. Surfaces three rails (PayPal · Padrino · ATH Móvil) above the fold. In the Ghost theme the URL is a custom theme setting `paypal_donate_url`. |
| **ATH Móvil** | Instant pay from Puerto Rico | Donate page tells the user to search "Obras del País" in the ATH Móvil business directory. Theme custom setting `ath_movil_business`. The exact handle/merchant ID is **TODO** (see HANDOVER §Pending). |
| **Ghost Members (newsletter)** | Email signups + member-only access | Forms use `data-members-form="subscribe"` which Ghost's bundled JS wires automatically when the theme is uploaded. On the static preview the same forms render but no-op (see HANDOVER §Pending). |
| **YouTube** | Documentary playback | Documentaries page calls `youtube.com/oembed` at runtime to pull live titles + thumbnails (no API key, CORS-allowed, cached 24h in localStorage). Each card links out to `youtube.com/watch?v=...`. |
| **Ghost CMS image CDN** | All photography | `storage.ghost.io/c/0b/21/0b211f14-.../content/images/...` — already public. The static preview references these URLs directly so we don't ship 211MB to here.now. |

### Design system

- **Colors** — true black `#000`, paper `#f5f1ea`, ochre `#8b7c54`, slate `#4a6d75`, clay `#a8442a`, gold `#c9a55c`. All as CSS custom properties at the top of `assets/css/style.css`.
- **Type** — Cormorant Garamond (display serif), Inter (body), Caveat (handwritten script for emotional accents), IBM Plex Mono (UI labels).
- **Voice** — Spanish-canonical with EN toggle (top-right pill). Bilingual blocks via `data-lang="es|en"` attributes; JS toggles visibility.
- **Behavior** — single hero (no carousel), editorial documentary index linked out to YouTube (no embeds), donate CTA earns its placement after the closing line.

---

## File conventions

```
preview-site/
├── index.html                    # homepage (split hero with right-side donate CTA)
├── documentales.html             # search + filter + live YouTube metadata
├── directorio.html               # 38 artisans, filterable
├── artesano.html                 # JS-rendered profile from artisans.json
├── quienes-somos.html            # mission · pillars · impact · testimonials · artisan voices
├── donar.html                    # form-first hero, three payment rails, Padrino tier, FAQ
├── noticias.html                 # 9 cards from real obrasdelpais.com posts
├── lengua-de-senas.html          # ASL accessibility manifesto
├── preguntas-frecuentes.html     # 13 PDF guides
├── contactanos.html              # email + phone + form
├── 404.html
├── vercel.json                   # legacy redirects (still useful)
├── sitemap.xml, robots.txt
├── scripts/sync-videos.js        # YouTube Data API sync (alternative to oembed at runtime)
└── assets/
    ├── css/style.css             # entire design system (one file)
    ├── js/app.js                 # entire runtime (i18n, nav, render, YouTube oembed cache)
    ├── img/
    │   ├── logo-icon-512.png     # tree-and-island brand mark (PNG)
    │   ├── logo-black.png        # full logotype
    │   ├── favicon-256.png, favicon-64.png
    │   └── artisans/             # 38 cover images (also referenced via Ghost CDN)
    └── data/
        ├── artisans.json         # 38 entries: name, craft (es/en), slug, region,
        │                         #            videoId, image_cdn, description, asl flag
        ├── videos.json           # 38 videos with title/description/place/region/videoId
        ├── images.json           # 711-image manifest (filename → src + tags)
        └── curated.json          # hero rotation, team picks, event candidates
```

**Editing rules of thumb:**
- Color or type tweak? Touch only the `:root` block at the top of `style.css`.
- New page (static)? Copy `quienes-somos.html` as a template — it has the standard header/footer/script wiring.
- New page (Ghost)? Create a page in admin with the slug, add `page-{slug}.hbs` to the theme.
- New artisan? Append to `assets/data/artisans.json`. Both sites pick it up immediately.
- New documentary on YouTube? Re-run `scripts/extract-content.py` (or rely on the runtime oembed if it's already in `videos.json`).

---

## Picking up where we left off

Read **`HANDOVER.md`** for the full state of the project, including:
- Decision log
- Pending integrations (newsletter wiring, ATH Móvil handle, EIN, Ghost theme upload)
- Open questions
- Common operations (re-publish, refresh content, add a news post)
- The agent-panel directives that drove the design

This README is the on-ramp; HANDOVER is the field manual.

---

## Credits

Design direction informed by the [Obras del País 2026 brochure](Obras%20del%20Pais.%20The%20Beauty%20of%20Puerto%20Rican%20Folklore.pdf) and a multi-persona advisory panel (artisan, photographer, videographer, master artisan, storyteller, patron, engineer, fundraiser). Reference: [nationofartisans.com](https://www.nationofartisans.com/).

Built collaboratively with Claude Code (Anthropic) over an extended session in April 2026 — see `git log` for the play-by-play.
