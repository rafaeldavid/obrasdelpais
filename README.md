# Obras del País — Website Rebuild

A complete redesign of obrasdelpais.com, delivered as **two parallel deliverables**:

1. **`/preview-site/`** — a static HTML/CSS/JS preview that you can deploy to any static host (Vercel, Netlify, GitHub Pages, S3) to share the design before promoting it live.
2. **`/obras-del-pais-theme/`** — the production Ghost(Pro) theme (`.zip`-ready). Same design, ported to Handlebars, ready to upload via **Settings → Design → Themes**.

Both share the same CSS, JS, JSON data, and design system — so changes propagate cleanly.

---

## What was built

### Pages (parity with the current site)

| URL | Static file | Ghost template | Notes |
|---|---|---|---|
| `/` | `index.html` | `home.hbs` | Hero, three pillars, impact figures, latest docs, donate CTA |
| `/documentales/` | `documentales.html` | `page-documentales.hbs` | Editorial bands, region filter, links out to YouTube |
| `/directorio/` | `directorio.html` | `page-directorio.hbs` | All 38 artisans, filterable by craft + region |
| `/artesano.html?slug=...` | `artesano.html` | (see Ghost notes) | Single artisan profile rendered from `artisans.json` |
| `/quienes-somos/` | `quienes-somos.html` | `page-quienes-somos.hbs` | Mission, three-pillar model, team, board |
| `/donar/` | `donar.html` | `page-donar.hbs` | Form-first, unit economics, Padrino tier, ATH Móvil, FAQ, repeat ask |
| `/noticias/` | `noticias.html` | `index.hbs` | News & events listing |
| `/lengua-de-senas/` | `lengua-de-senas.html` | `page-lengua-de-senas.hbs` | ASL accessibility manifesto + accessible documentaries |
| `/preguntas-frecuentes/` | `preguntas-frecuentes.html` | `page-preguntas-frecuentes.hbs` | 13 PDF guides |
| `/contactanos/` | `contactanos.html` | `page-contactanos.hbs` | Email, phone, social, quick form |
| `/404` | `404.html` | `error.hbs` | "Esta historia aún no se ha contado." |

### Design system

- **Colors**: true black `#000`, paper `#f5f1ea`, ochre `#8b7c54`, slate `#4a6d75`, clay `#a8442a`, gold `#c9a55c`.
- **Type**: Cormorant Garamond (display serif), Inter (body), Caveat (handwritten script), IBM Plex Mono (UI labels).
- **Restraint as brand**: single hero (no carousel), Spanish-first, editorial documentary bands (no YouTube grid clone), donate CTA earns its place after the closing line.

### Interactivity (`assets/js/app.js`)

