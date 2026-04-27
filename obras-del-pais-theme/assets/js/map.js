/* Obras del País — interactive municipalities map */
(async function () {
  const stage = document.querySelector("[data-map-svg]");
  const tooltip = document.querySelector("[data-map-tooltip]");
  const detail = document.querySelector("[data-map-detail]");
  const list = document.querySelector("[data-muni-list]");
  if (!list) return;

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  let muniData;
  try {
    const r = await fetch("/assets/data/municipios.json", { cache: "no-cache" });
    muniData = await r.json();
  } catch (e) {
    console.error("municipios.json failed:", e);
    list.innerHTML = `<p class="muted" style="grid-column:1/-1;"><strong>No pudimos cargar los datos del archivo.</strong> <a class="link-inline" href="/directorio.html">Ir al directorio</a></p>`;
    return;
  }
  const munis = muniData.by_municipio || {};
  const lang = () => document.documentElement.dataset.lang || "es";

  /* ---- Render the accessible archive list FIRST, independent of the SVG ---- */
  function renderList() {
    const L = lang();
    list.innerHTML = Object.values(munis).map((info) => {
      const word = L === "en"
        ? `artisan${info.artisans.length === 1 ? "" : "s"}`
        : `artesano${info.artisans.length === 1 ? "" : "s"}`;
      const flag = info.flag
        ? `<img class="muni-card__flag" src="${info.flag}" alt="Bandera de ${escapeHTML(info.name)}" loading="lazy">`
        : `<div class="muni-card__flag" aria-hidden="true"></div>`;
      // Card click goes to documentary detail of first artisan in that muni
      return `
        <a class="muni-card reveal" data-muni-card="${info.slug}" href="/artesano.html?slug=${encodeURIComponent(info.artisans[0].slug)}">
          ${flag}
          <span class="muni-card__name">${escapeHTML(info.name)}</span>
          <span class="muni-card__count">${info.artisans.length} ${word}</span>
        </a>
      `;
    }).join("");
    if (typeof window.observeReveal === "function") window.observeReveal(list);
  }
  renderList();
  // Re-render the list when the language toggle flips
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-lang-toggle]")) setTimeout(renderList, 0);
  });

  // Clicking a card opens the detail panel for that muni instead of jumping
  // to the first artisan — keeps the user inside the map experience
  list.addEventListener("click", (e) => {
    const card = e.target.closest("[data-muni-card]");
    if (!card) return;
    const slug = card.dataset.muniCard;
    const info = munis[slug];
    if (info) {
      e.preventDefault();
      renderDetail(info);
    }
  });

  /* ---- Now attempt the interactive SVG ---- */
  if (!stage) return;

  let svgText;
  try {
    const r = await fetch("/assets/img/pr-municipios.svg", { cache: "no-cache" });
    svgText = await r.text();
  } catch (e) {
    console.error("pr-municipios.svg failed:", e);
    return;
  }

  // Parse as proper XML so the SVG namespace is preserved (innerHTML on a div
  // strips it in some engines, leaving polygons rendered with no geometry).
  let svg;
  try {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    svg = doc.documentElement;
    if (svg.querySelector("parsererror")) throw new Error("parsererror");
    // Adopt the parsed node into our document and append
    stage.innerHTML = "";
    stage.appendChild(document.importNode(svg, true));
    svg = stage.querySelector("svg");
  } catch (e) {
    console.error("SVG parse failed:", e);
    stage.innerHTML = `<p class="muted" style="padding:2rem;">El mapa interactivo no cargó. Explora el archivo abajo.</p>`;
    return;
  }
  if (!svg) return;

  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.removeAttribute("xml:space");
  // Crop the viewBox to inhabited munis only (drop Mona, Desecheo, Monito,
  // Caja de Muertos in the original SVG's empty left side). Yields a tighter
  // 3.2:1 map that fills the container at full width.
  svg.setAttribute("viewBox", "280 -15 960 305");
  // Hide the four uninhabited offshore island polygons so they don't draw
  // ghost dots inside the cropped frame.
  ["isla-de-mona", "isla-caja-de-muertos", "isla-de-desecheo", "isla-monito"].forEach((id) => {
    const el = svg.querySelector(`#${id}`);
    if (el) el.style.display = "none";
  });

  // Mark each municipio polygon
  Object.entries(munis).forEach(([slug, info]) => {
    let el = null;
    try {
      el = svg.querySelector(`#${CSS.escape(slug)}`);
    } catch {}
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

  function renderTooltipBody(info) {
    const L = lang();
    const items = info.artisans.slice(0, 5).map((a) =>
      `<li>${escapeHTML(a.name)} · <em>${escapeHTML(L === "en" ? a.craft_en : a.craft_es)}</em></li>`
    ).join("");
    const more = info.artisans.length > 5
      ? `<li style="opacity:0.6;">+ ${info.artisans.length - 5} ${L === "en" ? "more" : "más"}…</li>`
      : "";
    return `
      <span class="map-tooltip__name">${escapeHTML(info.name)}</span>
      <span class="map-tooltip__count">${info.artisans.length} ${L === "en" ? "artisan" + (info.artisans.length === 1 ? "" : "s") : "artesano" + (info.artisans.length === 1 ? "" : "s")}</span>
      <ul class="map-tooltip__list">${items}${more}</ul>
    `;
  }

  function showTooltip(el, info) {
    if (!tooltip) return;
    tooltip.innerHTML = renderTooltipBody(info);
    tooltip.hidden = false;
    requestAnimationFrame(() => {
      positionTooltip(el);
      tooltip.classList.add("is-shown");
    });
  }

  function positionTooltip(el) {
    if (!tooltip) return;
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
    if (!tooltip) return;
    tooltip.classList.remove("is-shown");
    setTimeout(() => { if (!tooltip.classList.contains("is-shown")) tooltip.hidden = true; }, 200);
  }

  function renderDetail(info) {
    if (!detail) return;
    const L = lang();
    const word = L === "en"
      ? `artisan${info.artisans.length === 1 ? "" : "s"}`
      : `artesano${info.artisans.length === 1 ? "" : "s"}`;
    const flagImg = info.flag
      ? `<img src="${info.flag}" alt="Bandera de ${escapeHTML(info.name)}" loading="lazy" style="width:64px;height:44px;object-fit:contain;background:var(--paper);border-radius:2px;border:1px solid var(--line-on-paper);">`
      : "";
    const photos = info.artisans.map((a) => {
      const img = a.image_cdn ? `<img src="${a.image_cdn}" alt="${escapeHTML(a.name)}" loading="lazy">` : "";
      return `<a href="/artesano.html?slug=${encodeURIComponent(a.slug)}" title="${escapeHTML(a.name)}">${img}</a>`;
    }).join("");
    const items = info.artisans.map((a) =>
      `<li><strong>${escapeHTML(a.name)}</strong> · <em>${escapeHTML(L === "en" ? a.craft_en : a.craft_es)}</em></li>`
    ).join("");

    detail.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;">
        ${flagImg}
        <div>
          <p class="eyebrow" style="margin:0;">${info.artisans.length} ${word}</p>
          <h2 class="h3" style="margin:0.2rem 0 0;">${escapeHTML(info.name)}</h2>
        </div>
      </div>
      <ul class="muni-card__artisans" style="list-style:none;padding:0;margin:0.6rem 0 0;display:flex;flex-direction:column;gap:0.3rem;font-size:var(--fs-sm);">${items}</ul>
      <div class="map-detail__photo-row">${photos}</div>
      <p class="mt-5"><a class="link-inline" href="/directorio.html">${L === "en" ? "See full directory" : "Ver directorio completo"} →</a></p>
    `;
    detail.classList.add("is-active");
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Wire hover/click on each highlighted polygon
  svg.querySelectorAll(".municipio.has-artisans").forEach((el) => {
    const slug = el.dataset.muniSlug;
    const info = munis[slug];
    el.addEventListener("mouseenter", () => showTooltip(el, info));
    el.addEventListener("mouseleave", hideTooltip);
    el.addEventListener("focus", () => showTooltip(el, info));
    el.addEventListener("blur", hideTooltip);
    el.addEventListener("click", () => renderDetail(info));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); renderDetail(info); }
    });
  });
})();
