// URL Helper Functions

// Helper: get hash parameter (fallback for older browsers)
function getHashParam(name) {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    hash = hash.substring(1); // Remove #
    var pairs = hash.split("&");
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        if (decodeURIComponent(pair[0]) === name) {
            return pair[1] ? decodeURIComponent(pair[1]) : "";
        }
    }
    return null;
}
