"use strict";

globalThis.PPF_CONFIG = Object.freeze({
  // Endpoints y campos comprobados con respuestas actuales de Pixiv.
  SEARCH_PATH: "/ajax/search/illustrations/",
  DETAIL_PATH: "/ajax/illust/",
  SEARCH_TYPE: "illust_and_ugoira",
  SEARCH_ORDER: "date_d",
  SEARCH_MODE: "all",
  SEARCH_TAG_MODE: "s_tag_full",
  PAGE_SIZE: 60,
  MAX_PAGES: 10,
  // Limita la carga sobre Pixiv y reduce el riesgo de respuestas 429.
  MAX_CONCURRENT: 3,
  BATCH_DELAY_MS: 400,
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  CACHE_PREFIX: "ppf:v1:",
  // La búsqueda devuelve body.illustManga.data con id, title y url.
  SEARCH_ITEMS_PATH: ["body", "illust", "data"],
  SEARCH_ITEMS_FALLBACK_PATH: ["body", "illustManga", "data"],
  SEARCH_ID_FIELD: "id",
  SEARCH_TITLE_FIELD: "title",
  SEARCH_THUMB_FIELD: "url",
  // El detalle devuelve body.likeCount, body.title y body.urls.small.
  DETAIL_LIKES_FIELD: "likeCount",
  DETAIL_TITLE_FIELD: "title",
  DETAIL_URLS_FIELD: "urls",
  DETAIL_THUMB_FIELD: "small",
  REQUEST_TIMEOUT_MS: 20000
});
