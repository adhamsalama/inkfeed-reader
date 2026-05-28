// Application Initialization (IIFE)
(function() {
    // Global error handler
    window.onerror = function (message, source, lineno, colno, error) {
        alert("Error: " + message + "\nLine: " + lineno);
        return false;
    };

    // Initialize application
    function init() {
        try {
            // Restore persisted display settings
            var savedFontSize = parseFloat(localStorage.getItem("fontSize"));
            if (savedFontSize) {
                AppState.currentFontSize = savedFontSize;
            }
            var savedLetterSpacing = parseFloat(localStorage.getItem("letterSpacing"));
            if (!isNaN(savedLetterSpacing) && localStorage.getItem("letterSpacing") !== null) {
                AppState.currentLetterSpacing = savedLetterSpacing;
            }
            var savedLineHeight = parseFloat(localStorage.getItem("lineHeight"));
            if (savedLineHeight) {
                AppState.currentLineHeight = savedLineHeight;
            }
            var savedFontFamily = localStorage.getItem("fontFamily");
            if (savedFontFamily) {
                AppState.currentFontFamily = savedFontFamily;
            }
            if (localStorage.getItem("boldText") === "true") {
                AppState.boldText = true;
            }
            applyContentStyles();
            applyBoldText();

            // Load read articles from localStorage
            try {
                var savedReadArticles = JSON.parse(localStorage.getItem("readArticles") || "[]");
                for (var ri = 0; ri < savedReadArticles.length; ri++) {
                    AppState.readArticles.add(savedReadArticles[ri]);
                }
            } catch (e) {}

            // Initialize event handlers
            initEventHandlers();

            // Initialize scroll controls
            initScrollControls();

            showBackendBanner();

            // Load preferences from backend (if logged in), then render saved feeds
            PreferencesSync.loadFromBackend(function() {
                FeedRenderer.renderSavedFeeds();
                updateFavoritesButtonVisibility();

                // Populate input from URL parameter if present (check query string first, then hash)
                var feedInput = document.getElementById("feed-url");
                var feedParam = getUrlParam("feed") || getHashParam("feed");
                if (feedParam) {
                    feedInput.value = feedParam;
                    // Capture article hash before replaceState strips it
                    var initialHash = window.location.hash;
                    if (initialHash && initialHash.indexOf("#article-") === 0) {
                        AppState.pendingScrollTarget = initialHash.substring(1);
                    }
                    loadFeed(); // Auto-load the feed
                } else if (!feedInput.value) {
                    var groups = FeedGroupsManager.getGroups();
                    if (groups.length > 0) {
                        toggleFeedGroups();
                    } else {
                        toggleSuggestedFeeds();
                    }
                }
            });
        } catch (e) {
            alert("init error: " + e.message);
        }
    }

    function showBackendBanner() {
        if (localStorage.getItem("backendBannerDismissed") === "true") return;
        if (AppConfig.USE_BACKEND) return;
        var banner = document.getElementById("backend-banner");
        if (banner) {
            banner.className = "backend-banner";
        }
    }

    window.toggleFavorites = function() {
        var section = document.getElementById("favorites-section");
        if (!section) { return; }
        var btn = document.getElementById("favorites-toggle-btn");
        if (section.className.indexOf("hidden") >= 0) {
            closeAllToggleSections();
            removeClass(section, "hidden");
            if (btn) { addClass(btn, "btn-active"); }
            FeedRenderer.renderFavorites();
        } else {
            deactivateToggle("favorites-section", "favorites-toggle-btn");
        }
    };

    window.updateFavoritesButtonVisibility = function() {
        var btn = document.getElementById("favorites-toggle-btn");
        if (!btn) { return; }
        var favs = FavoritesManager.getFavorites();
        if (favs.length > 0) {
            removeClass(btn, "hidden");
        } else {
            addClass(btn, "hidden");
            removeClass(btn, "btn-active");
            var section = document.getElementById("favorites-section");
            if (section) { addClass(section, "hidden"); }
        }
    };

    var _bannerTemporary = false;
    var _bannerDefaultMessage = "Sign up / Sign in and enable backend mode to email articles to yourself and save battery.";

    window.showBannerMessage = function(msg) {
        _bannerTemporary = true;
        var msgEl = document.getElementById("backend-banner-message");
        if (msgEl) { setText(msgEl, msg); }
        var banner = document.getElementById("backend-banner");
        if (banner) { banner.className = "backend-banner"; }
    };

    window.dismissBackendBanner = function() {
        var banner = document.getElementById("backend-banner");
        if (banner) { banner.className = "backend-banner hidden"; }
        if (_bannerTemporary) {
            _bannerTemporary = false;
            var msgEl = document.getElementById("backend-banner-message");
            if (msgEl) { setText(msgEl, _bannerDefaultMessage); }
        } else {
            localStorage.setItem("backendBannerDismissed", "true");
        }
    };

    // Run init when DOM is ready
    try {
        if (
            document.readyState === "complete" ||
            document.readyState === "interactive"
        ) {
            init();
        } else if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", init);
        } else if (document.attachEvent) {
            document.attachEvent("onreadystatechange", function () {
                if (document.readyState === "complete") {
                    init();
                }
            });
        }
    } catch (e) {
        alert("Startup error: " + e.message);
    }
})();
