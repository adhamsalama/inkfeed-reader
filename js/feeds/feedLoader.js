// RSS/Atom Feed Loader

var archiveOffset = 0;
var archivePageSize = 50;
var archiveArticles = [];

function resetArchiveState() {
    archiveOffset = 0;
    archiveArticles = [];
    var archiveList = document.getElementById("archive-article-list");
    if (archiveList) archiveList.innerHTML = "";
    addClass(document.getElementById("archive-load-more"), "hidden");
    var btn = document.getElementById("show-archive-btn");
    if (btn) {
        addClass(btn, "hidden");
        btn.onclick = showFeedArchive;
        setText(btn, "Archived");
    }
    addClass(document.getElementById("archive-loading"), "hidden");
    addClass(document.getElementById("feed-archive-section"), "hidden");
    removeClass(document.getElementById("article-list"), "hidden");
}

function showLiveFeed() {
    addClass(document.getElementById("feed-archive-section"), "hidden");
    removeClass(document.getElementById("article-list"), "hidden");
    var btn = document.getElementById("show-archive-btn");
    btn.onclick = showFeedArchive;
    setText(btn, "Archived");
}

function showFeedArchive() {
    if (!AuthState.isLoggedIn()) return;
    archiveOffset = 0;
    archiveArticles = [];
    document.getElementById("archive-article-list").innerHTML = "";
    addClass(document.getElementById("archive-load-more"), "hidden");
    // Hide live feed, show archive section
    addClass(document.getElementById("article-list"), "hidden");
    removeClass(document.getElementById("feed-archive-section"), "hidden");
    var btn = document.getElementById("show-archive-btn");
    btn.onclick = showLiveFeed;
    setText(btn, "Live");
    loadArchivePage();
}

function loadMoreArchive() {
    if (!AppConfig.USE_BACKEND) return;
    loadArchivePage();
}

function loadArchivePage() {
    var feedUrl = AppState.lastLoadedFeedUrl;
    if (!feedUrl) return;

    removeClass(document.getElementById("archive-loading"), "hidden");
    addClass(document.getElementById("archive-load-more"), "hidden");

    BackendClient.fetchFeedArchive(feedUrl, archivePageSize, archiveOffset, function(error, data) {
        addClass(document.getElementById("archive-loading"), "hidden");
        if (error || !data || !data.articles) return;

        var newArticles = data.articles;
        for (var i = 0; i < newArticles.length; i++) {
            newArticles[i].index = archiveArticles.length;
            archiveArticles.push(newArticles[i]);
        }

        archiveOffset += newArticles.length;

        renderArchiveArticles(newArticles);

        if (data.hasMore) {
            removeClass(document.getElementById("archive-load-more"), "hidden");
        }
    });
}

function renderArchiveArticles(articles) {
    try {
        if (!articles || typeof articles.length !== "number") return;

        var list = document.getElementById("archive-article-list");
        if (!list) return;
        
        var fragment = document.createDocumentFragment();
        if (!fragment) return;

        for (var i = 0; i < articles.length; i++) {
            var article = articles[i];
            if (!article) continue;

            var li = document.createElement("li");
            if (!li || typeof li.className !== "string") continue;
            
            // Safe check for readArticles Set
            var isRead = false;
            if (article.link && typeof AppState !== "undefined" && 
                AppState.readArticles && typeof AppState.readArticles.has === "function") {
                try {
                    isRead = AppState.readArticles.has(article.link);
                } catch (e) {
                    // Ignore Set.has errors
                }
            }
            
            li.className = "article-item" + (isRead ? " article-read" : "");
            li.id = "archive-article-" + (article.index || i);
            
            (function(idx) {
                li.onclick = function() {
                    if (typeof AppState !== "undefined" && typeof ArticleViewer !== "undefined" && 
                        typeof ArticleViewer.openArticle === "function") {
                        AppState.currentArticles = [archiveArticles[idx]];
                        ArticleViewer.openArticle(0);
                    }
                    return false;
                };
            })(article.index || i);

            var titleRow = document.createElement("div");
            if (!titleRow || typeof titleRow.className !== "string") continue;
            titleRow.className = "article-title-row";

            var title = document.createElement("span");
            if (!title || typeof title.className !== "string") continue;
            title.className = "article-title";
            setText(title, article.title || "Untitled");
            titleRow.appendChild(title);

            if (article.pubDate) {
                try {
                    var date = new Date(article.pubDate);
                    var dateText = isNaN(date.getTime())
                        ? article.pubDate
                        : (date.getDate() < 10 ? "0" + date.getDate() : "" + date.getDate()) + "-" +
                          (date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : "" + (date.getMonth() + 1)) + "-" +
                          ("" + date.getFullYear()).slice(2);
                    var meta = document.createElement("span");
                    if (meta && typeof meta.className === "string") {
                        meta.className = "article-meta";
                        setText(meta, dateText);
                        titleRow.appendChild(meta);
                    }
                } catch (e) {
                    // Ignore date errors
                }
            }

            var desc = document.createElement("div");
            if (desc && typeof desc.className === "string") {
                desc.className = "article-description";
                if (article.description) {
                    try {
                        var tempDiv = document.createElement("div");
                        if (tempDiv) {
                            tempDiv.innerHTML = article.description;
                            var plainText = getText(tempDiv);
                            if (plainText) {
                                var truncated = plainText.substring(0, 200);
                                if (plainText.length > 200) truncated += "...";
                                setText(desc, truncated);
                            }
                        }
                    } catch (e) {
                        // Ignore description errors
                    }
                }

                li.appendChild(titleRow);
                if (getText(desc)) li.appendChild(desc);
            }

            fragment.appendChild(li);
        }

        list.appendChild(fragment);
    } catch (e) {
        if (typeof console !== "undefined" && console.error) {
            console.error("renderArchiveArticles error:", e && e.message ? e.message : e);
        }
    }
}

