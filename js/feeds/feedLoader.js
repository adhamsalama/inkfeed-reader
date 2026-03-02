// RSS/Atom Feed Loader

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

        fetchUrl(url, function (error, xmlText) {
            if (error) {
                ViewManager.showInputView();
                ViewManager.showError("input-error", "Error loading feed: " + error.message);
                addClass(document.getElementById("feed-loading"), "hidden");
                return;
            }

            try {
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
                var progress = document.getElementById("render-progress");
                var i, item, entry, titleEl, linkEl, descEl, contentEl, pubDateEl;

                // Try RSS 2.0
                var channels = xml.getElementsByTagName("channel");
                if (channels.length > 0) {
                    var channel = channels[0];
                    var channelTitle = getFirstByTag(channel, "title");
                    feedTitle = channelTitle ? getText(channelTitle) : "RSS Feed";

                    var items = xml.getElementsByTagName("item");
                    var total = items.length;
                    setText(progress, "0/" + total);

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
                        setText(progress, i + 1 + "/" + total);
                    }
                }

                // Try Atom
                if (articles.length === 0) {
                    var feeds = xml.getElementsByTagName("feed");
                    if (feeds.length > 0) {
                        var feedTitleEl = getFirstByTag(feeds[0], "title");
                        feedTitle = feedTitleEl ? getText(feedTitleEl) : "Atom Feed";
                    }

                    var entries = xml.getElementsByTagName("entry");
                    var totalEntries = entries.length;
                    setText(progress, "0/" + totalEntries);

                    for (i = 0; i < entries.length; i++) {
                        entry = entries[i];
                        titleEl = getFirstByTag(entry, "title");

                        // Get link href attribute
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

                        // For Reddit feeds, the link is the comments page
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
                        setText(progress, i + 1 + "/" + totalEntries);
                    }
                }

                if (articles.length === 0) {
                    throw new Error("No articles found in feed");
                }

                AppState.currentArticles = articles;
                setText(document.getElementById("feed-title"), feedTitle);
                document.title = feedTitle;
                FeedRenderer.renderArticleList(articles);
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
