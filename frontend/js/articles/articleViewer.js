// Article Viewer

var ArticleViewer = {
    openArticle: function(index) {
        try {
            AppState.currentArticleIndex = index;
            window.location.hash = "article-" + index;
            var article = AppState.currentArticles[index];

            // Function to render the article once we have the final URL
            function renderArticle(finalUrl) {
                AppState.currentArticleUrl = finalUrl;
                article.link = finalUrl;

                // Reset comments state
                var commentsContent = document.getElementById("comments-content");
                var commentsLoading = document.getElementById("comments-loading");
                var commentsHtmlContent = document.getElementById(
                    "comments-html-content"
                );
                var viewCommentsBtn = document.getElementById("view-comments-btn");
                var viewCommentsHtmlBtn = document.getElementById(
                    "view-comments-html-btn"
                );
                commentsContent.innerHTML = "";
                commentsHtmlContent.innerHTML = "";
                removeClass(commentsContent, "visible");
                removeClass(commentsHtmlContent, "visible");
                addClass(commentsLoading, "hidden");

                // Show/hide View Comments buttons based on whether article has comments
                if (article.comments) {
                    viewCommentsBtn.style.display = "";
                    viewCommentsHtmlBtn.style.display = "";
                } else {
                    viewCommentsBtn.style.display = "none";
                    viewCommentsHtmlBtn.style.display = "none";
                }

                var contentDiv = document.getElementById("article-content");

                // Ensure article content is visible
                addClass(contentDiv, "visible");

                // Use content:encoded if available, otherwise description
                var content = article.content || article.description || "";

                var html = "<h2>" + escapeHtml(article.title) + "</h2>";
                if (article.pubDate) {
                    html +=
                        '<p class="article-meta">' + escapeHtml(article.pubDate) + "</p>";
                }
                if (finalUrl) {
                    html +=
                        '<p><a href="' +
                        escapeHtml(finalUrl) +
                        '" target="_blank">Original Article</a></p>';
                }
                if (article.comments) {
                    html +=
                        '<p><a href="' +
                        escapeHtml(article.comments) +
                        '" target="_blank">Comments</a></p>';
                }
                html +=
                    '<hr style="margin: 15px 0; border: none; border-top: 1px solid #000;">';
                html += '<div class="article-body">' + content + "</div>";

                contentDiv.innerHTML = html;
                ViewManager.showArticleView();
            }

            // Check if this is a Google News URL and decode it
            if (article.link && article.link.indexOf('news.google.com') >= 0) {
                // Show a loading indicator
                var contentDiv = document.getElementById("article-content");
                contentDiv.innerHTML = '<p>Decoding Google News URL...</p>';
                addClass(contentDiv, "visible");
                ViewManager.showArticleView();

                decodeGoogleNewsUrl(article.link, function(error, result) {
                    if (error) {
                        // If decoding fails, use the original URL
                        console.log('Google News URL decode error:', error);
                        renderArticle(article.link);
                    } else {
                        // Use the decoded URL
                        renderArticle(result.decoded_url);
                    }
                });
            } else {
                // Not a Google News URL, render normally
                renderArticle(article.link);
            }
        } catch (e) {
            alert("openArticle error: " + e.message);
        }
    }
};
