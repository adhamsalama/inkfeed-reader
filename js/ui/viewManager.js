// View Management

var ViewManager = {
    showInputView: function() {
        addClass(document.getElementById("input-view"), "active");
        removeClass(document.getElementById("feed-view"), "active");
        removeClass(document.getElementById("article-view"), "active");
        removeClass(document.getElementById("account-view"), "active");
    },

    showFeedView: function() {
        removeClass(document.getElementById("input-view"), "active");
        addClass(document.getElementById("feed-view"), "active");
        removeClass(document.getElementById("article-view"), "active");
        removeClass(document.getElementById("account-view"), "active");
        if (AppState.currentArticleIndex >= 0) {
            var articleEl = document.getElementById(
                "article-" + AppState.currentArticleIndex
            );
            if (articleEl) {
                articleEl.scrollIntoView();
            }
        }
    },

    showArticleView: function() {
        removeClass(document.getElementById("input-view"), "active");
        removeClass(document.getElementById("feed-view"), "active");
        addClass(document.getElementById("article-view"), "active");
        removeClass(document.getElementById("account-view"), "active");
    },

    showAccountView: function() {
        removeClass(document.getElementById("input-view"), "active");
        removeClass(document.getElementById("feed-view"), "active");
        removeClass(document.getElementById("article-view"), "active");
        addClass(document.getElementById("account-view"), "active");
        AccountView.render();
    },

    showError: function(elementId, message) {
        var el = document.getElementById(elementId);
        setText(el, message);
        removeClass(el, "hidden");
    },

    hideError: function(elementId) {
        addClass(document.getElementById(elementId), "hidden");
    }
};

// Global proxy function for HTML onclick handler
function showFeedView() {
    ViewManager.showFeedView();
}
