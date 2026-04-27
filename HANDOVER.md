# Obras del País — Project Handover

> Last updated: **2026-04-27**, after commit `9f0a5ec` (tag `v0.1.0`). This file is the field manual for picking up where we left off. The high-level on-ramp is `README.md`.

---

## 🏁 Milestones

### v0.1.0 — Preview milestone (2026-04-27)

The full preview is **live, mobile-ready, and feature-complete** at https://obrasdelpais.info/ pending the four content decisions in §Pending below. This is the right state to hand to Isaak for production review and Ghost-theme upload.

Headline numbers:
- **12 pages** built (homepage, mapa, documentales, directorio, single-artisan, quienes-somos, donar, noticias, lengua-de-señas, preguntas-frecuentes, contactanos, 404).
- **38 artisans** pre-loaded with image, videoId, description, municipio.
- **27 municipios** highlighted on the interactive PR map with municipal flags from Wikimedia Commons.
- **All 38 documentary YouTube IDs** wired; titles + thumbnails pull live via `youtube.com/oembed`.
- **2 services wired**: PayPal donate ($15/mo prefill), Cloudflare Worker for feedback + artisan-lead capture.
- **Bilingual** ES/EN throughout, JS toggle, Spanish canonical.
- **Mobile audit** complete against WCAG 2.1 AA + Apple HIG + Material + iOS Safari gotchas — menu refactored to compact dropdown, all touch targets ≥ 44×44, safe-area insets honored, mobile keyboard hints on every form.

What's still required to go to production: see §Pending. None of those block reading or testing the preview.

---

---

## TL;DR for an agent (or developer) opening this cold

1. **Live preview lives at https://obrasdelpais.info/** (also accessible at https://steady-glacier-drz3.here.now/). Both URLs point at the same here.now slug. Re-deploy with the [`here-now`](https://here.now) skill (`~/.claude/skills/here-now/scripts/publish.sh . --slug steady-glacier-drz3 --client claude-code`). State is persisted in `.herenow/state.json` and the API key in `~/.herenow/credentials`.
2. **GitHub remote** is `https://github.com/rafaeldavid/obrasdelpais` (account `rafaeldavid` is logged in via `gh`).
3. **Two parallel deliverables** share assets: `preview-site/` (static) and `obras-del-pais-theme/` (Ghost). Edit one, sync to the other.
4. **The newsletter and donations stack stays unchanged** — Ghost Members for email, PayPal hosted button + ATH Móvil + Padrino recurring tier for donations. The rebuild is the *surface*, not the plumbing.
5. **Design rule**: restraint is the brand. Single hero, no carousels, Spanish-canonical with EN toggle, editorial documentary index that links out to YouTube (no embeds).
6. **Read this whole file before making structural changes** — there's a decision log explaining why things are the way they are.

---

## Where we are

### ✅ Done (as of v0.1.0)

