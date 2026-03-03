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
                loadFeed(); // Auto-load the feed
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
