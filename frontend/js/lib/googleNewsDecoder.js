/**
 * Google News URL Decoder - ES3 Compatible Browser Version
 * Decodes a Google News article URL into its original source URL
 *
 * @param {string} sourceUrl - The Google News article URL to decode
 * @param {function} callback - Callback function(error, result) where result contains decoded_url
 *
 * Example usage:
 *   decodeGoogleNewsUrl(url, function(error, result) {
 *     if (error) {
 *       console.log('Error:', error);
 *     } else {
 *       console.log('Decoded URL:', result.decoded_url);
 *     }
 *   });
 */
function decodeGoogleNewsUrl(sourceUrl, callback) {
  // CORS proxy to bypass cross-origin restrictions
  var CORS_PROXY = "https://corsproxy.io/?";

  // Helper function to parse URL
  function parseUrl(url) {
    var a = document.createElement("a");
    a.href = url;
    return {
      hostname: a.hostname,
      pathname: a.pathname,
    };
  }

  // Helper function to make HTTP GET request with CORS proxy
  function httpGet(url, onSuccess, onError) {
    var proxiedUrl = CORS_PROXY + encodeURIComponent(url);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          onSuccess(xhr.responseText);
        } else {
          onError("HTTP request failed with status: " + xhr.status);
        }
      }
    };
    xhr.open("GET", proxiedUrl, true);
    xhr.send();
  }

  // Helper function to make HTTP POST request with CORS proxy
  function httpPost(url, headers, data, onSuccess, onError) {
    var proxiedUrl = CORS_PROXY + encodeURIComponent(url);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          onSuccess(xhr.responseText);
        } else {
          onError("HTTP request failed with status: " + xhr.status);
        }
      }
    };
    xhr.open("POST", proxiedUrl, true);
    for (var key in headers) {
      if (headers.hasOwnProperty(key)) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }
    xhr.send(data);
  }

  // Helper function to URL encode
  function urlEncode(str) {
    return encodeURIComponent(str);
  }

  // Helper function to parse HTML and extract attributes
  function parseHtmlForAttributes(html) {
    var div = document.createElement("div");
    div.innerHTML = html;

    // Find c-wiz > div[jscontroller]
    var cwizElements = div.getElementsByTagName("c-wiz");
    for (var i = 0; i < cwizElements.length; i++) {
      var children = cwizElements[i].children || cwizElements[i].childNodes;
      for (var j = 0; j < children.length; j++) {
        var child = children[j];
        if (child.nodeType === 1 && child.getAttribute("jscontroller")) {
          return {
            signature: child.getAttribute("data-n-a-sg"),
            timestamp: child.getAttribute("data-n-a-ts"),
          };
        }
      }
    }
    return null;
  }

  // Step 1: Extract base64 string from URL
  function getBase64Str(url) {
    try {
      var parsed = parseUrl(url);
      var pathParts = parsed.pathname.split("/");

      if (parsed.hostname === "news.google.com" && pathParts.length > 1) {
        var secondLast = pathParts[pathParts.length - 2];
        if (secondLast === "articles" || secondLast === "read") {
          return pathParts[pathParts.length - 1];
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Step 2: Get decoding parameters (signature and timestamp)
  function getDecodingParams(base64Str, onSuccess, onError) {
    var url = "https://news.google.com/articles/" + base64Str;

    httpGet(
      url,
      function (html) {
        var attrs = parseHtmlForAttributes(html);
        if (attrs && attrs.signature && attrs.timestamp) {
          onSuccess(attrs.signature, attrs.timestamp);
        } else {
          // Try fallback URL
          var fallbackUrl = "https://news.google.com/rss/articles/" + base64Str;
          httpGet(
            fallbackUrl,
            function (html2) {
              var attrs2 = parseHtmlForAttributes(html2);
              if (attrs2 && attrs2.signature && attrs2.timestamp) {
                onSuccess(attrs2.signature, attrs2.timestamp);
              } else {
                onError("Failed to fetch data attributes from Google News");
              }
            },
            onError,
          );
        }
      },
      function (err) {
        // Try fallback URL on error
        var fallbackUrl = "https://news.google.com/rss/articles/" + base64Str;
        httpGet(
          fallbackUrl,
          function (html2) {
            var attrs2 = parseHtmlForAttributes(html2);
            if (attrs2 && attrs2.signature && attrs2.timestamp) {
              onSuccess(attrs2.signature, attrs2.timestamp);
            } else {
              onError("Failed to fetch data attributes from Google News");
            }
          },
          onError,
        );
      },
    );
  }

  // Step 3: Decode the URL using signature and timestamp
  function decodeUrl(signature, timestamp, base64Str, onSuccess, onError) {
    try {
      var url = "https://news.google.com/_/DotsSplashUi/data/batchexecute";

      var payload = [
        "Fbv4je",
        '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"' +
          base64Str +
          '",' +
          timestamp +
          ',"' +
          signature +
          '"]',
      ];

      var payloadStr = JSON.stringify([[payload]]);
      var postData = "f.req=" + urlEncode(payloadStr);

      var headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      };

      httpPost(
        url,
        headers,
        postData,
        function (response) {
          try {
            var lines = response.split("\n\n");
            if (lines.length < 2) {
              onError("Invalid response format");
              return;
            }

            var parsedData = JSON.parse(lines[1]);
            var sliced = parsedData.slice(0, -2);
            var decodedUrl = JSON.parse(sliced[0][2])[1];

            onSuccess(decodedUrl);
          } catch (parseErr) {
            onError("Failed to parse response: " + parseErr.message);
          }
        },
        onError,
      );
    } catch (e) {
      onError("Error in decodeUrl: " + e.message);
    }
  }

  // Main execution flow
  var base64Str = getBase64Str(sourceUrl);

  if (!base64Str) {
    callback("Invalid Google News URL format", null);
    return;
  }

  getDecodingParams(
    base64Str,
    function (signature, timestamp) {
      decodeUrl(
        signature,
        timestamp,
        base64Str,
        function (decodedUrl) {
          callback(null, {
            status: true,
            decoded_url: decodedUrl,
          });
        },
        function (error) {
          callback(error, null);
        },
      );
    },
    function (error) {
      callback(error, null);
    },
  );
}