function parseFeedXml(xmlText) {
    var xml;
    if (window.DOMParser) {
        var parser = new DOMParser();
        xml = parser.parseFromString(xmlText, "text/xml");
    } else {
        xml = new ActiveXObject("Microsoft.XMLDOM");
        xml.async = false;
        xml.loadXML(xmlText);
    }

    var articles = [];
    var feedTitle = "Feed";
    var i, item, entry, titleEl, linkEl, descEl, contentEl, pubDateEl;

    // Try RSS 2.0
    var channels = xml.getElementsByTagName("channel");
    if (channels.length > 0) {
        var channel = channels[0];
        var channelTitle = getFirstByTag(channel, "title");
        feedTitle = channelTitle ? getText(channelTitle) : "RSS Feed";

        var items = xml.getElementsByTagName("item");
        for (i = 0; i < items.length; i++) {
            item = items[i];
            titleEl = getFirstByTag(item, "title");
            linkEl = getFirstByTag(item, "link");
            descEl = getFirstByTag(item, "description");
            contentEl = getFirstByTag(item, "encoded");
            pubDateEl = getFirstByTag(item, "pubDate");
            var commentsEl = getFirstByTag(item, "comments");

            articles.push({
                index: i,
                title: titleEl ? getText(titleEl) : "Untitled",
                link: linkEl ? getText(linkEl) : "",
                comments: commentsEl ? getText(commentsEl) : "",
                description: descEl ? getText(descEl) : "",
                content: contentEl ? getText(contentEl) : "",
                pubDate: pubDateEl ? getText(pubDateEl) : ""
            });
        }
    }

    // Try Atom
    if (articles.length === 0) {
        var atomFeeds = xml.getElementsByTagName("feed");
        if (atomFeeds.length > 0) {
            var feedTitleEl = getFirstByTag(atomFeeds[0], "title");
            feedTitle = feedTitleEl ? getText(feedTitleEl) : "Atom Feed";
        }

        var entries = xml.getElementsByTagName("entry");
        for (i = 0; i < entries.length; i++) {
            entry = entries[i];
            titleEl = getFirstByTag(entry, "title");

            var linkHref = "";
            var links = entry.getElementsByTagName("link");
            for (var j = 0; j < links.length; j++) {
                var rel = links[j].getAttribute("rel");
                if (!rel || rel === "alternate") {
                    linkHref = links[j].getAttribute("href") || "";
                    break;
                }
            }

            descEl = getFirstByTag(entry, "summary");
            contentEl = getFirstByTag(entry, "content");
            pubDateEl = getFirstByTag(entry, "published");
            if (!pubDateEl) pubDateEl = getFirstByTag(entry, "updated");

            var commentsUrl = "";
            if (linkHref && linkHref.indexOf("reddit.com") >= 0) {
                commentsUrl = linkHref + "/.json";
            }

            articles.push({
                index: i,
                title: titleEl ? getText(titleEl) : "Untitled",
                link: linkHref,
                comments: commentsUrl,
                description: descEl ? getText(descEl) : "",
                content: contentEl ? getText(contentEl) : "",
                pubDate: pubDateEl ? getText(pubDateEl) : ""
            });
        }
    }

    return { title: feedTitle, articles: articles };
}

