"use strict";

(() => {
  const C = globalThis.PPF_CONFIG;
  const PANEL_ID = "ppf-panel";
  let currentRoute = "";
  let controller = null;
  let version = 0;
  let observer = null;
  let routeTimer = null;

  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Cancelado", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelado", "AbortError"));
    }, { once: true });
  });

  function tagFromUrl() {
    const match = location.pathname.match(/^\/(?:en\/)?tags\/([^/]+)\/artworks\/?$/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  }

  function nested(obj, path) {
    return path.reduce((value, key) => value == null ? undefined : value[key], obj);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function panel() { return document.getElementById(PANEL_ID); }

  function status(message, kind = "info") {
    const el = panel()?.querySelector(".ppf-status");
    if (el) { el.textContent = message; el.dataset.kind = kind; }
  }

  function progress(done, total) {
    const p = panel();
    if (!p) return;
    p.querySelector(".ppf-progress").value = total ? Math.round(done / total * 100) : 0;
    p.querySelector(".ppf-progress-text").textContent =
      total ? "Escaneando " + done + "/" + total + "..." : "Preparando búsqueda...";
  }

  function busy(value) {
    const p = panel();
    if (!p) return;
    p.querySelector(".ppf-search").disabled = value;
    p.querySelector(".ppf-cancel").disabled = !value;
    p.querySelector(".ppf-min-likes").disabled = value;
    p.querySelector(".ppf-pages").disabled = value;
  }

  function createPanel(tag) {
    panel()?.remove();
    const root = document.createElement("section");
    root.id = PANEL_ID;
    root.innerHTML =
      '<div class="ppf-header"><strong>Obras populares</strong>' +
      '<button type="button" class="ppf-collapse" aria-expanded="true" title="Mostrar u ocultar panel">−</button></div>' +
      '<div class="ppf-body">' +
      '<div class="ppf-controls">' +
      '<label>Likes mínimos<input class="ppf-min-likes" type="number" min="0" step="1" value="100"></label>' +
      '<label>Páginas a escanear<select class="ppf-pages">' +
      Array.from({length:C.MAX_PAGES}, (_, i) => '<option value="' + (i + 1) + '"' + (i === 2 ? " selected" : "") + '>' + (i + 1) + '</option>').join("") +
      '</select></label></div>' +
      '<div class="ppf-actions"><button type="button" class="ppf-search">Buscar populares</button>' +
      '<button type="button" class="ppf-cancel" disabled>Cancelar</button></div>' +
      '<progress class="ppf-progress" max="100" value="0"></progress>' +
      '<div class="ppf-progress-text" aria-live="polite">Listo.</div>' +
      '<div class="ppf-status" data-kind="info" role="status">Tag: ' + escapeHtml(tag) + '</div>' +
      '<div class="ppf-results" aria-live="polite"></div></div>';

    document.body.appendChild(root);
    root.querySelector(".ppf-collapse").addEventListener("click", () => {
      const body = root.querySelector(".ppf-body");
      const button = root.querySelector(".ppf-collapse");
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.textContent = expanded ? "+" : "−";
      body.hidden = expanded;
    });
    root.querySelector(".ppf-search").addEventListener("click", runScan);
    root.querySelector(".ppf-cancel").addEventListener("click", () => controller?.abort());
  }

  function renderResults(items) {
    const target = panel()?.querySelector(".ppf-results");
    if (!target) return;
    target.replaceChildren();
    if (!items.length) {
      target.textContent = "No hay obras que cumplan el mínimo de likes.";
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "ppf-card";
      const link = document.createElement("a");
      link.href = "https://www.pixiv.net/artworks/" + encodeURIComponent(item.id);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = item.title;
      if (item.thumbnail) {
        const img = document.createElement("img");
        img.src = item.thumbnail;
        img.alt = item.title;
        img.loading = "lazy";
        link.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "ppf-placeholder";
        placeholder.textContent = "Sin miniatura";
        link.appendChild(placeholder);
      }
      const title = document.createElement("div");
      title.className = "ppf-card-title";
      title.textContent = item.title;
      const likes = document.createElement("div");
      likes.className = "ppf-card-likes";
      likes.textContent = item.likes.toLocaleString() + " likes";
      card.append(link, title, likes);
      fragment.appendChild(card);
    }
    target.appendChild(fragment);
  }

  async function fetchJson(url, signal) {
    const response = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal
    });
    if (response.status === 429) {
      throw new Error("Pixiv ha limitado las peticiones (HTTP 429). Espera antes de volver a intentarlo.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Pixiv ha rechazado la petición. Comprueba que has iniciado sesión.");
    }
    if (!response.ok) throw new Error("Pixiv respondió con HTTP " + response.status + ".");
    if (!(response.headers.get("content-type") || "").includes("json")) {
      throw new Error("Pixiv no devolvió JSON. La sesión puede haber caducado o el endpoint puede haber cambiado.");
    }
    const json = await response.json();
    if (json?.error === true) {
      throw new Error(typeof json.message === "string" ? "Error de Pixiv: " + json.message : "Pixiv devolvió un error.");
    }
    return json;
  }

  function searchUrl(tag, page) {
    const url = new URL(C.SEARCH_PATH + encodeURIComponent(tag), "https://www.pixiv.net");
    url.searchParams.set("word", tag);
    url.searchParams.set("type", C.SEARCH_TYPE);
    url.searchParams.set("order", C.SEARCH_ORDER);
    url.searchParams.set("mode", C.SEARCH_MODE);
    url.searchParams.set("s_mode", C.SEARCH_TAG_MODE);
    url.searchParams.set("p", String(page));
    return url.href;
  }

  async function searchPage(tag, page, signal) {
    const json = await fetchJson(searchUrl(tag, page), signal);
    let items = nested(json, C.SEARCH_ITEMS_PATH);
    if (!Array.isArray(items)) items = nested(json, C.SEARCH_ITEMS_FALLBACK_PATH);
    if (!Array.isArray(items)) {
      throw new Error("Formato de búsqueda inesperado. Revisa body.illust.data y body.illustManga.data en DevTools.");
    }
    return items.filter(item => item && item.isAdContainer !== true).map(item => {
      const id = item[C.SEARCH_ID_FIELD];
      const thumb = item[C.SEARCH_THUMB_FIELD];
      return {
        id: id != null && /^\d+$/.test(String(id)) ? String(id) : null,
        title: typeof item[C.SEARCH_TITLE_FIELD] === "string" ? item[C.SEARCH_TITLE_FIELD] : "Obra sin título",
        thumbnail: typeof thumb === "string" && /^https:\/\//.test(thumb) ? thumb : ""
      };
    }).filter(item => item.id);
  }

  async function readCache(id) {
    const key = C.CACHE_PREFIX + id;
    const stored = await chrome.storage.local.get(key);
    const value = stored[key];
    if (!value || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt >= C.CACHE_TTL_MS) {
      if (value) await chrome.storage.local.remove(key);
      return null;
    }
    return Number.isFinite(value.likes) && value.likes >= 0 ? value : null;
  }

  async function getLikes(artwork, signal) {
    const cached = await readCache(artwork.id);
    if (cached) return {
      ...artwork,
      title: cached.title || artwork.title,
      thumbnail: cached.thumbnail || artwork.thumbnail,
      likes: cached.likes
    };

    // [no verificado] GET /ajax/illust/{id}; campo esperado body.likeCount.
    const url = "https://www.pixiv.net" + C.DETAIL_PATH + encodeURIComponent(artwork.id);
    const json = await fetchJson(url, signal);
    const body = json?.body;
    if (!body || typeof body !== "object") {
      throw new Error("Respuesta de detalle inesperada para la obra " + artwork.id + ".");
    }
    const likes = body[C.DETAIL_LIKES_FIELD];
    if (typeof likes !== "number" || !Number.isFinite(likes) || likes < 0) {
      throw new Error("No se encontró un likeCount numérico en la obra " + artwork.id + ". Revisa DevTools.");
    }
    const title = typeof body[C.DETAIL_TITLE_FIELD] === "string" ? body[C.DETAIL_TITLE_FIELD] : artwork.title;
    const rawThumb = body[C.DETAIL_URLS_FIELD]?.[C.DETAIL_THUMB_FIELD];
    const thumbnail = typeof rawThumb === "string" && /^https:\/\//.test(rawThumb) ? rawThumb : artwork.thumbnail;
    const result = { ...artwork, title, thumbnail, likes };
    await chrome.storage.local.set({
      [C.CACHE_PREFIX + artwork.id]: { likes, title, thumbnail, savedAt: Date.now() }
    });
    return result;
  }

  async function runScan() {
    const tag = tagFromUrl();
    const root = panel();
    if (!tag || !root || controller) return;
    const minLikes = Number(root.querySelector(".ppf-min-likes").value);
    const pageCount = Number(root.querySelector(".ppf-pages").value);
    if (!Number.isSafeInteger(minLikes) || minLikes < 0) return status("Introduce un mínimo de likes válido.", "error");
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > C.MAX_PAGES) return status("Selecciona entre 1 y 10 páginas.", "error");

    const active = new AbortController();
    controller = active;
    const thisVersion = version;
    busy(true);
    progress(0, 0);
    renderResults([]);
    status("Obteniendo obras del tag…");

    try {
      const all = [];
      const seen = new Set();
      for (let page = 1; page <= pageCount; page++) {
        if (active.signal.aborted) throw new DOMException("Cancelado", "AbortError");
        const found = await searchPage(tag, page, active.signal);
        for (const item of found) {
          if (!seen.has(item.id)) { seen.add(item.id); all.push(item); }
        }
        progress(page, pageCount);
        if (page < pageCount) await sleep(C.BATCH_DELAY_MS, active.signal);
      }
      if (!all.length) throw new Error("La búsqueda no devolvió obras. Comprueba el tag y la respuesta de Pixiv.");
      status("Se encontraron " + all.length + " obras. Consultando likes…");
      progress(0, all.length);
      const detailed = [];
      for (let start = 0; start < all.length; start += C.MAX_CONCURRENT) {
        if (active.signal.aborted) throw new DOMException("Cancelado", "AbortError");
        const batch = all.slice(start, start + C.MAX_CONCURRENT);
        const results = await Promise.all(batch.map(item => getLikes(item, active.signal)));
        detailed.push(...results);
        progress(Math.min(start + batch.length, all.length), all.length);
        if (start + C.MAX_CONCURRENT < all.length) await sleep(C.BATCH_DELAY_MS, active.signal);
      }
      if (thisVersion !== version) return;
      const filtered = detailed.filter(item => item.likes >= minLikes).sort((a, b) => b.likes - a.likes);
      renderResults(filtered);
      status("Completado: " + filtered.length + " obras con " + minLikes + " likes o más.", "success");
      progress(all.length, all.length);
    } catch (error) {
      if (error.name === "AbortError") status("Escaneo cancelado.");
      else status(error.message || "Error inesperado durante el escaneo.", "error");
    } finally {
      if (controller === active) { controller = null; busy(false); }
    }
  }

  function updateRoute() {
    const tag = tagFromUrl();
    const key = tag === null ? "" : location.pathname + "|" + tag;
    if (key === currentRoute) return;
    version++;
    controller?.abort();
    currentRoute = key;
    if (!tag) { panel()?.remove(); return; }
    createPanel(tag);
  }

  function start() {
    updateRoute();
    observer = new MutationObserver(() => {
      updateRoute();
      if (tagFromUrl() && !panel() && document.body) createPanel(tagFromUrl());
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    routeTimer = setInterval(updateRoute, 700);
  }

  window.addEventListener("pagehide", () => {
    controller?.abort();
    observer?.disconnect();
    clearInterval(routeTimer);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else start();
})();
