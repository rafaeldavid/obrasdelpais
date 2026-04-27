/* Obras del País — runtime
   - Language toggle (ES default; EN secondary)
   - Mobile nav
   - Header condense on scroll
   - Reveal-on-scroll
   - Documentales: render bands from videos.json + artisans.json
   - Directorio: render artisan grid from artisans.json with filtering
*/
(() => {
  const root = document.documentElement;

  /* ---------- Language ---------- */
  const LANG_KEY = "od:lang";
  const supported = ["es", "en"];
  function detectLang() {
    const stored = localStorage.getItem(LANG_KEY);
    if (supported.includes(stored)) return stored;
    const url = new URL(location.href);
    const q = url.searchParams.get("lang");
    if (supported.includes(q)) return q;
    return "es";
  }
  function applyLang(lang) {
    root.lang = lang;
    root.dataset.lang = lang;
    document.querySelectorAll("[data-lang]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.lang === lang);
    });
    document.querySelectorAll("[data-lang-toggle]").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.langToggle === lang ? "true" : "false");
    });
    document.title = root.dataset[`title${cap(lang)}`] || document.title;
    localStorage.setItem(LANG_KEY, lang);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang-toggle]");
    if (!btn) return;
    e.preventDefault();
    applyLang(btn.dataset.langToggle);
  });
  applyLang(detectLang());

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const open = root.dataset.navOpen === "true";
      root.dataset.navOpen = open ? "false" : "true";
      document.body.style.overflow = open ? "" : "hidden";
    });
    document.querySelectorAll(".nav__list a").forEach((a) =>
      a.addEventListener("click", () => {
        root.dataset.navOpen = "false";
        document.body.style.overflow = "";
      })
    );
  }

  /* ---------- Header condense ---------- */
  const header = document.querySelector(".site-header");
  if (header) {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-condensed", y > 60);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      )
    : null;
  document.querySelectorAll(".reveal").forEach((el) => {
    if (io) io.observe(el); else el.classList.add("is-in");
  });

  /* ---------- Data loaders ---------- */
  async function loadJSON(path) {
    try {
      const r = await fetch(path, { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (err) {
      console.warn("loadJSON failed:", path, err);
      return null;
    }
  }

  /* ---------- Documentales page ---------- */
  const docList = document.querySelector("[data-docs-list]");
  if (docList) {
    Promise.all([loadJSON("/assets/data/videos.json"), loadJSON("/assets/data/artisans.json")])
      .then(([videos, artisans]) => {
        const idx = (artisans || []).reduce((m, a) => (m[a.slug] = a, m), {});
        const items = (videos && videos.videos && videos.videos.length)
          ? videos.videos
          : (artisans || []).slice().reverse().map((a) => ({
              n: a.n,
              title_es: a.craft_es + " · " + a.name,
              title_en: a.craft_en + " — " + a.name,
              videoId: null,
              slug: a.slug,
              place_es: a.place_es,
              region_es: a.region_es
            }));
        docList.innerHTML = items.map((v) => bandHTML(v, idx[v.slug] || {})).join("");
        // Hook filter pills
        wireFilters(items);
      });
  }
  function bandHTML(v, a) {
    const title = v.title_es || (a.craft_es + " · " + a.name);
    const titleEn = v.title_en || (a.craft_en + " — " + a.name);
    const place = v.place_es || a.place_es || a.region_es || "";
    const vid = v.videoId || a.videoId;
    const youtubeUrl = vid ? `https://www.youtube.com/watch?v=${vid}` : `https://www.youtube.com/@obrasdelpais/search?query=${encodeURIComponent(a.name || title)}`;
    const thumb = a.image || (vid ? `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg` : null);
    return `
    <article class="doc-band reveal" data-region="${(a.region_es||'').toLowerCase()}" data-craft="${slugCraft(a.craft_es||'')}">
      <a class="doc-band__media" href="${youtubeUrl}" target="_blank" rel="noopener" aria-label="Ver en YouTube">
        ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : `<div class="ph"></div>`}
        <span class="play-pill">Ver en YouTube ↗</span>
      </a>
      <div class="doc-band__meta">
        <span class="doc-band__no">Doc · ${String(v.n).padStart(2,"0")}</span>
        <h3 class="doc-band__title" data-lang="es">${escapeHTML(title)}</h3>
        <h3 class="doc-band__title" data-lang="en">${escapeHTML(titleEn)}</h3>
        <span class="doc-band__byline">${escapeHTML(a.name || "")}</span>
        ${place ? `<span class="doc-band__where">${escapeHTML(place)}</span>` : ""}
        <p class="doc-band__logline" data-lang="es">${escapeHTML(loglineES(a))}</p>
        <p class="doc-band__logline" data-lang="en">${escapeHTML(loglineEN(a))}</p>
        <a class="link-inline doc-band__cta" href="${youtubeUrl}" target="_blank" rel="noopener">
          <span data-lang="es">Ver el documental en YouTube ↗</span>
          <span data-lang="en">Watch on YouTube ↗</span>
        </a>
      </div>
    </article>`;
  }
  function loglineES(a) {
    if (!a || !a.craft_es) return "Una historia documentada por Obras del País.";
    return `Un retrato íntimo del oficio: ${a.craft_es.toLowerCase()}.`;
  }
  function loglineEN(a) {
    if (!a || !a.craft_en) return "A story documented by Obras del País.";
    return `An intimate portrait of the craft: ${a.craft_en.toLowerCase()}.`;
  }
  function slugCraft(s) {
    return s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 18);
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
  function wireFilters(items) {
    const region = document.querySelector("[data-filter-region]");
    const craft = document.querySelector("[data-filter-craft]");
    function apply() {
      const r = (region?.value || "").toLowerCase();
      const c = craft?.value || "";
      docList.querySelectorAll(".doc-band").forEach((band) => {
        const okR = !r || band.dataset.region === r;
        const okC = !c || band.dataset.craft === c;
        band.style.display = (okR && okC) ? "" : "none";
      });
    }
    region?.addEventListener("change", apply);
    craft?.addEventListener("change", apply);
    document.querySelectorAll("[data-region-pill]").forEach((p) => {
      p.addEventListener("click", () => {
        const v = p.dataset.regionPill;
        document.querySelectorAll("[data-region-pill]").forEach(x => x.setAttribute("aria-pressed", x === p ? "true" : "false"));
        if (region) { region.value = v; apply(); }
      });
    });
  }

  /* ---------- Directory page ---------- */
  const dirGrid = document.querySelector("[data-dir-grid]");
  if (dirGrid) {
    loadJSON("/assets/data/artisans.json").then((artisans) => {
      if (!artisans) return;
      // counts for filter rail
      const byCraft = {};
      const byRegion = {};
      artisans.forEach((a) => {
        const cKey = simpleCraft(a.craft_es);
        byCraft[cKey] = (byCraft[cKey] || 0) + 1;
        byRegion[a.region_es || ""] = (byRegion[a.region_es || ""] || 0) + 1;
      });
      const craftRail = document.querySelector("[data-craft-rail]");
      if (craftRail) {
        craftRail.innerHTML = Object.entries(byCraft)
          .sort((a,b)=>b[1]-a[1])
          .map(([k,v]) => `<button data-craft-filter="${k}"><span>${k}</span><span class="count">${v}</span></button>`)
          .join("");
      }
      const regionRail = document.querySelector("[data-region-rail]");
      if (regionRail) {
        regionRail.innerHTML = Object.entries(byRegion)
          .sort((a,b)=>b[1]-a[1])
          .map(([k,v]) => k ? `<button data-region-filter="${k.toLowerCase()}"><span>${k}</span><span class="count">${v}</span></button>` : "")
          .join("");
      }
      dirGrid.innerHTML = artisans.map((a) => artisanCardHTML(a)).join("");
      let active = { craft: null, region: null };
      function applyFilter() {
        dirGrid.querySelectorAll(".artisan-card").forEach((card) => {
          const okC = !active.craft || card.dataset.craft === active.craft;
          const okR = !active.region || card.dataset.region === active.region;
          card.style.display = (okC && okR) ? "" : "none";
        });
      }
      document.addEventListener("click", (e) => {
        const cBtn = e.target.closest("[data-craft-filter]");
        const rBtn = e.target.closest("[data-region-filter]");
        if (cBtn) {
          const v = cBtn.dataset.craftFilter;
          active.craft = active.craft === v ? null : v;
          document.querySelectorAll("[data-craft-filter]").forEach(x => x.classList.toggle("is-active", x.dataset.craftFilter === active.craft));
          applyFilter();
        }
        if (rBtn) {
          const v = rBtn.dataset.regionFilter;
          active.region = active.region === v ? null : v;
          document.querySelectorAll("[data-region-filter]").forEach(x => x.classList.toggle("is-active", x.dataset.regionFilter === active.region));
          applyFilter();
        }
        const clear = e.target.closest("[data-clear-filters]");
        if (clear) {
          active = { craft: null, region: null };
          document.querySelectorAll("[data-craft-filter],[data-region-filter]").forEach(x => x.classList.remove("is-active"));
          applyFilter();
        }
      });
    });
  }
  function simpleCraft(c) {
    if (!c) return "Otros";
    if (/santo/i.test(c)) return "Santería";
    if (/talla|tornero|escult|caretas|máscar|carre/i.test(c)) return "Madera y talla";
    if (/cer[áa]m|alfar|barro/i.test(c)) return "Alfarería";
    if (/textil|teñ|estamp|hamac|petate|enea|cester|paja|pava|t[eé]j|mundillo|sol|cuero/i.test(c)) return "Tejidos y fibras";
    if (/instrum|flaut|plena|cuatro|lutier/i.test(c)) return "Instrumentos";
    if (/grabado|pintura|serigraf|hueso|repujado|metal/i.test(c)) return "Artes gráficas y metal";
    if (/pesca|tabaco|hig[uü]era/i.test(c)) return "Oficios de la tierra";
    return "Otros";
  }
  function artisanCardHTML(a) {
    const photo = a.image
      ? `<img src="${a.image}" alt="${escapeHTML(a.name)}" loading="lazy">`
      : `<div class="ph"></div>`;
    return `
    <a class="artisan-card reveal" href="/artesano.html?slug=${encodeURIComponent(a.slug)}" data-craft="${simpleCraft(a.craft_es)}" data-region="${(a.region_es||'').toLowerCase()}">
      <div class="artisan-card__photo">
        <span class="artisan-card__no">Doc · ${String(a.n).padStart(2,'0')}</span>
        ${photo}
      </div>
      <div class="artisan-card__body">
        <h3 class="artisan-card__name">${escapeHTML(a.name)}</h3>
        <p class="artisan-card__craft" data-lang="es">${escapeHTML(a.craft_es)}</p>
        <p class="artisan-card__craft" data-lang="en">${escapeHTML(a.craft_en)}</p>
        <p class="artisan-card__where">${escapeHTML((a.place_es ? a.place_es + " · " : "") + (a.region_es || ""))}</p>
      </div>
    </a>`;
  }

  /* ---------- Artisan detail page ---------- */
  const detail = document.querySelector("[data-artisan-detail]");
  if (detail) {
    const params = new URL(location.href).searchParams;
    const slug = params.get("slug");
    Promise.all([loadJSON("/assets/data/artisans.json"), loadJSON("/assets/data/videos.json")]).then(([artisans, videos]) => {
      const a = (artisans || []).find(x => x.slug === slug) || (artisans || [])[0];
      if (!a) return;
      const v = (videos?.videos || []).find(x => x.slug === slug);
      detail.innerHTML = artisanDetailHTML(a, v);
      applyLang(detectLang());
    });
  }
  function artisanDetailHTML(a, v) {
    const vid = v?.videoId || a.videoId;
    const youtubeUrl = vid
      ? `https://www.youtube.com/watch?v=${vid}`
      : `https://www.youtube.com/@obrasdelpais/search?query=${encodeURIComponent(a.name)}`;
    const heroImg = a.image ? `<img src="${a.image}" alt="${escapeHTML(a.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.55;mix-blend-mode:luminosity;">` : "";
    return `
    <section class="page-intro" style="position:relative;overflow:hidden;">
      ${heroImg}
      <div class="page-intro__wrap" style="position:relative;z-index:1;">
        <span class="page-intro__crumb"><a href="/directorio.html" class="link-inline" style="color:inherit;">Directorio</a> · Doc ${String(a.n).padStart(2,'0')} · ${escapeHTML(a.region_es||'')}</span>
        <h1 class="page-intro__title">${escapeHTML(a.name)}</h1>
        <p class="script" style="font-size:2.4rem;color:var(--ochre-soft);line-height:1;margin-block:0.5rem;" data-lang="es">${escapeHTML(a.craft_es)}</p>
        <p class="script" style="font-size:2.4rem;color:var(--ochre-soft);line-height:1;margin-block:0.5rem;" data-lang="en">${escapeHTML(a.craft_en)}</p>
        ${a.place_es ? `<span class="page-intro__crumb">${escapeHTML(a.place_es)}</span>` : ""}
        ${a.description ? `<p class="page-intro__lede" style="margin-top:1.5rem;">${escapeHTML(a.description)}</p>` : ""}
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="two-col">
          <div>
            <span class="eyebrow" data-lang="es">El oficio</span>
            <span class="eyebrow" data-lang="en">The craft</span>
            <h2 class="h3 mt-5" data-lang="es">Un retrato del trabajo de las manos</h2>
            <h2 class="h3 mt-5" data-lang="en">A portrait of the work of the hands</h2>
            <div class="prose mt-5">
              <p data-lang="es">Cada documental de Obras del País se filma en el taller del artesano, en su comunidad, en el ritmo de su día. No buscamos un perfil: buscamos un retrato. Las manos cuentan lo que las palabras a veces no alcanzan.</p>
              <p data-lang="en">Each Obras del País documentary is filmed in the artisan's workshop, in their community, at the pace of their day. We don't make profiles — we make portraits. Hands say what words sometimes can't.</p>
            </div>
          </div>
          <div>
            <a class="doc-band__media" href="${youtubeUrl}" target="_blank" rel="noopener" style="display:block;border-radius:8px;overflow:hidden;position:relative;">
              ${vid ? `<img src="https://i.ytimg.com/vi/${vid}/maxresdefault.jpg" alt="" style="width:100%;display:block;">` : (a.image ? `<img src="${a.image}" alt="" style="width:100%;display:block;">` : `<div class="ph" style="aspect-ratio:16/10;"></div>`)}
              <span class="play-pill" style="position:absolute;left:12px;bottom:12px;">Ver en YouTube ↗</span>
            </a>
            <div class="mt-5">
              <a class="btn btn--clay" href="${youtubeUrl}" target="_blank" rel="noopener">
                <span data-lang="es">Ver el documental</span>
                <span data-lang="en">Watch the film</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="section section--paper-warm">
      <div class="wrap">
        <span class="eyebrow" data-lang="es">Encuéntrame</span>
        <span class="eyebrow" data-lang="en">Find me</span>
        <h3 class="h3 mt-5" data-lang="es">Para comisiones, talleres o visitas al taller</h3>
        <h3 class="h3 mt-5" data-lang="en">Commissions, workshops, or studio visits</h3>
        <p class="mt-5 muted" data-lang="es">Cada artesano documentado puede ser contactado directamente. Escríbenos a <a class="link-inline" href="mailto:hola@obrasdelpais.com">hola@obrasdelpais.com</a> y te ponemos en contacto, o visita el directorio y descarga la <a class="link-inline" href="/preguntas-frecuentes.html">guía para contactar adecuadamente</a>.</p>
        <p class="mt-5 muted" data-lang="en">Every documented artisan can be reached directly. Email <a class="link-inline" href="mailto:hola@obrasdelpais.com">hola@obrasdelpais.com</a> and we'll connect you, or read the <a class="link-inline" href="/preguntas-frecuentes.html">guide on how to reach out respectfully</a>.</p>
      </div>
    </section>`;
  }
})();
