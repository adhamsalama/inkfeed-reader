// View Management

var ViewManager = {
    showInputView: function() {
        var inputView = document.getElementById("input-view");
        var feedView = document.getElementById("feed-view");
        var articleView = document.getElementById("article-view");
        if (inputView) addClass(inputView, "active");
        if (feedView) removeClass(feedView, "active");
        if (articleView) removeClass(articleView, "active");
    },

    showFeedView: function() {
        var inputView = document.getElementById("input-view");
        var feedView = document.getElementById("feed-view");
        var articleView = document.getElementById("article-view");
        if (inputView) removeClass(inputView, "active");
        if (feedView) addClass(feedView, "active");
        if (articleView) removeClass(articleView, "active");
        if (typeof AppState !== "undefined" && AppState.currentArticleIndex >= 0) {
            var articleEl = document.getElementById(
                "article-" + AppState.currentArticleIndex
            );
            if (articleEl && typeof articleEl.scrollIntoView === "function") {
                try {
                    articleEl.scrollIntoView();
                } catch (e) {
                    // Ignore scrollIntoView errors on older browsers
                }
            }
        }
    },

    showArticleView: function() {
        var inputView = document.getElementById("input-view");
        var feedView = document.getElementById("feed-view");
        var articleView = document.getElementById("article-view");
        if (inputView) removeClass(inputView, "active");
        if (feedView) removeClass(feedView, "active");
        if (articleView) addClass(articleView, "active");
    },

    showError: function(elementId, message) {
        if (!elementId) return;
        var el = document.getElementById(elementId);
        if (!el) return;
        setText(el, message);
        removeClass(el, "hidden");
    },

    hideError: function(elementId) {
        if (!elementId) return;
        var el = document.getElementById(elementId);
        if (!el) return;
        addClass(el, "hidden");
    }
};

// Global proxy function for HTML onclick handler
function showFeedView() {
    ViewManager.showFeedView();
}
