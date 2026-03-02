// MOBI Downloader

var MobiDownloader = {
    // Generate and download MOBI for a single article
    generateAndDownloadMobi: function(article, articleHtml, commentsHtml) {
        var htmlContent =
            "<html><body><h1>" +
            escapeHtml(article.title) +
            "</h1>" +
            articleHtml;

        if (commentsHtml) {
            htmlContent += "<hr/><h2>Comments</h2>" + commentsHtml;
        }

        htmlContent += "</body></html>";

        var title = article.title || "Article";
        var filename = title.replace(/[^a-z0-9]/gi, "_") + ".mobi";
        var feedTitle = getText(document.getElementById("feed-title")) || "RSS Reader";

        var book = new MobiBook(title, feedTitle);
        book.setHtmlContent(htmlContent);

        var writer = new MobiWriter();
        var result = writer.write(book, filename);

        if (!result.success) {
            alert("Error generating MOBI: " + result.error);
        }
    },

    // Download selected articles as MOBI (unified, replaces duplicate "All" version)
    downloadSelectedArticles: function(selectedArticles) {
        try {
            var progressEl = document.getElementById("download-all-progress");
            removeClass(progressEl, "hidden");
            setText(progressEl, "Downloading articles: 0/" + selectedArticles.length);

            var allArticlesHtml = [];
            var feedTitle = getText(document.getElementById("feed-title"));
            var processedCount = 0;

            allArticlesHtml.push("<html><body>");
            allArticlesHtml.push("<h1>" + escapeHtml(feedTitle) + "</h1>");
            allArticlesHtml.push("<p>Downloaded: " + escapeHtml(new Date().toLocaleString()) + "</p>");
            allArticlesHtml.push("<p>Total articles: " + selectedArticles.length + "</p>");
            allArticlesHtml.push("<hr/>");

            function processNextArticle(index) {
                if (index >= selectedArticles.length) {
                    addClass(progressEl, "hidden");

                    allArticlesHtml.push("</body></html>");
                    var htmlContent = allArticlesHtml.join("\n");

                    var book = new MobiBook(feedTitle, feedTitle);
                    book.setHtmlContent(htmlContent);
                    var writer = new MobiWriter();
                    var filename = feedTitle.replace(/[^a-z0-9]/gi, "_") + "_selected_articles.mobi";
                    writer.write(book, filename);

                    alert("Downloaded " + processedCount + " articles successfully as MOBI!");
                    return;
                }

                var article = selectedArticles[index];
                setText(progressEl, "Downloading articles: " + (index + 1) + "/" + selectedArticles.length + " - " + article.title);

                if (!article.link) {
                    allArticlesHtml.push("<h2>" + escapeHtml(article.title) + "</h2>");
                    if (article.pubDate) {
                        allArticlesHtml.push("<p><em>" + escapeHtml(article.pubDate) + "</em></p>");
                    }
                    allArticlesHtml.push(article.content || article.description || "");
                    allArticlesHtml.push("<hr/>");

                    processedCount++;
                    processNextArticle(index + 1);
                    return;
                }

                ArticleFetcher.fetchFullArticleWithRetry(article.link, AppConfig.MAX_FETCH_RETRIES, function(error, extractedArticle) {
                    allArticlesHtml.push("<h2>" + escapeHtml(article.title) + "</h2>");
                    if (article.pubDate) {
                        allArticlesHtml.push("<p><em>" + escapeHtml(article.pubDate) + "</em></p>");
                    }
                    allArticlesHtml.push("<p><a href=\"" + escapeHtml(article.link) + "\">Original Article</a></p>");

                    if (error) {
                        allArticlesHtml.push("<p><strong>[Failed to fetch full article after " + AppConfig.MAX_FETCH_RETRIES + " attempts]</strong></p>");
                        allArticlesHtml.push(article.content || article.description || "");
                    } else {
                        allArticlesHtml.push(extractedArticle.content);
                        processedCount++;
                    }

                    allArticlesHtml.push("<hr/>");
                    processNextArticle(index + 1);
                });
            }

            processNextArticle(0);
        } catch (e) {
            alert("downloadSelectedArticlesMobi error: " + e.message);
            addClass(document.getElementById("download-all-progress"), "hidden");
        }
    }
};