- Language toggle (ES default / EN secondary) — persists to localStorage, no flash on navigation
- Mobile nav drawer
- Header condense on scroll
- Reveal-on-scroll
- Documentaries page renders bands from `videos.json` + `artisans.json` (with placeholders if videos haven't been synced yet)
- Directory page renders cards + craft/region filters from `artisans.json`
- Single artisan page renders dynamically from a `?slug=` query

### Data files (`assets/data/`)

- **`artisans.json`** — pre-populated with all 38 documented artisans (name, craft ES/EN, slug, region, place, ASL flag).
- **`videos.json`** — empty until you run the sync script (see below).

---

## Deployment

### A) Static preview — Vercel

```bash
cd preview-site
npx vercel --prod
```

The included `vercel.json` handles redirects from old Ghost URLs (`/donar/` → `/donar`, etc.), trailing slashes, and clean URLs.

Alternatively: drag the `preview-site/` folder into the Netlify deploy UI, or any static host. There are no build steps — it's vanilla HTML/CSS/JS.

### B) Production Ghost theme

1. Sync the YouTube catalog (one-time, repeat when new docs publish):
   ```bash
   cd obras-del-pais-theme
   YOUTUBE_API_KEY=AIza... node scripts/sync-videos.js
   ```
   This writes `assets/data/videos.json` with all uploads, matched against `artisans.json` by slug/name. (See `scripts/sync-videos.js` header for how to get a free API key.)
2. Zip the theme:
   ```bash
   cd obras-del-pais-theme && zip -r ../obras-del-pais-theme.zip . -x ".DS_Store" -x "scripts/*"
   ```
3. In Ghost admin → **Settings → Design → Themes → Upload theme** → select the `.zip` → activate.
4. In Ghost admin → **Pages**, create pages with the following slugs (the theme auto-applies the matching template):
   - `donar`, `documentales`, `directorio`, `quienes-somos`, `contactanos`, `lengua-de-senas`, `preguntas-frecuentes`
5. Set the homepage: in Ghost admin → **Settings → Design → Brand**, upload a hero image (true black background, hands-on-craft preferred). The theme custom field `homepage_hero_image` accepts it.

### Theme customization (Ghost admin → Design → Customize)

| Setting | Default | Purpose |
|---|---|---|
| `homepage_hero_image` | _(empty)_ | Full-bleed hero portrait. If empty, a generative placeholder renders. |
| `youtube_channel_handle` | `@obrasdelpais` | Used for fallback "watch on YouTube" links. |
| `ath_movil_business` | `Obras del País` | Business name shown for ATH Móvil instructions. |
| `paypal_donate_url` | `https://www.paypal.com/donate/?hosted_button_id=97XWVQV6YQT6C&source=qr` | Hosted PayPal button URL. |
| `ein_visible` | `false` | Toggle public display of the 501(c)(3) EIN. |
| `ein_value` | _(empty)_ | EIN to display when `ein_visible` is on. |

### URL redirects from the old Ghost site

The Ghost admin has a built-in **Redirects** editor (Labs → Redirects). Upload this minimal `redirects.json` after going live:

```json
[
  { "from": "/contacto", "to": "/contactanos" },
  { "from": "/accesibilidad-en-lengua-de-senas", "to": "/lengua-de-senas" },
  { "from": "/noticias-y-eventos", "to": "/noticias" },
  { "from": "/directorio-de-artesanos", "to": "/directorio" }
]
```

---

## How to navigate this codebase as a future agent / dev

```
preview-site/                       # static HTML/CSS preview (Vercel-ready)
├── index.html                      # homepage
├── documentales.html               # YouTube preview gallery
├── directorio.html                 # artisan directory
├── artesano.html                   # single artisan (rendered from JSON)
├── quienes-somos.html              # about
├── donar.html                      # donate
├── contactanos.html                # contact
├── noticias.html                   # news listing
├── lengua-de-senas.html            # accessibility
├── preguntas-frecuentes.html       # FAQ + PDF guides
├── 404.html
├── vercel.json                     # redirects, clean URLs
├── sitemap.xml, robots.txt
├── scripts/sync-videos.js          # YouTube catalog sync
└── assets/
    ├── css/style.css               # ENTIRE design system (one file)
    ├── js/app.js                   # ENTIRE runtime (i18n, nav, render)
    ├── img/logo.svg
    └── data/
        ├── artisans.json           # 38 artisans
        └── videos.json             # populated by sync script

obras-del-pais-theme/               # Ghost theme (.zip target)
├── package.json                    # Ghost theme metadata + custom fields
├── routes.yaml                     # Spanish-canonical routing
├── default.hbs                     # base layout
├── home.hbs                        # homepage
├── index.hbs                       # collection (e.g. /noticias/)
├── post.hbs                        # single post (news article)
├── page.hbs                        # default page
├── page-{slug}.hbs                 # one per curated page (auto-applied by slug)
├── tag.hbs                         # tag archive
├── author.hbs                      # author archive
├── error.hbs                       # 404 / 500
├── partials/
│   ├── header.hbs, footer.hbs      # site chrome
│   ├── doc-band.hbs                # editorial documentary band
│   ├── closing-line.hbs            # the held-breath section
│   ├── donate-cta.hbs              # CTA block
│   └── newsletter.hbs              # signup
├── locales/
│   ├── es.json                     # Spanish (canonical)
│   └── en.json                     # English
└── assets/                         # mirror of preview-site/assets
```

**Editing rules of thumb:**
- Style tokens live at the top of `assets/css/style.css` under `:root`. Touch only those when adjusting brand color/type.
- New page on the static site? Copy `quienes-somos.html` as a template; it has the standard header/footer/scripts wiring.
- New page on Ghost? Create it in admin with a slug, then add `page-{slug}.hbs` to the theme.
- New artisan? Append to `assets/data/artisans.json` — both sites pick it up immediately (after sync for the Ghost theme).
- New documentary on YouTube? Re-run `scripts/sync-videos.js`; the matching is fuzzy on artisan name/slug.

---

## What the agent panel told us (synthesized)

> **Restraint is the brand.** Obras del País is not competing with content platforms — it's competing with forgetting. Every decision should slow the visitor down: single hero over carousel, Spanish-first over toggle parity, editorial index over thumbnail grid, curated rotation over algorithmic sort. Black is not a background — it's a held breath. Donate CTA earns its placement by arriving *after* the closing line, not before.
>
> **Donate page conversion:** form-first above the fold, unit economics ($10/$25/$50), social proof bar, named "Padrino · Madrina del Oficio" tier ($15/mo, monthly preselected), one 60-second artisan story, FAQ with EIN visible, repeat form in footer. Three payment rails as equal tap-targets.
>
> **Bilingual on Ghost:** Spanish canonical, English secondary. Theme strings auto-translate via locale files; long-form content (posts/pages) gets a `#en` tag and lives at `/en/{slug}/`.
>
> **YouTube videos:** committed `videos.json` regenerated by a Node script via the YouTube Data API. Beats RSS (15-cap) and beats client-side API keys (rate-limit risk).

Full panel transcripts available on request.

---

## Known gaps / handover items

- **YouTube channel ID + video catalog**: not retrievable from this environment (Google blocks the channel page behind a consent wall). Run `node scripts/sync-videos.js` locally with `YOUTUBE_API_KEY` to populate `videos.json`. Until then, the Documentales page renders a graceful placeholder grid driven from `artisans.json`.
- **Real artisan photography**: I used CSS-only placeholder treatments on artisan card photos and the hero. Drop real images into `assets/img/artisans/{slug}.jpg` (or upload via Ghost) and the cards will pick them up. The brochure `Obras del Pais. The Beauty of Puerto Rican Folklore.pdf` shows the iconic "hands-on-black" portraiture style — keep that direction.
- **EIN**: not in the public materials. Set `ein_value` + `ein_visible: true` in the Ghost custom theme settings once confirmed.
- **ATH Móvil business handle**: confirm the exact searchable name on the donate page.
- **Newsletter wiring**: the form posts to `#`. On Ghost, the `data-members-form="subscribe"` attribute connects it to Ghost Members automatically. On the static preview, wire to your existing newsletter provider.
- **Sign Language Access**: the page is structured but lists only the two known ASL-interpreted documentaries (#37 Milly, #38 Rafael & Rosa). Update the catalog as more episodes get interpreted.

---

## Credits

Design direction informed by the Obras del País 2026 brochure and a multi-persona panel (artisan, photographer, videographer, master artisan, storyteller, patron, engineer, fundraiser). Reference: [nationofartisans.com](https://www.nationofartisans.com/).