| Area | Status |
|---|---|
| Information architecture (12 pages) | Built — index, mapa, documentales, directorio, artesano, quienes-somos, donar, noticias, lengua-de-senas, preguntas-frecuentes, contactanos, 404 |
| Design system (CSS) | Tokens, type scale, components, dark/paper/ochre palette — all in `preview-site/assets/css/style.css` (~1500 lines) |
| JS runtime | Lang toggle (ES/EN), mobile compact-dropdown nav, header condense, reveal-on-scroll (with idempotent `observeReveal` for dynamic content), JSON loaders, YouTube oembed cache, feedback + lead modals |
| 38 artisans pre-loaded | Names, craft (es/en), slug, region, place, ASL flag, videoId, image_cdn, description, **municipio + municipio_slug** in `assets/data/artisans.json` |
| 38 YouTube video IDs | All in `videos.json`. Documentaries page enriches with live YouTube titles via oembed at runtime |
| **Interactive PR map** | `mapa.html` + `map.js` + CC-licensed PR municipalities SVG (78 + 4 islands). 27 munis highlighted in ochre with hover/tap tooltips, click reveals detail panel. Aspect ratio cropped from the source SVG to fill the inhabited area only. Compact archive grid below with municipal flags from Wikimedia Commons. |
| **Municipal flags** | All 27 munis with documented artisans now display their official flag. URLs embed Special:FilePath?width=200 from Wikimedia — no repo binaries, browsers fetch from Wikimedia CDN. |
| **Feedback + lead capture** | Cloudflare Worker at `obras-del-pais-feedback.rafaeldf2.workers.dev` accepts POST /feedback with `type=feedback\|lead`, sanitizes, appends a row to `data/feedback.csv` via GitHub Contents API. Floating bottom-right button on every page opens the feedback modal; CTA on `/mapa.html` opens the lead modal for artisan tips. |
| 711 images scraped from live site | In `archive-library/` with manifest at `preview-site/assets/data/images.json` (tagged by source page + position) |
| Real ODP logo + favicons | Black tree-and-island logo composed onto white circle for legibility on dark browser tabs. 32, 64, 180, 256px sizes. |
| Bilingual content | All UI + most copy. Toggle persists to localStorage |
| Loading + error states | On directory grid + artisan profile (no more silent blanks) |
| Page-intro background photos | All interior pages |
| Donate page conversion structure | Form-first hero, three payment rails, unit economics, Padrino tier, social proof, FAQ, repeat ask. **PayPal URL pre-fills $15 USD** so the donor lands at the suggested amount. |
| Artisan profile pages | JS-rendered from `artisans.json`, `?slug=...` query, hero photo + video + "Encuéntrame" outreach block |
| Documentaries filters | Free-text search, region pills, oficio/material pills (auto-built), LSPR-only toggle, live counter, clear-all |
| News cards | 9 entries with real cover images from Ghost CDN, each linking out to the live obrasdelpais.com post |
| Ghost theme | Full handlebars port. `routes.yaml`, `default.hbs`, `home.hbs`, page-{slug}.hbs templates, partials, locales (es/en) |
| Custom theme settings | `homepage_hero_image`, `paypal_donate_url`, `ath_movil_business`, `ein_visible`, `ein_value`, `youtube_channel_handle`, `show_chat_widget` |
| **Mobile audit** | WCAG 2.5.5 / Apple HIG / Material / iOS Safari gotchas. Compact dropdown menu (was a buggy fullscreen drawer), 44×44 touch targets on every pill/toggle, safe-area-inset for notched devices, env() padding on header/footer/feedback button, input font-size 16px to prevent iOS zoom, `inputmode`/`autocomplete`/`enterkeyhint` on every form, dead PDF links neutralized. Header gradient replaces mix-blend-mode (iOS rendering bug). |
| Custom domain | `obrasdelpais.info` linked to the here.now slug. SSL active, DNS verified. Both URLs resolve to the same site. |
| GitHub repo | Public at https://github.com/rafaeldavid/obrasdelpais. 9 commits since initial. README + HANDOVER + START_HERE all current. |

### 🎯 What's next — prioritized

These are the concrete moves to make after v0.1.0. Each is independently shippable.

| Priority | Task | Owner | Notes |
|---|---|---|---|
| **P0** | Stakeholder review of the live preview | Isaak / Rafael | Walk every page on real iPhone + Android. The mobile audit covered known checklists; real-device feel is the gate. |
| **P0** | Confirm the four pending values | Isaak | EIN, ATH Móvil exact name, Stripe Y/N, newsletter wiring choice. See §Pending. |
| **P1** | Ghost theme upload to obrasdelpais.com | Isaak | Theme is `.zip`-ready in `obras-del-pais-theme/`. See `START_HERE.md` step 7. Ghost(Pro) admin → Settings → Design → Themes → Upload + activate, then create 7 pages with matching slugs. |
| **P1** | Configure PayPal monthly default | Rafael / Isaak | The button URL pre-fills $15 amount, but the **monthly-vs-one-time toggle** has to be set in PayPal admin on hosted button `97XWVQV6YQT6C`. Two paths in §Pending #4. |
| **P2** | Fill the 13 FAQ guide PDFs | Lourdes / Isaak | Currently the cards are aria-disabled placeholders. Drop PDFs into Ghost Files (or a separate hosting) and re-link in `preguntas-frecuentes.html` / Ghost page content. |
| **P2** | Real photography in the hero rotation | Lourdes / Isaak | `curated.json.hero_rotation` already lists 12 candidate URLs. To enable: add a small JS rotation (~30 lines) that swaps the `.hero__bg img` once per page load. |
| **P3** | Curator tagging of the 711-image library | Lourdes | Audit panel laid out 5 categories (`hands-on-black`, `workshop-process`, `portrait-environmental`, `community-and-screenings`, `finished-piece-still-life`). Manual sort into folders unlocks future image-essay surfaces. |

