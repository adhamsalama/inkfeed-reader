// Saved Feeds Management (LocalStorage)

var SavedFeedsManager = {
    getSavedFeeds: function() {
        try {
            if (!window.localStorage) return [];
            var data = localStorage.getItem(AppConfig.SAVED_FEEDS_KEY);
            if (!data) return [];
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    },

    saveCurrentFeed: function() {
        try {
            if (!window.localStorage) {
                alert("localStorage not available");
                return;
            }
            var feedInput = document.getElementById("feed-url");
            var url = feedInput.value.replace(/^\s+|\s+$/g, "");
            if (!url) {
                alert("Please enter a feed URL first");
                return;
            }

            var feeds = this.getSavedFeeds();
            // Check if already exists
            for (var i = 0; i < feeds.length; i++) {
                if (feeds[i].url === url) {
                    return;
                }
            }
            // Add new feed
            feeds.push({url: url, title: url});
            localStorage.setItem(AppConfig.SAVED_FEEDS_KEY, JSON.stringify(feeds));
            FeedRenderer.renderSavedFeeds();
        } catch (e) {
            alert("Error saving feed: " + e.message);
        }
    },

    deleteFeed: function(url) {
        try {
            if (!window.localStorage) return;
            var feeds = this.getSavedFeeds();
            var newFeeds = [];
            for (var i = 0; i < feeds.length; i++) {
                if (feeds[i].url !== url) {
                    newFeeds.push(feeds[i]);
                }
            }
            localStorage.setItem(AppConfig.SAVED_FEEDS_KEY, JSON.stringify(newFeeds));
            FeedRenderer.renderSavedFeeds();
        } catch (e) {
            // Silently fail
        }
    },

    moveFeed: function(index, direction) {
        try {
            if (!window.localStorage) return;
            var feeds = this.getSavedFeeds();
            var newIndex = index + direction;
            if (newIndex < 0 || newIndex >= feeds.length) return;
            // Swap feeds
            var temp = feeds[index];
            feeds[index] = feeds[newIndex];
            feeds[newIndex] = temp;
            localStorage.setItem(AppConfig.SAVED_FEEDS_KEY, JSON.stringify(feeds));
            FeedRenderer.renderSavedFeeds();
        } catch (e) {
            // Silently fail
        }
    },

    loadSavedFeed: function(url) {
        var feedInput = document.getElementById("feed-url");
        feedInput.value = url;
        // Hide saved feeds list
        addClass(document.getElementById("saved-feeds-section"), "hidden");
        loadFeed();
    },

    toggleSavedFeeds: function() {
        var section = document.getElementById("saved-feeds-section");
        if (section.className.indexOf("hidden") >= 0) {
            removeClass(section, "hidden");
        } else {
            addClass(section, "hidden");
        }
    }
};

// Global proxy functions for HTML onclick handlers
function saveCurrentFeed() {
    SavedFeedsManager.saveCurrentFeed();
}

function toggleSavedFeeds() {
    SavedFeedsManager.toggleSavedFeeds();
}
