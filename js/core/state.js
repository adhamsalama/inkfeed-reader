// Global Application State

// Set polyfill for older browsers (like Kindle 7)
function createSetPolyfill() {
    // Try to use native Set if available
    if (typeof Set !== "undefined") {
        try {
            return new Set();
        } catch (e) {
            // Set constructor failed, fall through to polyfill
        }
    }
    
    // Polyfill implementation using plain object
    var store = {};
    return {
        has: function(key) {
            return store.hasOwnProperty(key);
        },
        add: function(key) {
            store[key] = true;
            return this;
        },
        delete: function(key) {
            delete store[key];
            return true;
        },
        clear: function() {
            store = {};
        },
        forEach: function(callback, thisArg) {
            for (var key in store) {
                if (store.hasOwnProperty(key)) {
                    callback.call(thisArg, key, key, this);
                }
            }
        }
    };
}

var AppState = {
    currentFontSize: 16,
    currentLetterSpacing: 0,
    currentLineHeight: 1.5,
    currentArticles: [],
    currentArticleIndex: -1,
    currentArticleUrl: "",
    pendingScrollTarget: "",
    readArticles: createSetPolyfill(),
    lastLoadedFeedUrl: "",
    lastLoadedFeedTitle: ""
};

// Article selection state
var ArticleSelectionState = {
    downloadType: null,  // 'text' or 'mobi'
    selectedIndices: createSetPolyfill(),
    inSelectionMode: false
};