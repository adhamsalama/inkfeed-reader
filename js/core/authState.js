// Authentication state
var AuthState = {
    loggedInEmail: null,
    isLoggedIn: function() { return AuthState.loggedInEmail !== null; },
    setLoggedIn: function(email) { AuthState.loggedInEmail = email; },
    setLoggedOut: function() { AuthState.loggedInEmail = null; }
};
