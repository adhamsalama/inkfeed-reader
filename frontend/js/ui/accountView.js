// Account View — sign in / sign up / sign out
var AccountView = {
    render: function() {
        var el = document.getElementById("account-view-content");
        if (!el) { return; }
        if (AuthState.isLoggedIn()) {
            el.innerHTML = '<p>Signed in as <strong>' + AccountView._esc(AuthState.loggedInEmail) + '</strong></p>' +
                '<button onclick="AccountView.handleSignOut()">Sign Out</button>' +
                '<hr />' +
                '<h3>Change Password</h3>' +
                '<div id="change-password-form">' +
                  '<input type="password" id="cp-current" placeholder="Current Password" />' +
                  '<input type="password" id="cp-new" placeholder="New Password (min 10 chars, digit &amp; symbol)" />' +
                  '<input type="password" id="cp-confirm" placeholder="Confirm New Password" />' +
                  '<button onclick="AccountView.handleChangePassword()">Update Password</button>' +
                '</div>' +
                '<div id="cp-status"></div>';
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

    _validatePassword: function(password) {
        if (password.length < 10) { return "Password must be at least 10 characters."; }
        if (!/[0-9]/.test(password)) { return "Password must contain at least one digit."; }
        if (!/[^a-zA-Z0-9]/.test(password)) { return "Password must contain at least one symbol."; }
        return "";
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
        if (action === "signup") {
            var passErr = AccountView._validatePassword(password);
            if (passErr) {
                if (statusEl) { statusEl.textContent = passErr; }
                return;
            }
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
                closeSettings();
            });
        });
    },

    handleChangePassword: function() {
        var currentEl = document.getElementById("cp-current");
        var newEl = document.getElementById("cp-new");
        var confirmEl = document.getElementById("cp-confirm");
        var statusEl = document.getElementById("cp-status");
        if (!currentEl || !newEl || !confirmEl) { return; }
        var current = currentEl.value;
        var newPass = newEl.value;
        var confirmPass = confirmEl.value;
        if (!current || !newPass || !confirmPass) {
            if (statusEl) { statusEl.textContent = "All fields are required."; }
            return;
        }
        if (newPass !== confirmPass) {
            if (statusEl) { statusEl.textContent = "New passwords do not match."; }
            return;
        }
        var passErr = AccountView._validatePassword(newPass);
        if (passErr) {
            if (statusEl) { statusEl.textContent = passErr; }
            return;
        }
        var btn = document.querySelector("#change-password-form button");
        if (btn) { btn.disabled = true; }
        if (statusEl) { statusEl.textContent = "Please wait..."; }
        AuthClient.changePassword(current, newPass, confirmPass, function(err) {
            if (btn) { btn.disabled = false; }
            if (err) {
                if (statusEl) { statusEl.textContent = "Error: " + err.message; }
                return;
            }
            if (statusEl) { statusEl.textContent = "Password changed successfully."; }
            currentEl.value = "";
            newEl.value = "";
            confirmEl.value = "";
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

