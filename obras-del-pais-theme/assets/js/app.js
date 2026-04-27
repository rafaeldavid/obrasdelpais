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
  function observeReveal(scope) {
    (scope || document).querySelectorAll(".reveal").forEach((el) => {
      if (el.classList.contains("is-in")) return;
      if (io) io.observe(el); else el.classList.add("is-in");
    });
  }
  window.observeReveal = observeReveal;
  observeReveal();

  /* ---------- Feedback button + modal ---------- */
  (async function initFeedback() {
    let cfg;
    try {
      const r = await fetch("/assets/data/feedback-config.json", { cache: "no-cache" });
      if (r.ok) cfg = await r.json();
    } catch {}
    const endpoint = (cfg && cfg.endpoint) || "";
    if (!endpoint) {
      // Worker not deployed yet — leave the button hidden so the page doesn't lie about working.
      return;
    }

    const btn = document.createElement("button");
    btn.className = "feedback-btn";
    btn.type = "button";
    btn.title = "Comentarios · Feedback";
    btn.setAttribute("aria-label", "Comentarios · Feedback");
    btn.innerHTML = `
      <svg class="feedback-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
      <span class="feedback-btn__label" data-lang="es">Comentarios</span>
      <span class="feedback-btn__label" data-lang="en">Feedback</span>
    `;
    document.body.appendChild(btn);
    const currentLang = document.documentElement.dataset.lang || "es";
    btn.querySelectorAll("[data-lang]").forEach(el => el.classList.toggle("is-active", el.dataset.lang === currentLang));

    btn.addEventListener("click", () => openFeedbackModal(endpoint));

    // Expose programmatic openers so other pages (e.g. /mapa.html) can
    // trigger the lead modal from any link with [data-open-lead].
    window.openLeadModal = () => openLeadModal(endpoint);
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-open-lead]");
      if (a) { e.preventDefault(); openLeadModal(endpoint); }
      const b = e.target.closest("[data-open-feedback]");
      if (b) { e.preventDefault(); openFeedbackModal(endpoint); }
    });
  })();

  function openFeedbackModal(endpoint) {
    const lang = document.documentElement.dataset.lang || "es";
    const t = (es, en) => (lang === "en" ? en : es);

    const modal = document.createElement("div");
    modal.className = "feedback-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="feedback-modal__panel">
        <button class="feedback-modal__close" aria-label="${t("Cerrar","Close")}">×</button>
        <h2>${t("Comentarios","Feedback")}</h2>
        <p class="muted">${t("Cuéntanos qué podemos mejorar — qué te gusta, qué no funciona, qué historia falta. Lo leemos todo.","Tell us what we can improve — what works, what doesn't, what's missing. We read every message.")}</p>
        <form class="feedback-modal__form" novalidate>
          <label>
            ${t("Mensaje","Message")}
            <textarea name="message" rows="5" required maxlength="4000" placeholder="${t("Escribe en español o inglés.","Write in Spanish or English.")}"></textarea>
          </label>
          <label>
            ${t("Email (opcional)","Email (optional)")}
            <input type="email" name="email" maxlength="200" placeholder="${t("Si quieres respuesta","If you'd like a reply")}">
          </label>
          <input class="feedback-modal__hp" type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="feedback-modal__actions">
            <button type="submit" class="btn btn--clay">${t("Enviar","Send")}</button>
            <button type="button" class="btn btn--ghost feedback-modal__cancel">${t("Cancelar","Cancel")}</button>
            <span class="feedback-modal__status" aria-live="polite"></span>
          </div>
        </form>
        <p class="feedback-modal__disclosure">${t(
          "Tu mensaje se guarda en nuestro repositorio público de GitHub para transparencia. No incluyas datos sensibles.",
          "Your message is saved to our public GitHub repository for transparency. Please don't include sensitive personal info."
        )}</p>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    function close() {
      modal.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);

    modal.querySelector(".feedback-modal__close").addEventListener("click", close);
    modal.querySelector(".feedback-modal__cancel").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

    setTimeout(() => modal.querySelector("textarea").focus(), 50);

    const form = modal.querySelector("form");
    const status = modal.querySelector(".feedback-modal__status");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const message = (fd.get("message") || "").toString().trim();
      if (message.length < 2) {
        status.className = "feedback-modal__status is-error";
        status.textContent = t("Escribe un mensaje","Write a message");
        return;
      }
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.className = "feedback-modal__status";
      status.textContent = t("Enviando…","Sending…");
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            email: (fd.get("email") || "").toString().trim(),
            hp: (fd.get("hp") || "").toString(),
            page: location.pathname + location.search,
            lang,
          }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        status.className = "feedback-modal__status is-ok";
        status.textContent = t("✓ Enviado, gracias","✓ Sent, thank you");
        form.querySelector("textarea").value = "";
        form.querySelector("input[type=email]").value = "";
        setTimeout(close, 1400);
      } catch (err) {
        status.className = "feedback-modal__status is-error";
        status.textContent = t("Error — intenta de nuevo","Error — try again");
        submitBtn.disabled = false;
        console.error("feedback submit:", err);
      }
    });
  }

  /* ---------- Lead modal (artisan tip from a community member) ---------- */
  function openLeadModal(endpoint) {
    if (!endpoint) {
      console.warn("Lead endpoint not configured");
      return;
    }
    const lang = document.documentElement.dataset.lang || "es";
    const t = (es, en) => (lang === "en" ? en : es);

    const modal = document.createElement("div");
    modal.className = "feedback-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="feedback-modal__panel">
        <button class="feedback-modal__close" aria-label="${t("Cerrar","Close")}">×</button>
        <h2>${t("¿Conoces un artesano que debamos documentar?","Know an artisan we should document?")}</h2>
        <p class="muted">${t("Cuéntanos quién es, dónde trabaja, y qué oficio domina. Cada referencia es un próximo documental posible.","Tell us who they are, where they work, and what craft they master. Every tip is a possible next documentary.")}</p>
        <form class="feedback-modal__form" novalidate>
          <label>
            ${t("Nombre del artesano","Artisan's name")}
            <input type="text" name="artisan_name" required maxlength="120" placeholder="${t("Don/Doña…","Don/Doña…")}">
          </label>
          <label>
            ${t("Municipio","Municipio")}
            <input type="text" name="municipio" required maxlength="60" placeholder="${t("Pueblo de Puerto Rico","Town in Puerto Rico")}">
          </label>
          <label>
            ${t("Oficio · materiales","Craft · materials")}
            <input type="text" name="craft" required maxlength="200" placeholder="${t("Talla en madera, mundillo, vejigantes…","Wood carving, mundillo lace, vejigantes…")}">
          </label>
          <label>
            ${t("Cómo contactarles","How to reach them")}
            <input type="text" name="contact" maxlength="200" placeholder="${t("Teléfono, Instagram, email…","Phone, Instagram, email…")}">
          </label>
          <label>
            ${t("Notas (opcional)","Notes (optional)")}
            <textarea name="notes" rows="3" maxlength="2000" placeholder="${t("Por qué crees que su historia debe contarse","Why their story should be told")}"></textarea>
          </label>
          <label>
            ${t("Tu email (opcional)","Your email (optional)")}
            <input type="email" name="email" maxlength="200" placeholder="${t("Si quieres seguimiento","If you'd like a follow-up")}">
          </label>
          <input class="feedback-modal__hp" type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="feedback-modal__actions">
            <button type="submit" class="btn btn--clay">${t("Enviar referencia","Send tip")}</button>
            <button type="button" class="btn btn--ghost feedback-modal__cancel">${t("Cancelar","Cancel")}</button>
            <span class="feedback-modal__status" aria-live="polite"></span>
          </div>
        </form>
        <p class="feedback-modal__disclosure">${t(
          "Tu referencia se guarda en nuestro repositorio de GitHub para que el equipo la revise. No es un compromiso — investigamos cada lead respetuosamente.",
          "Your tip is saved to our GitHub repository so the team can review it. It's not a commitment — we investigate each lead respectfully."
        )}</p>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    function close() {
      modal.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);

    modal.querySelector(".feedback-modal__close").addEventListener("click", close);
    modal.querySelector(".feedback-modal__cancel").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

    setTimeout(() => modal.querySelector("input[name=artisan_name]").focus(), 50);

    const form = modal.querySelector("form");
    const status = modal.querySelector(".feedback-modal__status");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const artisan = (fd.get("artisan_name") || "").toString().trim();
      const muni = (fd.get("municipio") || "").toString().trim();
      const craft = (fd.get("craft") || "").toString().trim();
      const contact = (fd.get("contact") || "").toString().trim();
      const notes = (fd.get("notes") || "").toString().trim();
      if (!artisan || !muni || !craft) {
        status.className = "feedback-modal__status is-error";
        status.textContent = t("Falta información requerida","Missing required info");
        return;
      }
      // Compose a single message string preserving the structure
      const parts = [
        `Artesano: ${artisan}`,
        `Municipio: ${muni}`,
        `Oficio: ${craft}`,
      ];
      if (contact) parts.push(`Contacto: ${contact}`);
      if (notes) parts.push(`Notas: ${notes}`);
      const message = parts.join(" · ");

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.className = "feedback-modal__status";
      status.textContent = t("Enviando…","Sending…");
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "lead",
            message,
            email: (fd.get("email") || "").toString().trim(),
            hp: (fd.get("hp") || "").toString(),
            page: location.pathname + location.search,
            lang,
          }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        status.className = "feedback-modal__status is-ok";
        status.textContent = t("Gracias","Thank you");
        setTimeout(close, 1400);
      } catch (err) {
        status.className = "feedback-modal__status is-error";
        status.textContent = t("Error — intenta de nuevo","Error — try again");
        submitBtn.disabled = false;
        console.error("lead submit:", err);
      }
    });
  }

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
    docList.innerHTML = `<div class="muted" style="padding:2rem 0;font-family:var(--font-mono);font-size:var(--fs-xs);letter-spacing:0.18em;text-transform:uppercase;opacity:0.6;">Cargando desde YouTube · loading from YouTube…</div>`;
    Promise.all([loadJSON("/assets/data/videos.json"), loadJSON("/assets/data/artisans.json")])
      .then(async ([videos, artisans]) => {
        const idx = (artisans || []).reduce((m, a) => (m[a.slug] = a, m), {});
        const items = (videos && videos.videos && videos.videos.length)
          ? videos.videos
          : (artisans || []).slice().reverse().map((a) => ({
              n: a.n, title_es: a.craft_es + " · " + a.name, title_en: a.craft_en + " — " + a.name,
              videoId: null, slug: a.slug, place_es: a.place_es, region_es: a.region_es,
            }));

        // Enrich items with live YouTube metadata via oembed (no API key needed)
        const enriched = await Promise.all(items.map(async (v) => {
          if (!v.videoId) return v;
          const meta = await fetchYouTubeMeta(v.videoId);
          if (meta) {
            // Spanish title comes live from YouTube (channel is Spanish-primary).
            // Keep our English title from local data so the EN toggle still translates.
            return { ...v, title_es: meta.title || v.title_es,
                     yt_author: meta.author_name, yt_thumb: meta.thumbnail_url };
          }
          return v;
        }));

        docList.innerHTML = enriched.map((v) => bandHTML(v, idx[v.slug] || {})).join("");
        observeReveal(docList);
        wireFilters(enriched, idx);
      });
  }

  /* YouTube oembed: returns { title, author_name, thumbnail_url } or null */
  const YT_CACHE_KEY = "od:yt-meta:v1";
  const YT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
  function readYtCache() {
    try { return JSON.parse(localStorage.getItem(YT_CACHE_KEY) || "{}"); } catch { return {}; }
  }
  function writeYtCache(c) {
    try { localStorage.setItem(YT_CACHE_KEY, JSON.stringify(c)); } catch {}
  }
  async function fetchYouTubeMeta(videoId) {
    const cache = readYtCache();
    const hit = cache[videoId];
    if (hit && Date.now() - hit.ts < YT_CACHE_TTL) return hit.data;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&format=json`,
        { signal: ctrl.signal, mode: "cors" }
      );
      clearTimeout(timer);
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      cache[videoId] = { ts: Date.now(), data };
      writeYtCache(cache);
      return data;
    } catch (err) {
      console.warn("YouTube oembed failed for", videoId, err && err.message);
      return null;
    }
  }
  function bandHTML(v, a) {
    const title = v.title_es || (a.craft_es + " · " + a.name);
    const titleEn = v.title_en || (a.craft_en + " — " + a.name);
    const place = v.place_es || a.place_es || "";
    const region = v.region_es || a.region_es || "";
    const vid = v.videoId || a.videoId;
    const youtubeUrl = vid ? `https://www.youtube.com/watch?v=${vid}` : `https://www.youtube.com/@obrasdelpais/search?query=${encodeURIComponent(a.name || title)}`;
    const thumb = (vid ? `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg` : null) || a.image_cdn || a.image;
    const desc = v.description || a.description || "";
    const hay = [a.name, a.craft_es, a.craft_en, place, region, title, titleEn, desc].filter(Boolean).join(" ").toLowerCase();
    const ytLabel = vid ? "Ver en YouTube ↗" : "Buscar en YouTube ↗";
    const where = [place, region].filter(Boolean).join(" · ");
    return `
    <article class="doc-band reveal"
      data-region="${region.toLowerCase()}"
      data-craft="${escapeHTML(simpleCraft(a.craft_es))}"
      data-search="${escapeHTML(hay)}"
      data-asl="${a.asl ? '1' : '0'}">
      <a class="doc-band__media" href="${youtubeUrl}" target="_blank" rel="noopener" aria-label="${ytLabel}">
        ${thumb ? `<img src="${thumb}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${a.image_cdn || a.image || ''}';">` : `<div class="ph"></div>`}
        <span class="play-pill">${ytLabel}</span>
        ${a.asl ? `<span class="play-pill" style="left:auto;right:var(--s-3);background:var(--clay);">🤟 LSPR</span>` : ""}
      </a>
      <div class="doc-band__meta">
        <div class="doc-band__chips">
          <span class="doc-band__no">Doc · ${String(v.n).padStart(2,"0")}</span>
          <span class="doc-band__chip">${escapeHTML(simpleCraft(a.craft_es))}</span>
          ${region ? `<span class="doc-band__chip doc-band__chip--region">${escapeHTML(region)}</span>` : ""}
          ${a.asl ? `<span class="doc-band__chip doc-band__chip--asl">LSPR</span>` : ""}
        </div>
        <h3 class="doc-band__title" data-lang="es">${escapeHTML(title)}</h3>
        <h3 class="doc-band__title" data-lang="en">${escapeHTML(titleEn)}</h3>
        <p class="doc-band__byline">${escapeHTML(a.name || "")}${where ? ` · <span class="doc-band__where" style="display:inline;">${escapeHTML(where)}</span>` : ""}</p>
        ${desc ? `<p class="doc-band__logline">${escapeHTML(desc)}</p>` : ""}
        <p class="doc-band__craft-line" data-lang="es"><strong>Oficio:</strong> ${escapeHTML(a.craft_es || "—")}</p>
        <p class="doc-band__craft-line" data-lang="en"><strong>Craft:</strong> ${escapeHTML(a.craft_en || "—")}</p>
        <div class="doc-band__cta-row">
          <a class="btn btn--clay" href="${youtubeUrl}" target="_blank" rel="noopener">
            <span data-lang="es">${vid ? "Ver el documental" : "Buscar en YouTube"}</span>
            <span data-lang="en">${vid ? "Watch the film" : "Search YouTube"}</span> ↗
          </a>
          <a class="link-inline" href="/artesano.html?slug=${encodeURIComponent(a.slug)}">
            <span data-lang="es">Perfil del artesano</span><span data-lang="en">Artisan profile</span> →
          </a>
        </div>
      </div>
    </article>`;
  }
  function slugCraft(s) {
    return s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 18);
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
  function wireFilters(items, idx) {
    idx = idx || {};
    const search = document.querySelector("[data-doc-search]");
    const counter = document.querySelector("[data-doc-counter]");
    const state = { search: "", region: "", craft: "", asl: false };

    function apply() {
      let visible = 0;
      docList.querySelectorAll(".doc-band").forEach((band) => {
        const okR = !state.region || band.dataset.region === state.region;
        const okC = !state.craft || band.dataset.craft === state.craft;
        const okA = !state.asl || band.dataset.asl === "1";
        const okS = !state.search || (band.dataset.search || "").includes(state.search);
        const ok = okR && okC && okA && okS;
        band.style.display = ok ? "" : "none";
        if (ok) visible++;
      });
      if (counter) counter.textContent = visible === items.length ? `${items.length}` : `${visible} / ${items.length}`;
    }

    if (search) {
      search.addEventListener("input", (e) => {
        state.search = e.target.value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        apply();
      });
    }
    document.querySelectorAll("[data-region-pill]").forEach((p) => {
      p.addEventListener("click", () => {
        state.region = p.dataset.regionPill || "";
        document.querySelectorAll("[data-region-pill]").forEach(x => x.setAttribute("aria-pressed", x === p ? "true" : "false"));
        apply();
      });
    });
    document.querySelectorAll("[data-craft-pill]").forEach((p) => {
      p.addEventListener("click", () => {
        state.craft = state.craft === p.dataset.craftPill ? "" : p.dataset.craftPill;
        document.querySelectorAll("[data-craft-pill]").forEach(x => x.setAttribute("aria-pressed", x.dataset.craftPill === state.craft ? "true" : "false"));
        apply();
      });
    });
    const aslBtn = document.querySelector("[data-asl-toggle]");
    if (aslBtn) {
      aslBtn.addEventListener("click", () => {
        state.asl = !state.asl;
        aslBtn.setAttribute("aria-pressed", state.asl ? "true" : "false");
        apply();
      });
    }
    const clearBtn = document.querySelector("[data-clear-doc-filters]");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        state.search = ""; state.region = ""; state.craft = ""; state.asl = false;
        if (search) search.value = "";
        document.querySelectorAll("[data-region-pill],[data-craft-pill],[data-asl-toggle]").forEach(x => x.setAttribute("aria-pressed", x.dataset.regionPill === "" ? "true" : "false"));
        apply();
      });
    }
    // initial render: pre-build craft pill counts from real artisan crafts
    const craftRail = document.querySelector("[data-craft-pill-rail]");
    if (craftRail) {
      const counts = {};
      items.forEach(v => {
        const a = idx[v.slug] || {};
        const k = simpleCraft(a.craft_es);
        counts[k] = (counts[k] || 0) + 1;
      });
      craftRail.innerHTML = `<button class="region-pill" data-craft-pill="" aria-pressed="true">Todos los oficios</button>` +
        Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([k,n]) =>
          `<button class="region-pill" data-craft-pill="${escapeHTML(k)}" aria-pressed="false">${escapeHTML(k)} <span style="opacity:0.6;">· ${n}</span></button>`
        ).join("");
    }
    apply();
  }

  /* ---------- Directory page ---------- */
  const dirGrid = document.querySelector("[data-dir-grid]");
  if (dirGrid) {
    dirGrid.innerHTML = `<div class="muted" style="grid-column:1/-1;padding:2rem 0;font-family:var(--font-mono);font-size:var(--fs-xs);letter-spacing:0.18em;text-transform:uppercase;opacity:0.6;">Cargando · loading…</div>`;
    loadJSON("/assets/data/artisans.json").then((artisans) => {
      if (!artisans || !artisans.length) {
        dirGrid.innerHTML = `<div class="muted" style="grid-column:1/-1;padding:2rem 0;"><strong>No pudimos cargar el directorio.</strong> <a class="link-inline" href="/">Volver al inicio</a></div>`;
        return;
      }
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
      observeReveal(dirGrid);
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
    const src = a.image_cdn || a.image;
    const photo = src
      ? `<img src="${src}" alt="${escapeHTML(a.name)}" loading="lazy">`
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
    detail.innerHTML = `<section class="page-intro"><div class="page-intro__wrap"><span class="page-intro__crumb">Cargando · loading…</span></div></section>`;
    Promise.all([loadJSON("/assets/data/artisans.json"), loadJSON("/assets/data/videos.json")]).then(([artisans, videos]) => {
      if (!artisans || !artisans.length) {
        detail.innerHTML = `<section class="page-intro"><div class="page-intro__wrap"><h1 class="page-intro__title">No pudimos cargar la ficha</h1><p class="page-intro__lede"><a class="link-inline" href="/directorio.html" style="color:inherit;">Volver al directorio</a> · <a class="link-inline" href="/" style="color:inherit;">Inicio</a></p></div></section>`;
        return;
      }
      const a = (slug && artisans.find(x => x.slug === slug)) || artisans[0];
      if (!a) {
        detail.innerHTML = `<section class="page-intro"><div class="page-intro__wrap"><h1 class="page-intro__title">Artesano no encontrado</h1><p class="page-intro__lede">No tenemos una ficha con ese nombre. <a class="link-inline" href="/directorio.html" style="color:inherit;">Ver el directorio completo</a>.</p></div></section>`;
        return;
      }
      const v = (videos?.videos || []).find(x => x.slug === a.slug);
      detail.innerHTML = artisanDetailHTML(a, v);
      observeReveal(detail);
      applyLang(detectLang());
    });
  }
  function artisanDetailHTML(a, v) {
    const vid = v?.videoId || a.videoId;
    const youtubeUrl = vid
      ? `https://www.youtube.com/watch?v=${vid}`
      : `https://www.youtube.com/@obrasdelpais/search?query=${encodeURIComponent(a.name)}`;
    const heroSrc = a.image_cdn || a.image;
    const heroImg = heroSrc ? `<img src="${heroSrc}" alt="${escapeHTML(a.name)}" class="page-intro__bg-img">` : "";
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
              ${vid ? `<img src="https://i.ytimg.com/vi/${vid}/maxresdefault.jpg" alt="" style="width:100%;display:block;">` : (heroSrc ? `<img src="${heroSrc}" alt="" style="width:100%;display:block;">` : `<div class="ph" style="aspect-ratio:16/10;"></div>`)}
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