// Global function for HTML onclick handler
function loadFeed() {
    try {
        var urlInput = document.getElementById("feed-url");
        if (!urlInput) {
            if (typeof console !== "undefined" && console.log) {
                console.log("loadFeed: feed-url element not found");
            }
            return;
        }
        var url = urlInput.value;
        if (typeof url !== "string") {
            if (typeof console !== "undefined" && console.log) {
                console.log("loadFeed: urlInput.value is not a string");
            }
            return;
        }
        // Trim manually for ES3
        url = url.replace(/^\\s+|\\s+$/g, "");

        if (!url) {
            ViewManager.showError("input-error", "Please enter a feed URL");
            return;
        }

        // Save feed URL to browser URL for persistence on refresh
        if (typeof window !== "undefined" && window.history && typeof window.history.replaceState === "function") {
            try {
                window.history.replaceState(
                    null,
                    "",
                    "?feed=" + encodeURIComponent(url)
                );
            } catch (e) {
                // Fallback for older browsers - use location.hash to avoid page reload
                if (window.location) {
                    window.location.hash = "feed=" + encodeURIComponent(url);
                }
            }
        } else if (typeof window !== "undefined" && window.location) {
            window.location.hash = "feed=" + encodeURIComponent(url);
        }

        ViewManager.hideError("input-error");
        
        var feedLoadingEl = document.getElementById("feed-loading");
        if (feedLoadingEl) removeClass(feedLoadingEl, "hidden");
        
        var articleListEl = document.getElementById("article-list");
        if (articleListEl) articleListEl.innerHTML = "";
        
        resetArchiveState();
        ViewManager.showFeedView();

        if (typeof AppConfig !== "undefined" && AppConfig.USE_BACKEND) {
            if (typeof BackendClient === "undefined" || typeof BackendClient.fetchFeed !== "function") {
                ViewManager.showError("input-error", "Backend client not available");
                return;
            }
            BackendClient.fetchFeed(url, function(error, data) {
                var loadingEl = document.getElementById("feed-loading");
                if (loadingEl) addClass(loadingEl, "hidden");
                
                if (error) {
                    ViewManager.showInputView();
                    ViewManager.showError(
                        "input-error",
                        "Error loading feed: " + (error && error.message ? error.message : error)
                    );
                    return;
                }
                if (!data || !data.articles || data.articles.length === 0) {
                    ViewManager.showInputView();
                    ViewManager.showError("input-error", "Error loading feed: No articles found in feed");
                    return;
                }
                if (typeof AppState !== "undefined") {
                    AppState.currentArticles = data.articles;
                    AppState.lastLoadedFeedUrl = url;
                    AppState.lastLoadedFeedTitle = data.title || "Feed";
                }
                var titleEl = document.getElementById("feed-title");
                if (titleEl && data.title) setText(titleEl, data.title);
                if (typeof document !== "undefined" && data.title) document.title = data.title;
                if (typeof SavedFeedsManager !== "undefined" && typeof SavedFeedsManager.updateFeedTitle === "function") {
                    SavedFeedsManager.updateFeedTitle(url, data.title);
                }
                if (typeof FeedRenderer !== "undefined" && typeof FeedRenderer.renderArticleList === "function") {
                    FeedRenderer.renderArticleList(data.articles);
                }
                if (typeof AuthState !== "undefined" && typeof AuthState.isLoggedIn === "function" && 
                    typeof SavedFeedsManager !== "undefined" && typeof SavedFeedsManager.isSavedFeed === "function") {
                    if (AuthState.isLoggedIn() && SavedFeedsManager.isSavedFeed(url)) {
                        removeClass(document.getElementById("show-archive-btn"), "hidden");
                    }
                }
            });
            return;
        }

        if (typeof fetchUrl !== "function") {
            ViewManager.showError("input-error", "Feed fetcher not available");
            return;
        }
        
        fetchUrl(url, function (error, xmlText) {
            if (error) {
                ViewManager.showInputView();
                ViewManager.showError("input-error", "Error loading feed: " + (error.message || error));
                var loadingEl = document.getElementById("feed-loading");
                if (loadingEl) addClass(loadingEl, "hidden");
                return;
            }

            try {
                if (typeof parseFeedXml !== "function") {
                    throw new Error("Feed parser not available");
                }
                var parsed = parseFeedXml(xmlText);
                if (!parsed || !parsed.articles || parsed.articles.length === 0) {
                    throw new Error("No articles found in feed");
                }
                if (typeof AppState !== "undefined") {
                    AppState.currentArticles = parsed.articles;
                    AppState.lastLoadedFeedUrl = url;
                    AppState.lastLoadedFeedTitle = parsed.title || "Feed";
                }
                var titleEl = document.getElementById("feed-title");
                if (titleEl && parsed.title) setText(titleEl, parsed.title);
                if (typeof document !== "undefined" && parsed.title) document.title = parsed.title;
                if (typeof SavedFeedsManager !== "undefined" && typeof SavedFeedsManager.updateFeedTitle === "function") {
                    SavedFeedsManager.updateFeedTitle(url, parsed.title);
                }
                if (typeof FeedRenderer !== "undefined" && typeof FeedRenderer.renderArticleList === "function") {
                    FeedRenderer.renderArticleList(parsed.articles);
                }
                if (typeof AuthState !== "undefined" && typeof AuthState.isLoggedIn === "function" && 
                    typeof SavedFeedsManager !== "undefined" && typeof SavedFeedsManager.isSavedFeed === "function") {
                    if (AuthState.isLoggedIn() && SavedFeedsManager.isSavedFeed(url)) {
                        removeClass(document.getElementById("show-archive-btn"), "hidden");
                    }
                }
            } catch (e) {
                ViewManager.showInputView();
                ViewManager.showError(
                    "input-error",
                    "Error loading feed: " +
                    (e && e.message ? e.message : e)
                );
                if (typeof console !== "undefined" && console.error) {
                    console.error("Feed parse error:", e);
                }
            }

            var loadingEl = document.getElementById("feed-loading");
            if (loadingEl) addClass(loadingEl, "hidden");
        });
    } catch (e) {
        if (typeof console !== "undefined" && console.error) {
            console.error(
                "loadFeed error:",
                e && e.message ? e.message : e,
                e && e.stack ? e.stack : ""
            );
        }
        ViewManager.showError(
            "input-error",
            "Error: " + (e && e.message ? e.message : "Unknown error loading feed")
        );
    }
}

