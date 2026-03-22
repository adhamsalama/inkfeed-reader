// Preferences sync between localStorage and backend
var PreferencesSync = {
    loadFromBackend: function(callback) {
        if (!AppConfig.USE_BACKEND) {
            if (callback) { callback(); }
            return;
        }
        AuthClient.getPreferences(function(err, prefs) {
            if (err) {
                // Error — fall back to localStorage
                if (callback) { callback(); }
                return;
            }
            if (prefs === null) {
                // 401 — not logged in
                AuthState.setLoggedOut();
                if (callback) { callback(); }
                return;
            }
            // Logged in — apply preferences
            AuthState.setLoggedIn(prefs.email);

            if (prefs.fontSize) {
                AppState.currentFontSize = prefs.fontSize;
                localStorage.setItem("fontSize", prefs.fontSize);
            }
            if (typeof prefs.letterSpacing === "number") {
                AppState.currentLetterSpacing = prefs.letterSpacing;
                localStorage.setItem("letterSpacing", prefs.letterSpacing);
            }
            if (prefs.lineHeight) {
                AppState.currentLineHeight = prefs.lineHeight;
                localStorage.setItem("lineHeight", prefs.lineHeight);
            }
            if (prefs.corsProxyUrl) {
                AppConfig.CORS_PROXY_URL = prefs.corsProxyUrl;
                localStorage.setItem("corsProxyUrl", prefs.corsProxyUrl);
            }
            AppConfig.EPUB_EMBED_IMAGES = prefs.epubEmbedImages;
            localStorage.setItem("epubEmbedImages", prefs.epubEmbedImages ? "true" : "false");
            if (prefs.emailTo) {
                localStorage.setItem("emailTo", prefs.emailTo);
            }

            if (prefs.savedFeeds && prefs.savedFeeds.length > 0) {
                var feedItems = [];
                for (var i = 0; i < prefs.savedFeeds.length; i++) {
                    feedItems.push({ url: prefs.savedFeeds[i].url, title: prefs.savedFeeds[i].title });
                }
                localStorage.setItem(AppConfig.SAVED_FEEDS_KEY, JSON.stringify(feedItems));
            }

            if (prefs.feedGroups && prefs.feedGroups.length > 0) {
                localStorage.setItem("feedGroups", JSON.stringify(prefs.feedGroups));
                var groupsSection = document.getElementById("groups-section");
                if (groupsSection && groupsSection.className.indexOf("hidden") < 0) {
                    FeedRenderer.renderFeedGroups();
                }
            }

            applyContentStyles();
            if (callback) { callback(); }
        });
    },

    pushPrefs: function() {
        if (!AppConfig.USE_BACKEND || !AuthState.isLoggedIn()) { return; }
        AuthClient.putPreferences({
            fontSize: AppState.currentFontSize,
            letterSpacing: AppState.currentLetterSpacing,
            lineHeight: AppState.currentLineHeight,
            corsProxyUrl: AppConfig.CORS_PROXY_URL,
            epubEmbedImages: AppConfig.EPUB_EMBED_IMAGES,
            emailTo: localStorage.getItem("emailTo") || ""
        }, null);
    },

    pushSavedFeeds: function() {
        if (!AppConfig.USE_BACKEND || !AuthState.isLoggedIn()) { return; }
        try {
            var data = localStorage.getItem(AppConfig.SAVED_FEEDS_KEY);
            var feeds = data ? JSON.parse(data) : [];
            var payload = [];
            for (var i = 0; i < feeds.length; i++) {
                payload.push({ url: feeds[i].url, title: feeds[i].title });
            }
            AuthClient.putSavedFeeds(payload, null);
        } catch (e) {
            // Silently fail
        }
    },

    pushFeedGroups: function() {
        if (!AppConfig.USE_BACKEND || !AuthState.isLoggedIn()) { return; }
        try {
            var data = localStorage.getItem("feedGroups");
            var groups = data ? JSON.parse(data) : [];
            AuthClient.putFeedGroups(groups, null);
        } catch (e) {
            // Silently fail
        }
    },

    revertToLocalStorage: function() {
        var savedFontSize = parseFloat(localStorage.getItem("fontSize"));
        if (savedFontSize) { AppState.currentFontSize = savedFontSize; }
        var savedLetterSpacing = parseFloat(localStorage.getItem("letterSpacing"));
        if (!isNaN(savedLetterSpacing) && localStorage.getItem("letterSpacing") !== null) {
            AppState.currentLetterSpacing = savedLetterSpacing;
        }
        var savedLineHeight = parseFloat(localStorage.getItem("lineHeight"));
        if (savedLineHeight) { AppState.currentLineHeight = savedLineHeight; }
        var savedProxy = localStorage.getItem("corsProxyUrl");
        if (savedProxy) { AppConfig.CORS_PROXY_URL = savedProxy; }
        var embedImages = localStorage.getItem("epubEmbedImages");
        if (embedImages !== null) { AppConfig.EPUB_EMBED_IMAGES = embedImages !== "false"; }
        applyContentStyles();
        FeedRenderer.renderSavedFeeds();
    }
};
