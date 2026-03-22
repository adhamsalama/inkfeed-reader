// Auth API client — all requests use withCredentials for session cookie
var AuthClient = {
    signup: function(email, password, callback) {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 201) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        callback(null, data.email);
                    } catch (e) {
                        callback(e, null);
                    }
                } else {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        callback(new Error(data.error || "Signup failed"), null);
                    } catch (e) {
                        callback(new Error("Signup failed: " + xhr.status), null);
                    }
                }
            }
        };
        xhr.open("POST", AppConfig.BACKEND_URL + "/signup", true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ email: email, password: password }));
    },

    signin: function(email, password, callback) {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        callback(null, data.email);
                    } catch (e) {
                        callback(e, null);
                    }
                } else {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        callback(new Error(data.error || "Sign in failed"), null);
                    } catch (e) {
                        callback(new Error("Sign in failed: " + xhr.status), null);
                    }
                }
            }
        };
        xhr.open("POST", AppConfig.BACKEND_URL + "/signin", true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ email: email, password: password }));
    },

    signout: function(callback) {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (callback) { callback(); }
            }
        };
        xhr.open("POST", AppConfig.BACKEND_URL + "/signout", true);
        xhr.withCredentials = true;
        xhr.send(null);
    },

    getPreferences: function(callback) {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        callback(null, data);
                    } catch (e) {
                        callback(e, null);
                    }
                } else if (xhr.status === 401 || xhr.status === 403) {
                    callback(null, null);
                } else {
                    callback(new Error("Failed to load preferences: " + xhr.status), null);
                }
            }
        };
        xhr.open("GET", AppConfig.BACKEND_URL + "/preferences", true);
        xhr.withCredentials = true;
        xhr.send(null);
    },

    putPreferences: function(payload, callback) {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (callback) { callback(xhr.status === 204 ? null : new Error("Failed: " + xhr.status)); }
            }
        };
        xhr.open("PUT", AppConfig.BACKEND_URL + "/preferences", true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(payload));
    },

    putSavedFeeds: function(feedsArray, callback) {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (callback) { callback(xhr.status === 204 ? null : new Error("Failed: " + xhr.status)); }
            }
        };
        xhr.open("PUT", AppConfig.BACKEND_URL + "/saved-feeds", true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(feedsArray));
    }
};
