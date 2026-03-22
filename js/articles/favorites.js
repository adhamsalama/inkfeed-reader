// Favorites Manager
var FavoritesManager = (function() {
    var FAVORITES_KEY = "favorites";

    function getFavorites() {
        try {
            var data = localStorage.getItem(FAVORITES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveFavorites(favs) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
        var favSection = document.getElementById("favorites-section");
        if (favSection && favSection.className.indexOf("hidden") < 0) {
            FeedRenderer.renderFavorites();
        }
        PreferencesSync.pushFavorites();
    }

    function isFavorited(url) {
        var favs = getFavorites();
        for (var i = 0; i < favs.length; i++) {
            if (favs[i].url === url) { return true; }
        }
        return false;
    }

    function toggleFavorite(url, title, feedTitle, pubDate, commentsUrl) {
        var favs = getFavorites();
        for (var i = 0; i < favs.length; i++) {
            if (favs[i].url === url) {
                favs.splice(i, 1);
                saveFavorites(favs);
                return;
            }
        }
        favs.unshift({ url: url, title: title, feedTitle: feedTitle, pubDate: pubDate, commentsUrl: commentsUrl || "" });
        saveFavorites(favs);
    }

    function updateFavoriteBtn() {
        var btn = document.getElementById("favorite-btn");
        if (!btn) { return; }
        var url = AppState.currentArticleUrl;
        setText(btn, url && AuthState.isLoggedIn() && isFavorited(url) ? "\u2605" : "\u2606");
    }

    return {
        getFavorites: getFavorites,
        saveFavorites: saveFavorites,
        isFavorited: isFavorited,
        toggleFavorite: toggleFavorite,
        updateFavoriteBtn: updateFavoriteBtn
    };
})();

window.toggleFavorite = function() {
    if (!AuthState.isLoggedIn()) {
        showBannerMessage("Backend mode is on but you are not logged in. Please log in.");
        return;
    }
    var url = AppState.currentArticleUrl;
    if (!url) { return; }
    var article = AppState.currentArticles[AppState.currentArticleIndex];
    var title = article ? (article.title || "") : "";
    var feedTitle = "";
    var feedTitleEl = document.getElementById("feed-title");
    if (feedTitleEl) { feedTitle = getText(feedTitleEl) || ""; }
    var pubDate = article ? (article.pubDate || "") : "";
    var commentsUrl = article ? (article.comments || "") : "";
    FavoritesManager.toggleFavorite(url, title, feedTitle, pubDate, commentsUrl);
    FavoritesManager.updateFavoriteBtn();
};