---

### 🔧 Pending — needs human input or a decision

These are the items where I genuinely need a real-world value or a stakeholder choice before I can finish.

| # | Item | Why it's pending | What's needed to close it |
|---|---|---|---|
| 1 | **Newsletter wiring on the static preview** | Ghost Members works automatically when the theme is uploaded to the user's Ghost(Pro) instance (forms have `data-members-form="subscribe"` already). On the standalone here.now preview the form is a no-op. | Decide: do we wire the static preview to (a) the existing Ghost Members API (`/members/api/send-magic-link`) cross-origin, (b) a third-party (Buttondown / ConvertKit / Mailchimp), or (c) leave as a visual placeholder until we promote to production? Recommend (a) — see "Newsletter integration options" below. |
| 2 | **ATH Móvil business handle / merchant ID** | Donate page currently says "search 'Obras del País' in business payments" but doesn't expose the exact ID. | Confirm the exact merchant name as it appears in ATH Móvil's business directory, or get a deep-link URL if ATH Móvil supports one. Update `donar.html` and theme custom setting `ath_movil_business`. |
| 3 | **501(c)(3) EIN** | The donate FAQ says "EIN appears on receipt." Some donors want it visible publicly. | Get the EIN value, set `ein_visible: true` and `ein_value: "XX-XXXXXXX"` in the Ghost theme custom settings (or hardcode in the static preview). |
| 4 | **Stripe direct link** | The brochure mentions Stripe but I haven't been given a Stripe Checkout URL. The page currently routes the "card" rail to PayPal (which accepts cards) — that works but Stripe was named in the original spec. | Either (a) confirm PayPal-for-cards is fine and remove the Stripe mention, or (b) provide a Stripe Payment Link / Checkout URL and add it as a fourth rail. |
| 5 | **Ghost theme upload to obrasdelpais.com** | Theme is packaged but not yet uploaded to the production Ghost(Pro) admin. | Upload `obras-del-pais-theme/` zipped via Ghost admin → Settings → Design → Themes. Create pages with slugs `donar`, `documentales`, `directorio`, `quienes-somos`, `contactanos`, `lengua-de-senas`, `preguntas-frecuentes` so the matching `page-{slug}.hbs` templates apply. |
| 5b | **Custom domain `obrasdelpais.info`** | ✅ Active. Linked to slug `steady-glacier-drz3` on 2026-04-27. SSL provisioned automatically by here.now. Use `scripts/link-domain.sh` if you ever need to re-create the link or point a different slug at this domain. |
| 6 | **DNS / domain promotion** | here.now preview is on `steady-glacier-drz3.here.now`. Production target is `obrasdelpais.com` (currently serving the old Ghost theme). | When the new theme is approved on the existing Ghost site, no DNS change is needed — the theme rollout is internal to Ghost. The here.now preview can stay as a separate stage URL or be retired. |
| 7 | **Curator tagging of the 711-image library** | The audit panel laid out 5 content categories (`hands-on-black`, `workshop-process`, `portrait-environmental`, `community-and-screenings`, `finished-piece-still-life`) but tagging is manual. | Walk through `archive-library/library/`, sort into folders by category. Then `images.json` can be enriched with a `category` field per file and the front-end can pick category-appropriate imagery automatically. |
| 8 | **Real photography in dark sections** | Closing line and the homepage donate CTA still have very low-opacity backgrounds. The creative panel said the closing should stay near-black ("held breath"); user has hinted they want more imagery. | Decision: do we keep the creative panel's "held breath" rule or override it with full imagery? If override, swap the `mix-blend-mode:luminosity; opacity:0.18` to `opacity: 0.4` (still atmospheric, more visible). |

