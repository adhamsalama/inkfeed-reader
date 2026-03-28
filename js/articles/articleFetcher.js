// Article Fetcher with Readability

var ArticleFetcher = {
    // Fetch full article with retry logic
    fetchFullArticleWithRetry: function(url, maxRetries, callback) {
        if (AppConfig.USE_BACKEND) {
            BackendClient.fetchArticle(url, function(error, data) {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null, { title: data.title, content: data.content });
                }
            });
            return;
        }

        var attempts = 0;

        function tryFetch() {
            attempts++;
            fetchUrl(url, function(error, htmlText) {
                if (error) {
                    if (attempts < maxRetries) {
                        setTimeout(tryFetch, AppConfig.RETRY_DELAY_MS);
                    } else {
                        callback(error, null);
                    }
                    return;
                }

                try {
                    var doc;
                    if (window.DOMParser) {
                        doc = new DOMParser().parseFromString(htmlText, "text/html");
                    } else {
                        doc = document.createElement("div");
                        doc.innerHTML = htmlText;
                    }

                    var reader = new Readability(doc);
                    var extractedArticle = reader.parse();

                    if (extractedArticle) {
                        callback(null, extractedArticle);
                    } else {
                        if (attempts < maxRetries) {
                            setTimeout(tryFetch, AppConfig.RETRY_DELAY_MS);
                        } else {
                            callback(new Error("Readability could not parse article"), null);
                        }
                    }
                } catch (e) {
                    if (attempts < maxRetries) {
                        setTimeout(tryFetch, AppConfig.RETRY_DELAY_MS);
                    } else {
                        callback(e, null);
                    }
                }
            });
        }

        tryFetch();
    }
};

function buildArticleMetaHtml(byline, siteName, wordCount, publishedTime, url) {
    var html = "";
    var byline = byline ? byline.replace(/^\s+|\s+$/g, "") : "";
    var siteName = siteName ? siteName.replace(/^\s+|\s+$/g, "") : "";
    if (!siteName && url) {
        try {
            var a = document.createElement("a");
            a.href = url;
            siteName = a.hostname;
        } catch (e) {}
    }

    if (byline && siteName) {
        html += '<p class="article-meta"><em>' + escapeHtml(byline) + " @ " + escapeHtml(siteName) + "</em></p>";
    } else if (byline) {
        html += '<p class="article-meta"><em>' + escapeHtml(byline) + "</em></p>";
    } else if (siteName) {
        html += '<p class="article-meta"><em>' + escapeHtml(siteName) + "</em></p>";
    }

    if (wordCount > 0) {
        var minutes = Math.max(1, Math.floor(wordCount / 200));
        html += '<p class="article-meta"><em>' + minutes + " min read</em></p>";
    }

    if (publishedTime) {
        html += '<p class="article-meta"><em>Published: ' + escapeHtml(publishedTime) + "</em></p>";
    }

    html += '<hr style="margin: 15px 0; border: none; border-top: 1px solid #000;">';
    return html;
}

