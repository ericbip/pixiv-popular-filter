"use strict";

globalThis.PPF_CONFIG = Object.freeze({
  // [no verificado] Endpoint interno de búsqueda de Pixiv.
  SEARCH_PATH: "/ajax/search/illustrations/",
  // [no verificado] Endpoint interno de detalle de una obra.
  DETAIL_PATH: "/ajax/illust/",
  SEARCH_TYPE: "illust_and_ugoira",
  SEARCH_ORDER: "date_d",
  SEARCH_MODE: "all",
  SEARCH_TAG_MODE: "s_tag_full",
  // [no verificado] Tamaño de página actual.
  PAGE_SIZE: 60,
  MAX_PAGES: 10,
  MAX_CONCURRENT: 3,
  BATCH_DELAY_MS: 400,
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  CACHE_PREFIX: "ppf:v1:",
  // [no verificado] Campos de respuesta; comprobar en DevTools.
  SEARCH_ITEMS_PATH: ["body", "illust", "data"],
  SEARCH_ITEMS_FALLBACK_PATH: ["body", "illustManga", "data"],
  SEARCH_ID_FIELD: "illustId",
  SEARCH_TITLE_FIELD: "illustTitle",
  SEARCH_THUMB_FIELD: "url",
  DETAIL_LIKES_FIELD: "likeCount",
  DETAIL_TITLE_FIELD: "title",
  DETAIL_URLS_FIELD: "urls",
  DETAIL_THUMB_FIELD: "small",
  REQUEST_TIMEOUT_MS: 20000
});