### 🛠 Feedback button & Worker — frontend ready, Worker pending deploy

A "Comentarios / Feedback" button is wired into every page (top-right pill, bottom-right on mobile). It opens a modal, posts the message + optional email + page + lang to a Cloudflare Worker. The Worker appends a row to `data/feedback.csv` in this repo via the GitHub Contents API.

**Status**: front-end is shipped and live — but the button hides itself until `preview-site/assets/data/feedback-config.json` has a real `endpoint`. Currently empty, so the button is invisible. To enable:

1. Deploy the Worker — see `worker/README.md` for the full runbook (3 commands once `wrangler` is installed).
2. Paste the Worker URL into `preview-site/assets/data/feedback-config.json`:
   ```json
   { "endpoint": "https://obras-del-pais-feedback.YOUR-SUBDOMAIN.workers.dev/feedback" }
   ```
3. Re-publish: `~/.claude/skills/here-now/scripts/publish.sh . --slug steady-glacier-drz3 --client claude-code`.

**Cost**: $0. Cloudflare Workers free tier (100k requests/day) is generous; one feedback per request.

**Triage workflow**: each submission is a real commit with message `feedback: <first 60 chars>`. Watch with `git log --grep "^feedback:" --oneline`. Or open `data/feedback.csv` in any spreadsheet.

**Privacy**: the modal discloses that messages are saved to a public GitHub repo. If feedback volume picks up and people start including PII, swap `GITHUB_REPO` in `worker/wrangler.toml` to a private companion repo (front-end stays unchanged), or migrate to GitHub Issues (~10 lines of Worker code).

### 🔮 Stretch — nice-to-haves the panel called out, not required

- Hero rotation (12 candidates already in `curated.json`) — currently a single static image
- Hover crossfades on artisan cards (second photo per artisan)
- Lightbox gallery on artisan profile pages, sourced from `archive-library/library/` filtered by artisan slug
- Polaroid stacks on doc-bands (process / hands / finished piece)
- ASL filter on the directory page (only the documentaries page has it)
- Photo essay masonry on `/noticias` instead of the current grid

---

## Linked services — exact wiring

This is where the rebuild **stops** and existing infrastructure **continues**. The site is a surface that points at services already in production.

### Newsletter (Ghost Members)

**On Ghost theme** (`obras-del-pais-theme/`):
- Forms use `data-members-form="subscribe"` and `data-members-email` attributes
- Ghost's bundled `members.min.js` (loaded via `{{ghost_head}}`) handles the POST to `/members/api/send-magic-link` automatically
- The form on `partials/newsletter.hbs` is the canonical version
- No additional config needed once the theme is active

**On the static preview** (`preview-site/`):
- Same markup but no Ghost JS bundle, so submit currently runs a placeholder onsubmit handler
- See "Newsletter integration options" below for paths

**Newsletter integration options for the static preview:**

1. **Recommended — Ghost Members API cross-origin call.** Ghost(Pro) accepts `POST https://obrasdelpais.com/members/api/send-magic-link` from external origins. Add a small `fetch()` to `app.js` that posts `{ email, emailType: "subscribe" }` and shows a "check your inbox" state. This keeps Ghost as the single source of newsletter truth.
2. Buttondown — set up a free account, add their embedded form snippet
3. ConvertKit — embed form ID
4. Mailchimp — embed form HTML
5. Leave as placeholder — the preview is a visual prototype only

If you go with option 1, the change is small (~15 lines in `app.js`). The Ghost endpoint expects:
```
POST https://obrasdelpais.com/members/api/send-magic-link
Content-Type: application/json
{ "email": "user@example.com", "emailType": "subscribe", "labels": ["preview-site"] }
```

### Donations

**Three payment rails** on the donate page:

