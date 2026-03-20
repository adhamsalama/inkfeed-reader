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

            var isHnComments = article.comments.indexOf("news.ycombinator.com/item?id=") >= 0;

            if (isHnComments) {
                var hnId = "";
                var qIdx = article.comments.indexOf("?id=");
                if (qIdx >= 0) {
                    hnId = article.comments.substring(qIdx + 4);
                    var ampIdx = hnId.indexOf("&");
                    if (ampIdx >= 0) hnId = hnId.substring(0, ampIdx);
                    var hashIdx = hnId.indexOf("#");
                    if (hashIdx >= 0) hnId = hnId.substring(0, hashIdx);
                }
                if (!hnId) {
                    commentsContent.innerHTML = '<p class="error">Could not extract HN item ID from URL.</p>';
                    addClass(commentsContent, "visible");
                    addClass(commentsLoading, "hidden");
                    return;
                }

                var algoliaUrl = "https://hn.algolia.com/api/v1/items/" + hnId;
                var hnXhr;
                if (window.XMLHttpRequest) {
                    hnXhr = new XMLHttpRequest();
                } else {
                    hnXhr = new ActiveXObject("Microsoft.XMLHTTP");
                }
                hnXhr.onreadystatechange = function() {
                    if (hnXhr.readyState !== 4) return;
                    addClass(commentsLoading, "hidden");
                    if (hnXhr.status !== 200) {
                        commentsContent.innerHTML = '<p class="error">Error fetching HN comments: HTTP ' + hnXhr.status + '</p>';
                        addClass(commentsContent, "visible");
                        return;
                    }
                    try {
                        var data = JSON.parse(hnXhr.responseText);
                        var hnCounter = [0];

                        var renderHNComment = function(comment, depth) {
                            if (!comment) return "";
                            var text = comment.text || "";
                            var author = comment.author || "[deleted]";
                            var createdAt = comment.created_at || "";
                            var children = comment.children || [];
                            var n = hnCounter[0]++;
                            var collapseId = "hn-c-" + n;
                            var dateStr = createdAt ? createdAt.substring(0, 10) : "";
                            var indent = depth * 16;

                            var parts = [];
                            parts.push('<div class="hn-comment" style="margin-left:' + indent + 'px">');
                            parts.push('<div class="hn-comment-header">');
                            parts.push('<span id="' + collapseId + '-btn" class="hn-toggle" onclick="toggleHNComment(\'' + collapseId + '\')">[&minus;]</span> ');
                            parts.push('<strong class="hn-author">' + escapeHtml(author) + '</strong>');
                            if (dateStr) {
                                parts.push(' <span class="hn-date">' + escapeHtml(dateStr) + '</span>');
                            }
                            parts.push('</div>');
                            parts.push('<div id="' + collapseId + '" class="hn-comment-body">');
                            if (text) {
                                parts.push('<div class="hn-comment-text">' + text + '</div>');
                            } else {
                                parts.push('<div class="hn-comment-text hn-deleted">[deleted]</div>');
                            }
                            for (var ci = 0; ci < children.length; ci++) {
                                parts.push(renderHNComment(children[ci], depth + 1));
                            }
                            parts.push('</div>');
                            parts.push('</div>');
                            return parts.join("");
                        };

                        var topChildren = data.children || [];
                        if (topChildren.length === 0) {
                            commentsContent.innerHTML = '<p>No comments yet.</p>';
                        } else {
                            var htmlParts = [];
                            var maxComments = Math.min(topChildren.length, AppConfig.MAX_TOP_LEVEL_COMMENTS);
                            for (var ci = 0; ci < maxComments; ci++) {
                                htmlParts.push(renderHNComment(topChildren[ci], 0));
                            }
                            commentsContent.innerHTML = '<div class="comments-body hn-comments">' + htmlParts.join("") + '</div>';
                        }
                        addClass(commentsContent, "visible");
                    } catch (e) {
                        commentsContent.innerHTML = '<p class="error">Error parsing HN comments: ' + escapeHtml(e.message) + '</p>';
                        addClass(commentsContent, "visible");
                    }
                };
                hnXhr.open("GET", algoliaUrl, true);
                hnXhr.send(null);
                return;
            }

            if (AppConfig.USE_BACKEND) {
                BackendClient.fetchComments(article.comments, function(error, data) {
                    addClass(commentsLoading, "hidden");
                    if (error) {
                        commentsContent.innerHTML = '<p class="error">Error fetching comments: ' + escapeHtml(error.message) + "</p>";
                    } else {
                        commentsContent.innerHTML = '<div class="comments-body">' + data.html + "</div>";
                    }
                    addClass(commentsContent, "visible");
                });
                return;
            }

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

            if (AppConfig.USE_BACKEND) {
                BackendClient.fetchComments(article.comments, function(error, data) {
                    addClass(commentsLoading, "hidden");
                    if (error) {
                        commentsHtmlContent.innerHTML = "Error fetching comments: " + escapeHtml(error.message);
                    } else {
                        commentsHtmlContent.innerHTML = data.html;
                    }
                    addClass(commentsHtmlContent, "visible");
                });
                return;
            }

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

window.toggleHNComment = function(collapseId) {
    var el = document.getElementById(collapseId);
    var btn = document.getElementById(collapseId + "-btn");
    if (!el) return;
    if (el.style.display === "none") {
        el.style.display = "";
        if (btn) btn.innerHTML = "[&minus;]";
    } else {
        el.style.display = "none";
        if (btn) btn.innerHTML = "[+]";
    }
};
