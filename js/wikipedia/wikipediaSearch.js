// Wikipedia Search

var WikipediaSearch = {
    search: function(query, callback) {
        var url = "https://en.wikipedia.org/w/api.php?action=opensearch&search=" +
            encodeURIComponent(query) +
            "&limit=10&namespace=0&format=json&origin=*";

        var xhr;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else {
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }

        xhr.onreadystatechange = function() {
            try {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            // OpenSearch response: [query, [titles], [descriptions], [urls]]
                            var data = JSON.parse(xhr.responseText);
                            var results = [];
                            for (var i = 0; i < data[1].length; i++) {
                                results.push({
                                    index: i,
                                    title: data[1][i],
                                    description: data[2][i] || "",
                                    link: data[3][i],
                                    content: "",
                                    pubDate: "",
                                    comments: ""
                                });
                            }
                            callback(null, results);
                        } catch (e) {
                            callback(e, null);
                        }
                    } else {
                        callback(new Error("Search failed: " + xhr.status), null);
                    }
                }
            } catch (e) {
                callback(e, null);
            }
        };

        xhr.open("GET", url, true);
        xhr.send(null);
    }
};

function toggleWikipediaSearch() {
    var section = document.getElementById("wikipedia-section");
    if (!section) return;
    if (section.className.indexOf("hidden") >= 0) {
        removeClass(section, "hidden");
        var input = document.getElementById("wikipedia-search-input");
        if (input && input.focus) { input.focus(); }
    } else {
        addClass(section, "hidden");
    }
}

function searchWikipedia() {
    var input = document.getElementById("wikipedia-search-input");
    if (!input) return;
    var query = input.value.replace(/^\s+|\s+$/g, "");
    if (!query) return;

    var loadingEl = document.getElementById("wikipedia-loading");
    var resultsList = document.getElementById("wikipedia-results-list");

    removeClass(loadingEl, "hidden");
    resultsList.innerHTML = "";

    WikipediaSearch.search(query, function(error, results) {
        addClass(loadingEl, "hidden");

        if (error || !results || results.length === 0) {
            var li = document.createElement("li");
            li.className = "saved-feed-item";
            setText(li, error ? "Search failed: " + error.message : "No results found.");
            resultsList.appendChild(li);
            return;
        }

        for (var i = 0; i < results.length; i++) {
            var result = results[i];

            var li = document.createElement("li");
            li.className = "saved-feed-item";

            var link = document.createElement("a");
            link.className = "saved-feed-link";
            setText(link, result.title);
            link.title = result.link;

            if (result.description) {
                var desc = document.createElement("small");
                setText(desc, result.description);
                desc.style.display = "block";
                link.appendChild(desc);
            }

            (function(allResults, idx) {
                link.onclick = function() {
                    AppState.currentArticles = allResults;
                    setText(document.getElementById("feed-title"), "Wikipedia");
                    document.title = "Wikipedia";
                    addClass(document.getElementById("wikipedia-section"), "hidden");
                    ArticleViewer.openArticle(idx);
                    return false;
                };
            })(results, i);

            li.appendChild(link);
            resultsList.appendChild(li);
        }
    });
}
