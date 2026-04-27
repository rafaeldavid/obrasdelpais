/* Obras del País — interactive municipalities map */
(async function () {
  const stage = document.querySelector("[data-map-svg]");
  const tooltip = document.querySelector("[data-map-tooltip]");
  const detail = document.querySelector("[data-map-detail]");
  const list = document.querySelector("[data-muni-list]");
  if (!stage || !list) return;

  const [svgText, muniData] = await Promise.all([
    fetch("/assets/img/pr-municipios.svg").then((r) => r.text()),
    fetch("/assets/data/municipios.json").then((r) => r.json()),
  ]);

  // Inject the SVG so we can style and hook events on individual paths
  stage.innerHTML = svgText;
  const svg = stage.querySelector("svg");
  if (!svg) return;
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.removeAttribute("xml:space");

  const munis = muniData.by_municipio || {};

  // Mark each municipio polygon
  Object.entries(munis).forEach(([slug, info]) => {
    const el = svg.querySelector(`#${CSS.escape(slug)}`);
    if (!el) {
      console.warn("no SVG element for", slug);
      return;
    }
    el.classList.add("has-artisans");
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `${info.name} — ${info.artisans.length} artesano${info.artisans.length === 1 ? "" : "s"}`);
    el.dataset.muniSlug = slug;
  });

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function renderTooltipBody(info) {
    const lang = document.documentElement.dataset.lang || "es";
    const list = info.artisans.slice(0, 5).map((a) =>
      `<li>${escapeHTML(a.name)} · <em>${escapeHTML(lang === "en" ? a.craft_en : a.craft_es)}</em></li>`
    ).join("");
    const more = info.artisans.length > 5
      ? `<li style="opacity:0.6;">+ ${info.artisans.length - 5} más…</li>`
      : "";
    return `
      <span class="map-tooltip__name">${escapeHTML(info.name)}</span>
      <span class="map-tooltip__count">${info.artisans.length} artesano${info.artisans.length === 1 ? "" : "s"}</span>
      <ul class="map-tooltip__list">${list}${more}</ul>
    `;
  }

  function showTooltip(el, info) {
    tooltip.innerHTML = renderTooltipBody(info);
    tooltip.hidden = false;
    requestAnimationFrame(() => positionTooltip(el));
    requestAnimationFrame(() => tooltip.classList.add("is-shown"));
  }

  function positionTooltip(el) {
    const stageRect = stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const x = elRect.left + elRect.width / 2 - stageRect.left;
    const y = elRect.top - stageRect.top;
    const ttRect = tooltip.getBoundingClientRect();
    const minX = ttRect.width / 2 + 8;
    const maxX = stageRect.width - ttRect.width / 2 - 8;
    tooltip.style.left = Math.max(minX, Math.min(maxX, x)) + "px";
    tooltip.style.top = y + "px";
  }

  function hideTooltip() {
    tooltip.classList.remove("is-shown");
    setTimeout(() => { if (!tooltip.classList.contains("is-shown")) tooltip.hidden = true; }, 200);
  }

  function renderDetail(info) {
    const lang = document.documentElement.dataset.lang || "es";
    const head = lang === "en"
      ? `<p class="eyebrow">${info.artisans.length} artisan${info.artisans.length === 1 ? "" : "s"} in</p>`
      : `<p class="eyebrow">${info.artisans.length} artesano${info.artisans.length === 1 ? "" : "s"} en</p>`;
    const photos = info.artisans.map((a) => {
      const slug = a.slug;
      const img = a.image_cdn ? `<img src="${a.image_cdn}" alt="${escapeHTML(a.name)}" loading="lazy">` : "";
      return `<a href="/artesano.html?slug=${encodeURIComponent(slug)}" title="${escapeHTML(a.name)}">${img}</a>`;
    }).join("");
    const items = info.artisans.map((a) =>
      `<li><strong>${escapeHTML(a.name)}</strong> · <em>${escapeHTML(lang === "en" ? a.craft_en : a.craft_es)}</em></li>`
    ).join("");

    detail.innerHTML = `
      ${head}
      <h2 class="h3 mt-5">${escapeHTML(info.name)}</h2>
      <ul class="map-tooltip__list" style="margin-top:0.6rem;list-style:none;padding:0;">${items}</ul>
      <div class="map-detail__photo-row">${photos}</div>
      <p class="mt-5"><a class="link-inline" href="/directorio.html">${lang === "en" ? "See full directory" : "Ver directorio completo"} →</a></p>
    `;
    detail.classList.add("is-active");
  }

  // Hover behavior
  svg.querySelectorAll(".municipio.has-artisans").forEach((el) => {
    const slug = el.dataset.muniSlug;
    const info = munis[slug];
    el.addEventListener("mouseenter", () => showTooltip(el, info));
    el.addEventListener("mouseleave", hideTooltip);
    el.addEventListener("focus", () => showTooltip(el, info));
    el.addEventListener("blur", hideTooltip);
    el.addEventListener("click", () => renderDetail(info));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); renderDetail(info); } });
  });

  // Render the static muni list below the map
  const lang = document.documentElement.dataset.lang || "es";
  list.innerHTML = Object.values(munis).map((info) => {
    const items = info.artisans.map((a) =>
      `<li><strong>${escapeHTML(a.name)}</strong> · <em>${escapeHTML(lang === "en" ? a.craft_en : a.craft_es)}</em></li>`
    ).join("");
    return `
      <a class="muni-card reveal" href="/directorio.html#${info.slug}">
        <span class="muni-card__name">${escapeHTML(info.name)}</span>
        <span class="muni-card__count">${info.artisans.length} ${lang === "en" ? "artisan" + (info.artisans.length === 1 ? "" : "s") : "artesano" + (info.artisans.length === 1 ? "" : "s")}</span>
        <ul class="muni-card__artisans">${items}</ul>
      </a>
    `;
  }).join("");
  // Re-observe reveals if app.js exposed the helper
  if (typeof window.observeReveal === "function") window.observeReveal(list);
})();
