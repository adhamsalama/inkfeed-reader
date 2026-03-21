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
            applyContentStyles();

            // Load read articles from localStorage
            try {
                var savedReadArticles = JSON.parse(localStorage.getItem("readArticles") || "[]");
                for (var ri = 0; ri < savedReadArticles.length; ri++) {
                    AppState.readArticles.add(savedReadArticles[ri]);
                }
            } catch (e) {}

            // Render saved feeds from localStorage
            FeedRenderer.renderSavedFeeds();

            // Initialize event handlers
            initEventHandlers();

            // Initialize scroll controls
            initScrollControls();

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
                toggleSuggestedFeeds();
            }
        } catch (e) {
            alert("init error: " + e.message);
        }
    }

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