| Rail | Wire | Where to update |
|---|---|---|
| **PayPal (one-time + Padrino monthly)** | Hardcoded URL `https://www.paypal.com/donate/?hosted_button_id=97XWVQV6YQT6C&source=qr` | Static: `preview-site/donar.html` (search for `hosted_button_id`). Theme: custom setting `paypal_donate_url` |
| **Padrino · Madrina del Oficio** | Same PayPal hosted button (PayPal handles the recurring monthly subscription on their end) | Tier card sits at `#sponsor` anchor on donar page. Tier name "Padrino · Madrina" is per the fundraiser panel. |
| **ATH Móvil** | Pointer to the ATH Móvil app, search-by-business | Static: `preview-site/donar.html`. Theme: custom setting `ath_movil_business`. **TODO**: confirm exact merchant name. |

**Corporate sponsorship** is a `mailto:isaak@obrasdelpais.com?subject=Auspicio` — no Stripe yet.

### Documentaries → YouTube

The Documentales page is **a pointer, not a player**. We never embed the video; the user clicks out to YouTube. This was a deliberate creative-panel decision.

- `assets/data/videos.json` carries the 38 video IDs
- At runtime, `app.js` calls `https://www.youtube.com/oembed?url=...&format=json` for each video to pull the live title + author + thumbnail
- Result is cached in `localStorage` under key `od:yt-meta:v1` for 24h
- If oembed fails (offline, blocked, etc.), the local data in `videos.json` is the fallback
- Channel link: `https://www.youtube.com/@obrasdelpais` (used in nav, footer, "Ver el canal completo" CTA on docs page)

To refresh the data offline:
```bash
# uses YouTube Data API v3, requires an API key
YOUTUBE_API_KEY=AIza... node preview-site/scripts/sync-videos.js
# OR re-scrape from the live obrasdelpais.com pages (no key needed)
python3 scripts/extract-content.py
```

---

## Decision log (why things are the way they are)

These are non-obvious calls, in chronological order.

1. **Tech stack: Ghost theme rebuild + parallel static preview** — User chose "Stay on Ghost, rebuild theme only" when offered Astro/Next.js/HTML alternatives. We added the static preview *on top* so the design could be reviewed before the theme upload.
2. **Donations stay external** — User chose "Keep external links" (PayPal + ATH Móvil). No native Stripe Checkout integration on the new site. This keeps the new build out of the regulated payments surface area.
3. **Spanish is canonical, English is a toggle** — The master-artisan panelist was specific that English-first cultural sites get this wrong. ES is the default; EN is a JS toggle.
4. **No carousel on the hero** — The photographer panelist said: "Single hero. One frame. Hold it." We rotate per session via the hero image custom setting, not auto-rotate.
5. **No embedded YouTube player** — The videographer panelist said an embed cheapens the editorial gallery. We link out instead.
6. **Donate CTA earns its placement** — It appears *after* the closing handwritten line, never in the nav. The brochure's closing line ("Hay historias que, si no las contamos, se perderán para siempre") is the emotional handoff to the ask.
7. **Use Ghost CDN URLs at runtime** — Originally we shipped 211MB of images with the here.now upload. User suggested pointing to GitHub/CDN instead. We switched to Ghost's existing CDN URLs (the photos already live there publicly), dropping the publish payload from 218MB → 6.3MB. The raw library stays in `archive-library/` for offline curation.
8. **YouTube oembed at runtime, not Data API** — The ops engineer panel recommended a build-time `videos.json` sync via the Data API. User asked for "as dynamic as possible, pull from YouTube". We compromised: oembed at runtime (no API key, CORS-allowed, returns title + thumbnail) merged with `videos.json` for description + region + place fields oembed doesn't provide.
9. **Reveal animations need explicit re-observation** — The IntersectionObserver in `app.js` initially ran once at IIFE boot. JS-rendered cards inserted later kept `opacity:0`. Fix: `observeReveal(scope)` helper called after every dynamic `innerHTML`.
10. **About page focuses on mission + alliances + artisan voices** — User removed Junta de directores + team grid. The page now lifts the social proof (institutional + artisan testimonials) and leaves bios out.
11. **The number to chase is 100 documentaries, not 78** — 78 is the count of PR municipalities. The documentary goal is 100. Donate page hero copy was corrected.

---

## Common operations

