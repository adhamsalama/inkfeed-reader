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

    renderArticleList: function(articles) {
        try {
            var list = document.getElementById("article-list");
            var progress = document.getElementById("render-progress");
            var total = articles.length;

            list.innerHTML = "";
            setText(progress, "0/" + total);

            var fragment = document.createDocumentFragment();

            for (var i = 0; i < articles.length; i++) {
                var article = articles[i];

                var li = document.createElement("li");
                li.className = "article-item";
                li.id = "article-" + i;

                var title = document.createElement("a");
                title.className = "article-title";
                setText(title, article.title);
                // Use closure to capture index
                (function (index) {
                    title.onclick = function () {
                        ArticleViewer.openArticle(index);
                        return false;
                    };
                })(i);

                var meta = document.createElement("div");
                meta.className = "article-meta";
                if (article.pubDate) {
                    var date = new Date(article.pubDate);
                    var dateText = isNaN(date.getTime())
                        ? article.pubDate
                        : date.toLocaleDateString();
                    setText(meta, dateText);
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

                li.appendChild(title);
                if (getText(meta)) li.appendChild(meta);
                if (getText(desc)) li.appendChild(desc);
                fragment.appendChild(li);

                setText(progress, i + 1 + "/" + total);
            }

            list.appendChild(fragment);
        } catch (e) {
            alert("renderArticleList error: " + e.message);
        }
    }
};
