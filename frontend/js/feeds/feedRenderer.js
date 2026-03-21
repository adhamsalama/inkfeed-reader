// Feed Renderer (saved feeds list and article list)

var FeedRenderer = {
    renderSavedFeeds: function() {
        var list = document.getElementById("saved-feeds-list");
        var feeds = SavedFeedsManager.getSavedFeeds();

        list.innerHTML = "";

        if (feeds.length === 0) {
            var emptyMsg = document.createElement("li");
            emptyMsg.className = "saved-feed-item";
            setText(emptyMsg, "No saved feeds");
            list.appendChild(emptyMsg);
            return;
        }

        for (var i = 0; i < feeds.length; i++) {
            var feed = feeds[i];

            var li = document.createElement("li");
            li.className = "saved-feed-item";

            var link = document.createElement("a");
            link.className = "saved-feed-link";
            setText(link, feed.title || feed.url);
            link.title = feed.url;
            // Use closure to capture url
            (function (url) {
                link.onclick = function () {
                    SavedFeedsManager.loadSavedFeed(url);
                    return false;
                };
            })(feed.url);

            // Up arrow button
            var upBtn = document.createElement("button");
            upBtn.className = "secondary delete-feed-btn";
            setText(upBtn, "^");
            upBtn.title = "Move up";
            (function (index) {
                upBtn.onclick = function () {
                    SavedFeedsManager.moveFeed(index, -1);
                    return false;
                };
            })(i);

            // Down arrow button
            var downBtn = document.createElement("button");
            downBtn.className = "secondary delete-feed-btn";
            setText(downBtn, "v");
            downBtn.title = "Move down";
            (function (index) {
                downBtn.onclick = function () {
                    SavedFeedsManager.moveFeed(index, 1);
                    return false;
                };
            })(i);

            var deleteBtn = document.createElement("button");
            deleteBtn.className = "secondary delete-feed-btn";
            setText(deleteBtn, "X");
            deleteBtn.title = "Delete";
            // Use closure to capture url
            (function (url) {
                deleteBtn.onclick = function () {
                    SavedFeedsManager.deleteFeed(url);
                    return false;
                };
            })(feed.url);

            li.appendChild(link);
            li.appendChild(upBtn);
            li.appendChild(downBtn);
            li.appendChild(deleteBtn);
            list.appendChild(li);
        }
    },

    renderSuggestedFeeds: function() {
        var container = document.getElementById("suggested-feeds-container");
        container.innerHTML = "";

        for (var i = 0; i < SUGGESTED_FEEDS.length; i++) {
            var section = SUGGESTED_FEEDS[i];

            var block = document.createElement("div");
            block.className = "suggested-feeds-section-block";

            var heading = document.createElement("h4");
            heading.className = "suggested-feeds-category";
            setText(heading, section.category);

            var loadAllBtn = document.createElement("button");
            loadAllBtn.className = "secondary load-all-btn";
            setText(loadAllBtn, "Load All");
            (function(feeds, name) {
                loadAllBtn.onclick = function() {
                    addClass(document.getElementById("suggested-feeds-section"), "hidden");
                    loadCategoryFeeds(feeds, name);
                    return false;
                };
            })(section.feeds, section.category);

            heading.appendChild(loadAllBtn);
            block.appendChild(heading);

            var ul = document.createElement("ul");
            ul.className = "saved-feeds-list";

            for (var j = 0; j < section.feeds.length; j++) {
                var feed = section.feeds[j];

                var li = document.createElement("li");
                li.className = "saved-feed-item";

                var link = document.createElement("a");
                link.className = "saved-feed-link";
                setText(link, feed.title);
                link.title = feed.url;
                (function(url) {
                    link.onclick = function() {
                        var feedInput = document.getElementById("feed-url");
                        feedInput.value = url;
                        addClass(document.getElementById("suggested-feeds-section"), "hidden");
                        loadFeed();
                        return false;
                    };
                })(feed.url);

                li.appendChild(link);
                ul.appendChild(li);
            }

            block.appendChild(ul);
            container.appendChild(block);
        }
    },

    renderArticleList: function(articles) {
        try {
            var list = document.getElementById("article-list");
            var progress = document.getElementById("render-progress");
            var total = articles.length;

            list.innerHTML = "";
            setText(progress, "");

            var fragment = document.createDocumentFragment();
            var lastFeedTitle = null;

            for (var i = 0; i < articles.length; i++) {
                var article = articles[i];

                if (article.feedTitle && article.feedTitle !== lastFeedTitle) {
                    var separator = document.createElement("li");
                    separator.className = "feed-separator";
                    setText(separator, article.feedTitle);
                    fragment.appendChild(separator);
                    lastFeedTitle = article.feedTitle;
                }

                var li = document.createElement("li");
                li.className = "article-item" + (article.link && AppState.readArticles.has(article.link) ? " article-read" : "");
                li.id = "article-" + i;
                (function (index) {
                    li.onclick = function () {
                        ArticleViewer.openArticle(index);
                        return false;
                    };
                })(i);

                var titleRow = document.createElement("div");
                titleRow.className = "article-title-row";

                var title = document.createElement("span");
                title.className = "article-title";
                setText(title, article.title);

                titleRow.appendChild(title);

                if (article.pubDate) {
                    var date = new Date(article.pubDate);
                    var dateText = isNaN(date.getTime())
                        ? article.pubDate
                        : (date.getDate() < 10 ? "0" + date.getDate() : "" + date.getDate()) + "-" +
                          (date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : "" + (date.getMonth() + 1)) + "-" +
                          ("" + date.getFullYear()).slice(2);
                    var meta = document.createElement("span");
                    meta.className = "article-meta";
                    setText(meta, dateText);
                    titleRow.appendChild(meta);
                }

                var desc = document.createElement("div");
                desc.className = "article-description";
                // Strip HTML and truncate
                var tempDiv = document.createElement("div");
                tempDiv.innerHTML = article.description;
                var plainText = getText(tempDiv);
                var truncated = plainText.substring(0, 200);
                if (plainText.length > 200) truncated += "...";
                setText(desc, truncated);

                li.appendChild(titleRow);
                if (getText(desc)) li.appendChild(desc);
                fragment.appendChild(li);

            }

            list.appendChild(fragment);
            setText(progress, "(" + total + ")");

            // Scroll to article if returning to feed after page refresh
            var scrollTarget = AppState.pendingScrollTarget;
            if (scrollTarget) {
                AppState.pendingScrollTarget = "";
                var targetEl = document.getElementById(scrollTarget);
                if (targetEl && targetEl.scrollIntoView) {
                    targetEl.scrollIntoView();
                }
            }
        } catch (e) {
            alert("renderArticleList error: " + e.message);
        }
    }
};
