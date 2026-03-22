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

        if (AppConfig.USE_BACKEND) {
            BackendClient.downloadMobi(article.link, title, feedTitle, article.comments || "", filename);
            return;
        }

        var book = new MobiBook(title, feedTitle);
        book.setHtmlContent(htmlContent);

        var writer = new MobiWriter();
        var result = writer.write(book, filename);

        if (!result.success) {
            alert("Error generating MOBI: " + result.error);
        }
    },

    emailSelectedArticles: function(selectedArticles, to, callback) {
        try {
            var feedTitle = getText(document.getElementById("feed-title")) || "Articles";
            var filename = feedTitle.replace(/[^a-z0-9]/gi, "_") + "_articles.mobi";
            var progressEl = document.getElementById("download-all-progress");
            removeClass(progressEl, "hidden");
            setText(progressEl, "Preparing articles for email: 0/" + selectedArticles.length);

            if (AppConfig.USE_BACKEND) {
                var urls = [];
                for (var i = 0; i < selectedArticles.length; i++) {
                    if (selectedArticles[i].link) { urls.push(selectedArticles[i].link); }
                }
                addClass(progressEl, "hidden");
                BackendClient.emailBulk(urls, to, "mobi", feedTitle, callback);
                return;
            }

            var allArticlesHtml = [];
            var processedCount = 0;

            allArticlesHtml.push("<html><body>");
            allArticlesHtml.push("<h1>" + escapeHtml(feedTitle) + "</h1>");
            allArticlesHtml.push("<hr/>");

            function processNextArticle(index) {
                if (index >= selectedArticles.length) {
                    addClass(progressEl, "hidden");
                    var htmlContent = allArticlesHtml.join("\n") + "</body></html>";
                    var book = new MobiBook(feedTitle, feedTitle);
                    book.setHtmlContent(htmlContent);
                    var writer = new MobiWriter();
                    var result = writer.write(book, filename, true);
                    if (!result.success) {
                        callback(new Error(result.error || "MOBI generation failed"));
                        return;
                    }
                    callback(new Error("Email requires backend mode to be enabled."));
                    return;
                }

                var article = selectedArticles[index];
                setText(progressEl, "Preparing articles for email: " + (index + 1) + "/" + selectedArticles.length + " - " + article.title);

                if (!article.link) {
                    allArticlesHtml.push("<h2>" + escapeHtml(article.title) + "</h2>");
                    if (article.pubDate) { allArticlesHtml.push("<p><em>" + escapeHtml(article.pubDate) + "</em></p>"); }
                    allArticlesHtml.push(article.content || article.description || "");
                    allArticlesHtml.push("<hr/>");
                    processedCount++;
                    processNextArticle(index + 1);
                    return;
                }

                ArticleFetcher.fetchFullArticleWithRetry(article.link, AppConfig.MAX_FETCH_RETRIES, function(error, extractedArticle) {
                    allArticlesHtml.push("<h2>" + escapeHtml(article.title) + "</h2>");
                    if (article.pubDate) { allArticlesHtml.push("<p><em>" + escapeHtml(article.pubDate) + "</em></p>"); }
                    allArticlesHtml.push("<p><a href=\"" + escapeHtml(article.link) + "\">" + escapeHtml(article.link) + "</a></p>");
                    if (error) {
                        allArticlesHtml.push("<p><strong>[Failed to fetch full article]</strong></p>");
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
            addClass(document.getElementById("download-all-progress"), "hidden");
            callback(new Error("Email MOBI error: " + e.message));
        }
    },

    // Download selected articles as MOBI (unified, replaces duplicate "All" version)
    downloadSelectedArticles: function(selectedArticles) {
        try {
            var feedTitle = getText(document.getElementById("feed-title"));
            var filename = feedTitle.replace(/[^a-z0-9]/gi, "_") + "_selected_articles.mobi";

            if (AppConfig.USE_BACKEND) {
                var urls = [];
                for (var i = 0; i < selectedArticles.length; i++) {
                    if (selectedArticles[i].link) {
                        urls.push(selectedArticles[i].link);
                    }
                }
                BackendClient.downloadMobiBulk(urls, feedTitle, feedTitle, filename);
                return;
            }

            var progressEl = document.getElementById("download-all-progress");
            removeClass(progressEl, "hidden");
            setText(progressEl, "Downloading articles: 0/" + selectedArticles.length);

            var allArticlesHtml = [];
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
                    allArticlesHtml.push("<p><a href=\"" + escapeHtml(article.link) + "\">" + escapeHtml(article.link) + "</a></p>");

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
