// Comments Viewer (Reddit JSON and HTML)

var CommentsViewer = {
    fetchComments: function() {
        try {
            var article = AppState.currentArticles[AppState.currentArticleIndex];
            if (!article || !article.comments) {
                return;
            }

            var commentsContent = document.getElementById("comments-content");
            var commentsLoading = document.getElementById("comments-loading");
            var articleContent = document.getElementById("article-content");
            var commentsHtmlContent = document.getElementById("comments-html-content");

            // Hide article and other comments view
            removeClass(articleContent, "visible");
            removeClass(commentsHtmlContent, "visible");

            // Show loading indicator
            removeClass(commentsLoading, "hidden");

            fetchUrl(article.comments, function (error, responseText) {
                if (error) {
                    commentsContent.innerHTML =
                        '<p class="error">Error fetching comments: ' +
                        escapeHtml(error.message) +
                        "</p>";
                    addClass(commentsContent, "visible");
                    addClass(commentsLoading, "hidden");
                    return;
                }

                try {
                    // Check if this is a JSON feed (Reddit)
                    var isJsonFeed = article.comments.indexOf(".json") >= 0;

                    if (isJsonFeed) {
                        // Parse Reddit JSON
                        var json = JSON.parse(responseText);
                        var htmlParts = [];

                        // Recursive function to render comment and its replies
                        var replyCount = {count: 0};
                        function renderComment(commentData, depth, isTopLevel) {
                            if (!commentData || !commentData.data) return;
                            var data = commentData.data;

                            // Skip "more" comments
                            if (commentData.kind === "more") return;

                            // Limit replies to 50 per top-level comment
                            if (!isTopLevel) {
                                if (replyCount.count >= AppConfig.MAX_REPLIES_PER_COMMENT) return;
                                replyCount.count++;
                            }

                            var indent = depth * 20;
                            htmlParts.push('<div style="margin-left: ' + indent + 'px; margin-bottom: 15px; padding: 10px; border-left: 2px solid #ccc;">');

                            if (data.author) {
                                htmlParts.push('<p style="font-weight: bold; margin-bottom: 5px;">');
                                htmlParts.push(escapeHtml(data.author));
                                htmlParts.push('</p>');
                            }

                            if (data.created_utc) {
                                var date = new Date(data.created_utc * 1000);
                                htmlParts.push('<p style="font-size: 0.85em; color: #666; margin-bottom: 10px;">');
                                htmlParts.push(escapeHtml(date.toLocaleString()));
                                htmlParts.push('</p>');
                            }

                            if (data.body_html) {
                                htmlParts.push('<div style="margin-bottom: 10px;">');
                                // Decode HTML entities in body_html
                                var tempDiv = document.createElement("div");
                                tempDiv.innerHTML = data.body_html;
                                // Get just the text content (strips HTML tags)
                                var textContent = getText(tempDiv);
                                // Replace newlines with <br> for display
                                textContent = textContent.replace(/\n/g, "<br>");
                                htmlParts.push(textContent);
                                htmlParts.push('</div>');
                            }

                            htmlParts.push('</div>');

                            // Render replies recursively
                            if (data.replies && data.replies.data && data.replies.data.children) {
                                var replies = data.replies.data.children;
                                for (var i = 0; i < replies.length; i++) {
                                    renderComment(replies[i], depth + 1, false);
                                }
                            }
                        }

                        // json[0] is post, json[1] is comments
                        if (json.length > 1 && json[1].data && json[1].data.children) {
                            var comments = json[1].data.children;
                            var maxComments = Math.min(comments.length, AppConfig.MAX_TOP_LEVEL_COMMENTS);
                            for (var i = 0; i < maxComments; i++) {
                                replyCount.count = 0; // Reset reply counter for each top-level comment
                                renderComment(comments[i], 0, true);
                            }
                        }

                        if (htmlParts.length === 0) {
                            commentsContent.innerHTML =
                                '<p class="error">No comments found.</p>';
                        } else {
                            commentsContent.innerHTML =
                                '<div class="comments-body">' + htmlParts.join("") + "</div>";
                        }
                        addClass(commentsContent, "visible");
                    } else {
                        // Parse as HTML using Readability
                        var doc;
                        if (window.DOMParser) {
                            doc = new DOMParser().parseFromString(responseText, "text/html");
                        } else {
                            doc = document.createElement("div");
                            doc.innerHTML = responseText;
                        }

                        var reader = new Readability(doc);
                        var extractedContent = reader.parse();

                        if (extractedContent && extractedContent.content) {
                            commentsContent.innerHTML =
                                '<div class="comments-body">' +
                                extractedContent.content +
                                "</div>";
                            addClass(commentsContent, "visible");
                        } else {
                            commentsContent.innerHTML =
                                '<p class="error">Could not parse comments from this page.</p>';
                            addClass(commentsContent, "visible");
                        }
                    }
                } catch (e) {
                    commentsContent.innerHTML =
                        '<p class="error">Error parsing comments: ' +
                        escapeHtml(e.message) +
                        "</p>";
                    addClass(commentsContent, "visible");
                }

                addClass(commentsLoading, "hidden");
            });
        } catch (e) {
            alert("fetchComments error: " + e.message);
        }
    },

    fetchCommentsHtml: function() {
        try {
            var article = AppState.currentArticles[AppState.currentArticleIndex];
            if (!article || !article.comments) {
                return;
            }

            var commentsHtmlContent = document.getElementById(
                "comments-html-content"
            );
            var commentsLoading = document.getElementById("comments-loading");
            var articleContent = document.getElementById("article-content");
            var commentsContent = document.getElementById("comments-content");

            // Hide article and other comments view
            removeClass(articleContent, "visible");
            removeClass(commentsContent, "visible");

            removeClass(commentsLoading, "hidden");

            fetchUrl(article.comments, function (error, htmlText) {
                if (error) {
                    commentsHtmlContent.innerHTML =
                        "Error fetching comments: " + escapeHtml(error.message);
                    addClass(commentsHtmlContent, "visible");
                    addClass(commentsLoading, "hidden");
                    return;
                }

                // Display raw HTML rendered
                commentsHtmlContent.innerHTML = htmlText;
                addClass(commentsHtmlContent, "visible");
                addClass(commentsLoading, "hidden");
            });
        } catch (e) {
            alert("fetchCommentsHtml error: " + e.message);
        }
    }
};
