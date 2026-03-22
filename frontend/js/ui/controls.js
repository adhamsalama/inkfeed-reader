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
    PreferencesSync.pushPrefs();
}

function adjustSpacing(delta) {
    AppState.currentLetterSpacing = Math.max(
        AppConfig.MIN_LETTER_SPACING,
        Math.min(AppConfig.MAX_LETTER_SPACING, AppState.currentLetterSpacing + delta)
    );
    applyContentStyles();
    localStorage.setItem("letterSpacing", AppState.currentLetterSpacing);
    PreferencesSync.pushPrefs();
}

function adjustLineHeight(delta) {
    AppState.currentLineHeight = Math.max(
        AppConfig.MIN_LINE_HEIGHT,
        Math.min(AppConfig.MAX_LINE_HEIGHT, AppState.currentLineHeight + delta)
    );
    applyContentStyles();
    localStorage.setItem("lineHeight", AppState.currentLineHeight);
    PreferencesSync.pushPrefs();
}

function updateBackendToggleBtn() {
    var btn = document.getElementById("use-backend-btn");
    if (!btn) { return; }
    if (AppConfig.USE_BACKEND) {
        btn.textContent = "Backend: ON";
        btn.className = "";
    } else {
        btn.textContent = "Backend: OFF";
        btn.className = "secondary";
    }
}

function toggleUseBackend() {
    if (!AppConfig.BACKEND_URL) {
        openSettings("backend");
        return;
    }
    AppConfig.USE_BACKEND = !AppConfig.USE_BACKEND;
    localStorage.setItem("backendEnabled", AppConfig.USE_BACKEND ? "true" : "false");
    updateBackendToggleBtn();
    setEmailButtonVisible(AppConfig.USE_BACKEND);
}

function toggleEpubEmbedImages() {
    AppConfig.EPUB_EMBED_IMAGES = document.getElementById("epub-embed-images-checkbox").checked;
    localStorage.setItem("epubEmbedImages", AppConfig.EPUB_EMBED_IMAGES ? "true" : "false");
    PreferencesSync.pushPrefs();
}

function openSettings(section) {
    document.getElementById("proxy-url-input").value = AppConfig.CORS_PROXY_URL;
    document.getElementById("backend-url-input").value = AppConfig.BACKEND_URL;
    document.getElementById("email-to-input").value = localStorage.getItem("lastEmailTo") || "";
    document.getElementById("epub-embed-images-checkbox").checked = AppConfig.EPUB_EMBED_IMAGES;
    document.getElementById("settings-modal").classList.remove("hidden");
    AccountView.render();
    if (section) {
        var sectionEl = document.getElementById("settings-" + section + "-section");
        if (sectionEl) {
            var firstInput = sectionEl.getElementsByTagName("input")[0];
            if (firstInput) { firstInput.focus(); }
        }
    }
}

function closeSettings() {
    document.getElementById("settings-modal").classList.add("hidden");
}

function saveProxyUrl() {
    var input = document.getElementById("proxy-url-input");
    var url = input.value.trim();
    if (url) {
        AppConfig.CORS_PROXY_URL = url;
        localStorage.setItem("corsProxyUrl", url);
        PreferencesSync.pushPrefs();
    }
    closeSettings();
}

function saveBackendUrl() {
    var input = document.getElementById("backend-url-input");
    var url = input.value.replace(/^\s+|\s+$/g, "").replace(/\/+$/, "");
    if (url) {
        AppConfig.BACKEND_URL = url;
        AppConfig.USE_BACKEND = true;
        localStorage.setItem("backendUrl", url);
        localStorage.setItem("backendEnabled", "true");
    }
    closeSettings();
    updateBackendToggleBtn();
    setEmailButtonVisible(AppConfig.USE_BACKEND);
}

function clearBackendUrl() {
    AppConfig.BACKEND_URL = "";
    AppConfig.USE_BACKEND = false;
    localStorage.removeItem("backendUrl");
    localStorage.removeItem("backendEnabled");
    document.getElementById("backend-url-input").value = "";
    closeSettings();
    updateBackendToggleBtn();
    setEmailButtonVisible(false);
}

function saveEmailAddress() {
    var input = document.getElementById("email-to-input");
    var email = input.value.replace(/^\s+|\s+$/g, "");
    if (email) {
        localStorage.setItem("lastEmailTo", email);
        PreferencesSync.pushPrefs();
    }
    closeSettings();
}

function setEmailButtonVisible(visible) {
    var emailRow = document.getElementById("email-row");
    if (emailRow) {
        emailRow.style.display = visible ? "" : "none";
    }
    var emailAllRow = document.getElementById("email-all-row");
    if (emailAllRow) {
        emailAllRow.style.display = visible ? "" : "none";
    }
}

var _pendingEmailFormat = "epub";

function openEmailInput(format) {
    _pendingEmailFormat = format || "epub";
    var to = localStorage.getItem("lastEmailTo") || "";
    if (!to) {
        openSettings("email");
        return;
    }
    if (AppState.currentArticleIndex < 0) {
        alert("No article selected");
        return;
    }
    var article = AppState.currentArticles[AppState.currentArticleIndex];
    if (!article.link) {
        alert("Article has no link");
        return;
    }
    var feedTitle = getText(document.getElementById("feed-title")) || "";
    var statusEl = document.getElementById("email-send-status");
    statusEl.textContent = "Sending...";
    BackendClient.sendEmail(article.link, to, format, feedTitle, article.comments || "", function(error) {
        if (error) {
            statusEl.textContent = "Error: " + error.message;
        } else {
            statusEl.textContent = "Sent!";
            setTimeout(function() { statusEl.textContent = ""; }, 3000);
        }
    });
}

function closeEmailInput() {
    closeSettings();
}

// Initialize on load.
(function() {
    updateBackendToggleBtn();
    setEmailButtonVisible(AppConfig.USE_BACKEND);
})();
