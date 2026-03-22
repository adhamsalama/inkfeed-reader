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
                '<div class="account-tabs">' +
                  '<button id="tab-signin" class="account-tab active-tab" onclick="AccountView.switchTab(\'signin\')">Sign In</button>' +
                  '<button id="tab-signup" class="account-tab" onclick="AccountView.switchTab(\'signup\')">Sign Up</button>' +
                '</div>' +
                '<div id="account-form">' +
                  '<input type="email" id="account-email" placeholder="Email" />' +
                  '<input type="password" id="account-password" placeholder="Password" />' +
                  '<button onclick="AccountView.handleAuthSubmit()">Sign In</button>' +
                '</div>' +
                '<div id="account-status"></div>';
            AccountView._currentTab = "signin";
        }
    },

    _currentTab: "signin",
    _esc: function(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },

    switchTab: function(tab) {
        AccountView._currentTab = tab;
        var signinTab = document.getElementById("tab-signin");
        var signupTab = document.getElementById("tab-signup");
        var btn = document.querySelector("#account-form button");
        if (tab === "signin") {
            if (signinTab) { signinTab.className = "account-tab active-tab"; }
            if (signupTab) { signupTab.className = "account-tab"; }
            if (btn) { btn.textContent = "Sign In"; }
        } else {
            if (signinTab) { signinTab.className = "account-tab"; }
            if (signupTab) { signupTab.className = "account-tab active-tab"; }
            if (btn) { btn.textContent = "Sign Up"; }
        }
    },

    handleAuthSubmit: function() {
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

        var fn = AccountView._currentTab === "signup" ? AuthClient.signup : AuthClient.signin;
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
