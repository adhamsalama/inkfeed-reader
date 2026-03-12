// UI Controls for Font Size, Spacing, and Line Height

// Global functions (called from HTML onclick handlers)

function applyContentStyles() {
    var els = document.querySelectorAll(".article-content");
    for (var i = 0; i < els.length; i++) {
        els[i].style.fontSize = AppState.currentFontSize + "px";
        els[i].style.letterSpacing = AppState.currentLetterSpacing + "px";
        els[i].style.wordSpacing = AppState.currentLetterSpacing * 2 + "px";
        els[i].style.lineHeight = AppState.currentLineHeight;
    }
}

function adjustFontSize(delta) {
    AppState.currentFontSize = Math.max(
        AppConfig.MIN_FONT_SIZE,
        Math.min(AppConfig.MAX_FONT_SIZE, AppState.currentFontSize + delta)
    );
    applyContentStyles();
    localStorage.setItem("fontSize", AppState.currentFontSize);
}

function adjustSpacing(delta) {
    AppState.currentLetterSpacing = Math.max(
        AppConfig.MIN_LETTER_SPACING,
        Math.min(AppConfig.MAX_LETTER_SPACING, AppState.currentLetterSpacing + delta)
    );
    applyContentStyles();
    localStorage.setItem("letterSpacing", AppState.currentLetterSpacing);
}

function adjustLineHeight(delta) {
    AppState.currentLineHeight = Math.max(
        AppConfig.MIN_LINE_HEIGHT,
        Math.min(AppConfig.MAX_LINE_HEIGHT, AppState.currentLineHeight + delta)
    );
    applyContentStyles();
    localStorage.setItem("lineHeight", AppState.currentLineHeight);
}

function toggleProxyInput() {
    var row = document.getElementById("proxy-input-row");
    var input = document.getElementById("proxy-url-input");
    if (row.classList.contains("hidden")) {
        input.value = AppConfig.CORS_PROXY_URL;
        row.classList.remove("hidden");
        input.focus();
    } else {
        row.classList.add("hidden");
    }
}

function saveProxyUrl() {
    var input = document.getElementById("proxy-url-input");
    var url = input.value.trim();
    if (url) {
        AppConfig.CORS_PROXY_URL = url;
        localStorage.setItem("corsProxyUrl", url);
    }
    document.getElementById("proxy-input-row").classList.add("hidden");
}