function loadCategoryFeeds(categoryFeeds, categoryName) {
    var total = categoryFeeds.length;
    var completed = 0;
    var results = [];  // indexed by feed position to preserve order
    var progress = document.getElementById("render-progress");

    for (var n = 0; n < total; n++) {
        results.push(null);
    }

    ViewManager.hideError("input-error");
    removeClass(document.getElementById("feed-loading"), "hidden");
    document.getElementById("article-list").innerHTML = "";
    ViewManager.showFeedView();
    setText(document.getElementById("feed-title"), categoryName);
    document.title = categoryName;
    setText(progress, "");

    function onFeedDone(index, articles) {
        completed++;
        results[index] = articles || [];
        setText(progress, "");

        if (completed === total) {
            addClass(document.getElementById("feed-loading"), "hidden");
            var allArticles = [];
            for (var i = 0; i < results.length; i++) {
                for (var j = 0; j < results[i].length; j++) {
                    allArticles.push(results[i][j]);
                }
            }
            if (allArticles.length === 0) {
                ViewManager.showInputView();
                ViewManager.showError("input-error", "No articles found in category feeds");
                return;
            }
            for (var k = 0; k < allArticles.length; k++) {
                allArticles[k].index = k;
            }
            AppState.currentArticles = allArticles;
            FeedRenderer.renderArticleList(allArticles);
        }
    }

    for (var i = 0; i < categoryFeeds.length; i++) {
        (function(feed, feedIndex) {
            if (AppConfig.USE_BACKEND) {
                BackendClient.fetchFeed(feed.url, function(error, data) {
                    if (error || !data || !data.articles) {
                        onFeedDone(feedIndex, null);
                    } else {
                        for (var k = 0; k < data.articles.length; k++) {
                            data.articles[k].feedTitle = data.title || feed.title;
                        }
                        onFeedDone(feedIndex, data.articles);
                    }
                });
            } else {
                fetchUrl(feed.url, function(error, xmlText) {
                    if (error) {
                        onFeedDone(feedIndex, null);
                        return;
                    }
                    try {
                        var parsed = parseFeedXml(xmlText);
                        for (var k = 0; k < parsed.articles.length; k++) {
                            parsed.articles[k].feedTitle = parsed.title || feed.title;
                        }
                        onFeedDone(feedIndex, parsed.articles.length > 0 ? parsed.articles : null);
                    } catch (e) {
                        onFeedDone(feedIndex, null);
                    }
                });
            }
        })(categoryFeeds[i], i);
    }
}
