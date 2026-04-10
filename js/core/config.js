// Application Configuration
var AppConfig = {
    SAVED_FEEDS_KEY: "savedFeeds",

    // CORS proxy
    CORS_PROXY_URL: "https://throbbing-morning-e187.adhamsalama.workers.dev?url=",

    // Backend
    USE_BACKEND: false,
    BACKEND_URL: "https://api.inkfeed.xyz",

    // Font size constraints
    MIN_FONT_SIZE: 12,
    MAX_FONT_SIZE: 32,

    // Spacing constraints
    MIN_LETTER_SPACING: -1,
    MAX_LETTER_SPACING: 5,

    // Line height constraints
    MIN_LINE_HEIGHT: 1,
    MAX_LINE_HEIGHT: 3,

    // Retry configuration
    MAX_FETCH_RETRIES: 3,
    RETRY_DELAY_MS: 1000,

    // Comments configuration
    MAX_TOP_LEVEL_COMMENTS: 100,
    MAX_REPLIES_PER_COMMENT: 50,

    // EPUB options
    EPUB_EMBED_IMAGES: true,
};

(function() {
    var saved = safeGet("corsProxyUrl");
    if (saved) {
        AppConfig.CORS_PROXY_URL = saved;
    }
    var backendEnabled = safeGet("backendEnabled");
    if (backendEnabled !== null) {
        AppConfig.USE_BACKEND = backendEnabled === "true";
    }
    var embedImages = safeGet("epubEmbedImages");
    if (embedImages !== null) {
        AppConfig.EPUB_EMBED_IMAGES = embedImages !== "false";
    }
})();
