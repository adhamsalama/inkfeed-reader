// Scroll Controls (IIFE pattern for encapsulation)
(function() {
    // Global function for onclick handler
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
