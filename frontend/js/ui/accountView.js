// Account View — sign in / sign up / sign out
var AccountView = {
    render: function() {
        var el = document.getElementById("account-view-content");
        if (!el) { return; }
        if (AuthState.isLoggedIn()) {
            el.innerHTML = '<p>Signed in as <strong>' + AccountView._esc(AuthState.loggedInEmail) + '</strong></p>' +
                '<button onclick="AccountView.handleSignOut()">Sign Out</button>';
        } else {
            el.innerHTML =
                '<div id="account-form">' +
                  '<input type="email" id="account-email" placeholder="Email" />' +
                  '<input type="password" id="account-password" placeholder="Password" />' +
                  '<div class="account-actions">' +
                    '<button onclick="AccountView.handleAuthSubmit(\'signin\')">Sign In</button>' +
                    '<button class="secondary" onclick="AccountView.handleAuthSubmit(\'signup\')">Sign Up</button>' +
                  '</div>' +
                '</div>' +
                '<div id="account-status"></div>';
        }
    },

    _esc: function(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },

    handleAuthSubmit: function(action) {
        var emailEl = document.getElementById("account-email");
        var passEl = document.getElementById("account-password");
        var statusEl = document.getElementById("account-status");
        if (!emailEl || !passEl) { return; }
        var email = emailEl.value.replace(/^\s+|\s+$/g, "");
        var password = passEl.value;
        if (!email || !password) {
            if (statusEl) { statusEl.textContent = "Email and password are required."; }
            return;
        }
        if (statusEl) { statusEl.textContent = "Please wait..."; }

        var fn = action === "signup" ? AuthClient.signup : AuthClient.signin;
        fn(email, password, function(err, userEmail) {
            if (err) {
                if (statusEl) { statusEl.textContent = "Error: " + err.message; }
                return;
            }
            AuthState.setLoggedIn(userEmail);
            PreferencesSync.loadFromBackend(function() {
                FeedRenderer.renderSavedFeeds();
                AccountView.render();
            });
        });
    },

    handleSignOut: function() {
        AuthClient.signout(function() {
            AuthState.setLoggedOut();
            PreferencesSync.revertToLocalStorage();
            AccountView.render();
        });
    }
};

function showAccountView() {
    ViewManager.showAccountView();
}

function hideAccountView() {
    ViewManager.showInputView();
}
