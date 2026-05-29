// Scroll Controls (IIFE pattern for encapsulation)
(function() {
    // Global function for onclick handler
    window.scrollToTop = function() {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    };

    window.scrollPage = function(direction) {
        var scrollAmount = window.innerHeight || document.documentElement.clientHeight || 400;
        window.scrollBy(0, direction * scrollAmount * 0.8);
    };

    function updateScrollButtons() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        var clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        var scrollButtons = document.getElementById("scroll-buttons");

        // Show buttons if page is scrollable
        if (scrollHeight > clientHeight + 20) {
            removeClass(scrollButtons, "hidden");
        } else {
            addClass(scrollButtons, "hidden");
        }

        // Raise buttons and show Top button when near the bottom
        var scrollTopBtn = document.getElementById("scroll-top-btn");
        if (scrollTop + clientHeight >= scrollHeight - 60) {
            addClass(scrollButtons, "scroll-buttons-raised");
            if (scrollTopBtn) { scrollTopBtn.style.display = "inline"; }
        } else {
            removeClass(scrollButtons, "scroll-buttons-raised");
            if (scrollTopBtn) { scrollTopBtn.style.display = "none"; }
        }
    }

    // Initialize scroll controls
    window.initScrollControls = function() {
        updateScrollButtons();
        if (window.addEventListener) {
            window.addEventListener("scroll", updateScrollButtons, false);
            window.addEventListener("resize", updateScrollButtons, false);
        } else if (window.attachEvent) {
            window.attachEvent("onscroll", updateScrollButtons);
            window.attachEvent("onresize", updateScrollButtons);
        }
    };
})();