// Global function for HTML onclick handler
function fetchFullArticle() {
    try {
        if (!AppState.currentArticleUrl) {
            alert("No article URL available");
            return;
        }

        var loadingEl = document.getElementById("article-loading");
        var contentDiv = document.getElementById("article-content");
        var commentsContent = document.getElementById("comments-content");
        var commentsHtmlContent = document.getElementById("comments-html-content");

        // Hide comments views
        removeClass(commentsContent, "visible");
        removeClass(commentsHtmlContent, "visible");

        // Show article content
        addClass(contentDiv, "visible");
        removeClass(loadingEl, "hidden");

        if (AppConfig.USE_BACKEND) {
            BackendClient.fetchArticle(AppState.currentArticleUrl, function(error, data) {
                addClass(loadingEl, "hidden");
                if (error) {
                    contentDiv.innerHTML += '<p class="error">Error fetching full article: ' + escapeHtml(error.message) + "</p>";
                    return;
                }
                var article = AppState.currentArticles[AppState.currentArticleIndex];
                var resolvedTitle = data.title || article.title;
                var feedTitle = getText(document.getElementById("feed-title"));
                var titleBarText = feedTitle ? feedTitle + " \u2014 " + resolvedTitle : resolvedTitle;
                setText(document.getElementById("article-title-bar"), titleBarText);
                var favBtnHtml = AppConfig.USE_BACKEND
                    ? ' <button id="favorite-btn" class="secondary" onclick="toggleFavorite()" style="font-size:1em; vertical-align:middle">\u2606</button>'
                    : '';
                var html = "<h2>" + escapeHtml(resolvedTitle) + favBtnHtml + "</h2>";
                if (article.pubDate) {
                    html += '<p class="article-meta">' + escapeHtml(article.pubDate) + "</p>";
                }
                html += '<p><a href="' + escapeHtml(AppState.currentArticleUrl) + '" target="_blank">' + escapeHtml(AppState.currentArticleUrl) + '</a></p>';
                if (article.comments) {
                    html += '<p><a href="' + escapeHtml(article.comments) + '" target="_blank">Comments</a></p>';
                }
                html += buildArticleMetaHtml(data.byline, data.siteName, data.wordCount, data.publishedTime, AppState.currentArticleUrl);
                html += '<div class="article-body">' + data.content + "</div>";
                contentDiv.innerHTML = html;
                FavoritesManager.updateFavoriteBtn();
            });
            return;
        }

        fetchUrl(AppState.currentArticleUrl, function (error, htmlText) {
            if (error) {
                contentDiv.innerHTML +=
                    '<p class="error">Error fetching full article: ' +
                    escapeHtml(error.message) +
                    "</p>";
                addClass(loadingEl, "hidden");
                return;
            }

            try {
                var doc;
                if (window.DOMParser) {
                    doc = new DOMParser().parseFromString(htmlText, "text/html");
                } else {
                    doc = document.createElement("div");
                    doc.innerHTML = htmlText;
                }

                // Use Mozilla Readability to extract the article content
                var reader = new Readability(doc);
                var extractedArticle = reader.parse();

                var article = AppState.currentArticles[AppState.currentArticleIndex];

                if (extractedArticle) {
                    var wordCount = extractedArticle.textContent
                        ? extractedArticle.textContent.split(/\s+/).length
                        : 0;
                    var publishedTime = "";
                    if (extractedArticle.publishedTime) {
                        var d = new Date(extractedArticle.publishedTime);
                        if (!isNaN(d.getTime())) {
                            publishedTime = d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
                        }
                    }
                    var favBtnHtml = AppConfig.USE_BACKEND
                        ? ' <button id="favorite-btn" class="secondary" onclick="toggleFavorite()" style="font-size:1em; vertical-align:middle">\u2606</button>'
                        : '';
                    var html =
                        "<h2>" +
                        escapeHtml(extractedArticle.title || article.title) +
                        favBtnHtml +
                        "</h2>";
                    if (article.pubDate) {
                        html +=
                            '<p class="article-meta">' +
                            escapeHtml(article.pubDate) +
                            "</p>";
                    }
                    html +=
                        '<p><a href="' +
                        escapeHtml(AppState.currentArticleUrl) +
                        '" target="_blank">' +
                        escapeHtml(AppState.currentArticleUrl) +
                        '</a></p>';
                    if (article.comments) {
                        html +=
                            '<p><a href="' +
                            escapeHtml(article.comments) +
                            '" target="_blank">Comments</a></p>';
                    }
                    html += buildArticleMetaHtml(extractedArticle.byline, extractedArticle.siteName, wordCount, publishedTime, AppState.currentArticleUrl);
                    html +=
                        '<div class="article-body">' +
                        extractedArticle.content +
                        "</div>";
                    contentDiv.innerHTML = html;
                    FavoritesManager.updateFavoriteBtn();
                } else {
                    contentDiv.innerHTML +=
                        '<p class="error">Readability could not parse this article.</p>';
                }
            } catch (e) {
                contentDiv.innerHTML +=
                    '<p class="error">Error parsing article: ' +
                    escapeHtml(e.message) +
                    "</p>";
            }

            addClass(loadingEl, "hidden");
        });
    } catch (e) {
        alert("fetchFullArticle error: " + e.message);
    }
}
