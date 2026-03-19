// RSS/Atom Feed Loader

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
        var url = urlInput.value;
        // Trim manually for ES3
        url = url.replace(/^\s+|\s+$/g, "");

        if (!url) {
            ViewManager.showError("input-error", "Please enter a feed URL");
            return;
        }

        // Save feed URL to browser URL for persistence on refresh
        if (window.history && window.history.replaceState) {
            window.history.replaceState(
                null,
                "",
                "?feed=" + encodeURIComponent(url)
            );
        } else {
            // Fallback for older browsers - use location.hash to avoid page reload
            window.location.hash = "feed=" + encodeURIComponent(url);
        }

        ViewManager.hideError("input-error");
        removeClass(document.getElementById("feed-loading"), "hidden");
        document.getElementById("article-list").innerHTML = "";
        ViewManager.showFeedView();

        if (AppConfig.USE_BACKEND) {
            BackendClient.fetchFeed(url, function(error, data) {
                addClass(document.getElementById("feed-loading"), "hidden");
                if (error) {
                    ViewManager.showInputView();
                    ViewManager.showError("input-error", "Error loading feed: " + error.message);
                    return;
                }
                if (!data.articles || data.articles.length === 0) {
                    ViewManager.showInputView();
                    ViewManager.showError("input-error", "Error loading feed: No articles found in feed");
                    return;
                }
                AppState.currentArticles = data.articles;
                setText(document.getElementById("feed-title"), data.title);
                document.title = data.title;
                FeedRenderer.renderArticleList(data.articles);
            });
            return;
        }

        fetchUrl(url, function (error, xmlText) {
            if (error) {
                ViewManager.showInputView();
                ViewManager.showError("input-error", "Error loading feed: " + error.message);
                addClass(document.getElementById("feed-loading"), "hidden");
                return;
            }

            try {
                var parsed = parseFeedXml(xmlText);
                if (parsed.articles.length === 0) {
                    throw new Error("No articles found in feed");
                }
                AppState.currentArticles = parsed.articles;
                setText(document.getElementById("feed-title"), parsed.title);
                document.title = parsed.title;
                FeedRenderer.renderArticleList(parsed.articles);
            } catch (e) {
                ViewManager.showInputView();
                ViewManager.showError("input-error", "Error loading feed: " + e.message);
            }

            addClass(document.getElementById("feed-loading"), "hidden");
        });
    } catch (e) {
        alert("loadFeed error: " + e.message);
    }
}

function loadCategoryFeeds(categoryFeeds, categoryName) {
    var total = categoryFeeds.length;
    var completed = 0;
    var allArticles = [];
    var progress = document.getElementById("render-progress");

    ViewManager.hideError("input-error");
    removeClass(document.getElementById("feed-loading"), "hidden");
    document.getElementById("article-list").innerHTML = "";
    ViewManager.showFeedView();
    setText(document.getElementById("feed-title"), categoryName);
    document.title = categoryName;
    setText(progress, "0/" + total);

    function onFeedDone(articles) {
        completed++;
        if (articles) {
            for (var i = 0; i < articles.length; i++) {
                allArticles.push(articles[i]);
            }
        }
        setText(progress, completed + "/" + total);

        if (completed === total) {
            addClass(document.getElementById("feed-loading"), "hidden");
            if (allArticles.length === 0) {
                ViewManager.showInputView();
                ViewManager.showError("input-error", "No articles found in category feeds");
                return;
            }
            for (var j = 0; j < allArticles.length; j++) {
                allArticles[j].index = j;
            }
            AppState.currentArticles = allArticles;
            FeedRenderer.renderArticleList(allArticles);
        }
    }

    for (var i = 0; i < categoryFeeds.length; i++) {
        (function(feed) {
            if (AppConfig.USE_BACKEND) {
                BackendClient.fetchFeed(feed.url, function(error, data) {
                    if (error || !data || !data.articles) {
                        onFeedDone(null);
                    } else {
                        for (var k = 0; k < data.articles.length; k++) {
                            data.articles[k].feedTitle = data.title || feed.title;
                        }
                        onFeedDone(data.articles);
                    }
                });
            } else {
                fetchUrl(feed.url, function(error, xmlText) {
                    if (error) {
                        onFeedDone(null);
                        return;
                    }
                    try {
                        var parsed = parseFeedXml(xmlText);
                        for (var k = 0; k < parsed.articles.length; k++) {
                            parsed.articles[k].feedTitle = parsed.title || feed.title;
                        }
                        onFeedDone(parsed.articles.length > 0 ? parsed.articles : null);
                    } catch (e) {
                        onFeedDone(null);
                    }
                });
            }
        })(categoryFeeds[i]);
    }
}
