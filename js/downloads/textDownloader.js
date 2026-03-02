// Text Downloader

var TextDownloader = {
    // Download selected articles as text (unified, replaces duplicate "All" version)
    downloadSelectedArticles: function(selectedArticles) {
        try {
            var progressEl = document.getElementById("download-all-progress");
            removeClass(progressEl, "hidden");
            setText(progressEl, "Downloading articles: 0/" + selectedArticles.length);

            var allArticlesText = [];
            var feedTitle = getText(document.getElementById("feed-title"));
            var processedCount = 0;

            allArticlesText.push("========================================");
            allArticlesText.push(feedTitle);
            allArticlesText.push("Downloaded: " + new Date().toLocaleString());
            allArticlesText.push("Total articles: " + selectedArticles.length);
            allArticlesText.push("========================================\n\n");

            function processNextArticle(index) {
                if (index >= selectedArticles.length) {
                    addClass(progressEl, "hidden");

                    var finalText = allArticlesText.join("\n");
                    var filename = feedTitle.replace(/[^a-z0-9]/gi, "_") + "_selected_articles.txt";

                    var a = document.createElement("a");
                    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(finalText);
                    a.setAttribute("download", filename);
                    a.style.display = "none";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    alert("Downloaded " + processedCount + " articles successfully!");
                    return;
                }

                var article = selectedArticles[index];
                setText(progressEl, "Downloading articles: " + (index + 1) + "/" + selectedArticles.length + " - " + article.title);

                if (!article.link) {
                    allArticlesText.push("\n\n========================================");
                    allArticlesText.push("Article " + (index + 1) + ": " + article.title);
                    allArticlesText.push("========================================");
                    if (article.pubDate) {
                        allArticlesText.push("Published: " + article.pubDate);
                    }
                    allArticlesText.push("\n");

                    var tempDiv = document.createElement("div");
                    tempDiv.innerHTML = article.content || article.description || "";
                    allArticlesText.push(getText(tempDiv));

                    processedCount++;
                    processNextArticle(index + 1);
                    return;
                }

                ArticleFetcher.fetchFullArticleWithRetry(article.link, AppConfig.MAX_FETCH_RETRIES, function(error, extractedArticle) {
                    allArticlesText.push("\n\n========================================");
                    allArticlesText.push("Article " + (index + 1) + ": " + article.title);
                    allArticlesText.push("========================================");
                    if (article.pubDate) {
                        allArticlesText.push("Published: " + article.pubDate);
                    }
                    allArticlesText.push("Link: " + article.link);
                    allArticlesText.push("\n");

                    if (error) {
                        allArticlesText.push("[Failed to fetch full article after " + AppConfig.MAX_FETCH_RETRIES + " attempts]");
                        allArticlesText.push("\n");
                        var tempDiv = document.createElement("div");
                        tempDiv.innerHTML = article.content || article.description || "";
                        allArticlesText.push(getText(tempDiv));
                    } else {
                        var contentDiv = document.createElement("div");
                        contentDiv.innerHTML = extractedArticle.content;
                        allArticlesText.push(getText(contentDiv));
                        processedCount++;
                    }

                    processNextArticle(index + 1);
                });
            }

            processNextArticle(0);
        } catch (e) {
            alert("downloadSelectedArticlesText error: " + e.message);
            addClass(document.getElementById("download-all-progress"), "hidden");
        }
    }
};

// Global function for HTML onclick handler (single article download)
function downloadArticle() {
    try {
        var contentDiv = document.getElementById("article-content");
        var text = getText(contentDiv);
        var article = AppState.currentArticles[AppState.currentArticleIndex];
        var filename =
            (article ? article.title : "article").replace(/[^a-z0-9]/gi, "_") +
            ".txt";

        // Try data URI download
        var a = document.createElement("a");
        a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
        a.setAttribute("download", filename);
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        alert("downloadArticle error: " + e.message);
    }
}