### Re-publish the live preview after edits
```bash
cd /Users/rafa/Documents/obrasdelpais/preview-site
~/.claude/skills/here-now/scripts/publish.sh . \
  --slug steady-glacier-drz3 --client claude-code \
  --title "Obras del País" --description "El folklore puertorriqueño en tus manos"
```
The slug `steady-glacier-drz3` is persistent and saved to the user's here.now account (authenticated publish, permanent).

### Test locally
```bash
cd preview-site && python3 -m http.server 4747
# open http://127.0.0.1:4747/
```

### Add a new artisan
1. Append to `preview-site/assets/data/artisans.json` (and copy to `obras-del-pais-theme/assets/data/`).
   - Required: `n`, `name`, `craft_es`, `craft_en`, `slug`, `region_es`
   - Optional: `place_es`, `legacy_slug`, `image_cdn`, `description`, `videoId`, `asl: true`
2. The directory grid + every JS-rendered surface picks it up immediately.

### Add a new news/event card
Static: edit `preview-site/noticias.html` and copy one of the 9 existing `<a class="artisan-card">` blocks. Update the slug, image URL, eyebrow, title (es/en), and excerpt.

Theme: just publish a Ghost post. The `index.hbs` template renders `posts` automatically.

### Refresh the YouTube catalog
The runtime oembed handles new titles/thumbnails on existing video IDs automatically (24h cache). For brand-new videos, append to `videos.json` (and ideally to `artisans.json` if there's a corresponding artisan profile).

### Sync changes between static preview and Ghost theme
The shared files live in `assets/css/style.css` and `assets/js/app.js`. After editing one:
```bash
cp preview-site/assets/css/style.css obras-del-pais-theme/assets/css/style.css
cp preview-site/assets/js/app.js     obras-del-pais-theme/assets/js/app.js
cp preview-site/assets/data/*.json   obras-del-pais-theme/assets/data/
```

### Package the Ghost theme for upload
```bash
cd obras-del-pais-theme
zip -rq ../obras-del-pais-theme.zip . -x ".DS_Store" -x "scripts/*"
# upload via Ghost admin → Settings → Design → Themes
```

### Deep cleanup of node modules / caches
There are no node_modules — this project doesn't have a build step. The only "build artifact" is the theme zip.

---

## File map

```
.
├── README.md                     ← on-ramp
├── HANDOVER.md                   ← this file (field manual)
├── .gitignore                    ← excludes archive-library from theme bundle, .DS_Store, .herenow/
├── Obras del Pais...pdf          ← brand brochure (visual + voice reference)
│
├── preview-site/                 ← static HTML/CSS/JS, deployed to here.now
│   ├── index.html
│   ├── documentales.html
│   ├── directorio.html
│   ├── artesano.html             ← JS-rendered, ?slug=... query
│   ├── quienes-somos.html
│   ├── donar.html
│   ├── noticias.html
│   ├── lengua-de-senas.html
│   ├── preguntas-frecuentes.html
│   ├── contactanos.html
│   ├── 404.html
│   ├── vercel.json               ← legacy redirects
│   ├── sitemap.xml, robots.txt
│   ├── scripts/
│   │   └── sync-videos.js        ← YouTube Data API sync (alternative to oembed)
│   └── assets/
│       ├── css/style.css         ← entire design system (~1100 lines)
│       ├── js/app.js             ← entire runtime (~480 lines)
│       ├── img/
│       │   ├── logo-icon-512.png, logo-black.png
│       │   ├── favicon-256.png, favicon-64.png
│       │   ├── logo.svg          ← legacy fallback
│       │   └── artisans/         ← 38 cover images (also at Ghost CDN)
│       └── data/
│           ├── artisans.json     ← 38 artisan records
│           ├── videos.json       ← 38 video records (videoId + metadata)
│           ├── images.json       ← 711-image manifest with tags
│           └── curated.json      ← hero rotation, team picks, event candidates
│
├── obras-del-pais-theme/         ← Ghost(Pro) theme, zip-ready for upload
│   ├── package.json              ← Ghost config + custom theme settings
│   ├── routes.yaml               ← Spanish-canonical, English secondary
│   ├── default.hbs               ← base layout
│   ├── home.hbs                  ← homepage
│   ├── index.hbs                 ← collection (e.g. /noticias/)
│   ├── post.hbs                  ← single post
│   ├── page.hbs                  ← default page
│   ├── page-donar.hbs, page-documentales.hbs, …  ← per-slug overrides
│   ├── tag.hbs, author.hbs, error.hbs
│   ├── partials/
│   │   ├── header.hbs, footer.hbs
│   │   ├── doc-band.hbs          ← editorial documentary band
│   │   ├── closing-line.hbs, donate-cta.hbs, newsletter.hbs
│   ├── locales/
│   │   ├── es.json (canonical)
│   │   └── en.json
│   └── assets/                   ← mirror of preview-site/assets
│
├── archive-library/              ← 711 raw scraped images (211MB, not published)
│   └── library/
│
└── scripts/                      ← Python scrapers + sync utilities
    ├── extract-content.py        ← scrape og:image + iframe videoId from each artisan page
    ├── scrape-all-images.py      ← scrape ALL images from all sitemap pages
    └── use-cdn-urls.py           ← rewrite artisans.json image → image_cdn from images.json
```

---

## Conventions

### Bilingual content
Every user-facing string exists twice with `data-lang="es"` and `data-lang="en"` siblings. The toggle in the nav adds an `is-active` class. CSS hides non-active. Adding a new string?
```html
<p data-lang="es">Tu copia en español.</p>
<p data-lang="en">Your English copy.</p>
```

### Color
Use CSS custom properties (`var(--ochre)`, `var(--clay)`, etc.). Don't hardcode hex values in markup or component CSS — change tokens at the top of `style.css`.

### Photography
Reference Ghost's existing CDN URLs (`https://storage.ghost.io/c/0b/21/.../content/images/...`) for any image you didn't author yourself. The brand owns these and Ghost serves them. Local copies at `preview-site/assets/img/artisans/` are fallbacks.

### Page-intro pattern
Every interior page has:
```html
<section class="page-intro">
  <img class="page-intro__bg-img" src="..." alt="" loading="lazy">
  <div class="page-intro__wrap">
    <span class="page-intro__crumb">…</span>
    <h1 class="page-intro__title">…</h1>
    <p class="page-intro__lede">…</p>
  </div>
</section>
```
The CSS adds the radial+linear vignette automatically.

### JS-rendered surfaces
Anything inside `[data-docs-list]`, `[data-dir-grid]`, or `[data-artisan-detail]` is populated by `app.js`. After any `innerHTML` assignment to one of those, call `observeReveal(scope)` to wire reveal animations on the new content.

### Commits
Conventional but not strict. The agent has been writing detailed multi-paragraph commits explaining intent — keep that pattern; it's the project's audit trail.

---

## Open questions for the next agent / dev

1. Do we want hero image rotation enabled (`curated.json.hero_rotation` has 12 candidates ready to wire)?
2. Should `/donar/` accept a Stripe Payment Link as a fourth rail, or is PayPal-for-cards sufficient?
3. Should the static preview's newsletter form post to Ghost's Members API directly, or wait until the theme is live?
4. The 711-image library is uncategorized — is the manual curator pass worth scheduling, or do we extend `scrape-all-images.py` with simple heuristics (filename keywords, EXIF, image dimensions)?
5. Do we keep here.now as a permanent stage URL, or retire it once the new theme is on production Ghost?

If you're an agent picking this up, just ask the user about whichever of these is on their critical path. Don't decide for them.

---

## What to do FIRST after opening this repo

```bash
# 1) Confirm the live state
curl -sI https://steady-glacier-drz3.here.now/ | head -1
# 2) Pull the latest from GitHub
cd /Users/rafa/Documents/obrasdelpais && git fetch && git status
# 3) Read this file end to end (you're already here)
# 4) Check the README for the high-level
# 5) Skim git log --oneline to see the play-by-play
git log --oneline | head -20
# 6) Spin up the local server to see what's there
cd preview-site && python3 -m http.server 4747 &
open http://127.0.0.1:4747/
```

That's the whole on-ramp. Welcome.
