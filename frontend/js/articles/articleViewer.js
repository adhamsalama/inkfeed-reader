// Article Viewer

var ArticleViewer = {
    openArticle: function(index) {
        try {
            AppState.currentArticleIndex = index;
            window.location.hash = "article-" + index;
            var article = AppState.currentArticles[index];

            // Mark article as read
            if (article.link && !AppState.readArticles.has(article.link)) {
                AppState.readArticles.add(article.link);
                var readArr = [];
                AppState.readArticles.forEach(function(url) { readArr.push(url); });
                localStorage.setItem("readArticles", JSON.stringify(readArr));
                var articleEl = document.getElementById("article-" + index);
                if (articleEl) { addClass(articleEl, "article-read"); }
            }

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

                // Check if this is a Reddit post
                var isRedditPost = article.comments && article.comments.indexOf(".json") >= 0;

                if (isRedditPost) {
                    // Fetch Reddit JSON to get full post content
                    contentDiv.innerHTML = '<p>Loading Reddit post...</p>';

                    if (AppConfig.USE_BACKEND) {
                        BackendClient.fetchRedditPost(article.comments, function(error, data) {
                            if (error) {
                                displayArticleContent(contentDiv, article, finalUrl, article.content || article.description || "");
                                return;
                            }
                            if (data.actual_url && data.actual_url !== finalUrl) {
                                AppState.currentArticleUrl = data.actual_url;
                                article.link = data.actual_url;
                            }
                            displayArticleContent(contentDiv, article, article.link, data.content_html || article.description || "");
                        });
                    } else {
                        fetchUrl(article.comments, function(error, responseText) {
                            if (error) {
                                // Fall back to RSS content if fetch fails
                                displayArticleContent(contentDiv, article, finalUrl, article.content || article.description || "");
                                return;
                            }

                            try {
                                var json = JSON.parse(responseText);
                                // json[0] contains the post data
                                if (json.length > 0 && json[0].data && json[0].data.children && json[0].data.children.length > 0) {
                                    var postData = json[0].data.children[0].data;
                                    var postContent = "";
                                    var actualUrl = finalUrl;

                                    // For link posts, use the actual linked URL instead of Reddit URL
                                    // is_self indicates if it's a self-post (text only) or a link post
                                    if (!postData.is_self && postData.url) {
                                        actualUrl = postData.url;
                                        // Update the article link for "Get Full Article" to work correctly
                                        AppState.currentArticleUrl = actualUrl;
                                        article.link = actualUrl;
                                    }

                                    // Get selftext_html (for text posts) or just selftext
                                    if (postData.selftext_html) {
                                        // Reddit's API returns HTML-encoded content
                                        // First decode to get the actual HTML string
                                        var tempDiv = document.createElement("div");
                                        tempDiv.innerHTML = postData.selftext_html;
                                        // Get the decoded HTML as text (this gives us the actual HTML tags as a string)
                                        var decodedHtml = tempDiv.textContent || tempDiv.innerText || "";

                                        // Clean up Reddit's wrapper comments and divs
                                        // Remove <!-- SC_OFF --> and <!-- SC_ON --> comments
                                        decodedHtml = decodedHtml.replace(/<!--\s*SC_OFF\s*-->/g, '');
                                        decodedHtml = decodedHtml.replace(/<!--\s*SC_ON\s*-->/g, '');
                                        // Remove the outer <div class="md"> wrapper if present
                                        decodedHtml = decodedHtml.replace(/^<div class="md">([\s\S]*)<\/div>$/g, '$1');

                                        postContent = decodedHtml;
                                    } else if (postData.selftext) {
                                        // Plain text - escape and convert newlines to <br>
                                        postContent = escapeHtml(postData.selftext).replace(/\n/g, '<br>');
                                    }

                                    displayArticleContent(contentDiv, article, actualUrl, postContent || article.description || "");
                                } else {
                                    // Fall back to RSS content if JSON structure is unexpected
                                    displayArticleContent(contentDiv, article, finalUrl, article.content || article.description || "");
                                }
                            } catch (e) {
                                // Fall back to RSS content if JSON parsing fails
                                displayArticleContent(contentDiv, article, finalUrl, article.content || article.description || "");
                            }
                        });
                    }
                } else {
                    // Use content:encoded if available, otherwise description
                    var content = article.content || article.description || "";
                    displayArticleContent(contentDiv, article, finalUrl, content);
                }
            }

            // Helper function to display article content
            function displayArticleContent(contentDiv, article, finalUrl, content) {
                var feedTitle = getText(document.getElementById("feed-title"));
                var titleBarText = feedTitle ? feedTitle + " \u2014 " + article.title : article.title;
                setText(document.getElementById("article-title-bar"), titleBarText);
                var favBtnHtml = AppConfig.USE_BACKEND
                    ? ' <button id="favorite-btn" class="secondary" onclick="toggleFavorite()" style="font-size:1em; vertical-align:middle">\u2606</button>'
                    : '';
                var html = '<h2>' + escapeHtml(article.title) + favBtnHtml + '</h2>';
                if (article.pubDate) {
                    html +=
                        '<p class="article-meta">' + escapeHtml(article.pubDate) + "</p>";
                }
                if (finalUrl) {
                    html +=
                        '<p><a href="' +
                        escapeHtml(finalUrl) +
                        '" target="_blank">' +
                        escapeHtml(finalUrl) +
                        '</a></p>';
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
                FavoritesManager.updateFavoriteBtn();
            }

            // Check if this is a Google News URL and decode it
            if (article.link && article.link.indexOf('news.google.com') >= 0) {
                // Show a loading indicator
                var contentDiv = document.getElementById("article-content");
                contentDiv.innerHTML = '<p>Decoding Google News URL...</p>';
                addClass(contentDiv, "visible");
                ViewManager.showArticleView();

                if (AppConfig.USE_BACKEND) {
                    BackendClient.decodeGoogleNewsUrl(article.link, function(error, data) {
                        if (error) {
                            renderArticle(article.link);
                        } else {
                            renderArticle(data.decoded_url);
                        }
                    });
                } else {
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
                }
            } else {
                // Not a Google News URL, render normally
                renderArticle(article.link);
            }
        } catch (e) {
            alert("openArticle error: " + e.message);
        }
    }
};
