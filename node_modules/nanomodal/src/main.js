var ModalEvent = require("./ModalEvent");

var nanoModalAPI = (function() {

    var fs = require("fs");

    var El = require("./El");
    var Modal = require("./Modal");

    var overlay;
    var doc = document;

    function init() {
        if (!doc.querySelector("#nanoModalOverlay")) {
            // Put the main styles on the page.
            var styleObj = El("style");
            var style = styleObj.el;
            var firstElInHead = doc.querySelectorAll("head")[0].childNodes[0];
            firstElInHead.parentNode.insertBefore(style, firstElInHead);

            var styleText = fs.readFileSync("src/style.min.css", "utf8");
            if (style.styleSheet) {
                style.styleSheet.cssText = styleText;
            } else {
                styleObj.text(styleText);
            }

            // Make the overlay and put it on the page.
            overlay = El("div", "nanoModalOverlay nanoModalOverride");
            overlay.el.id = "nanoModalOverlay";
            doc.body.appendChild(overlay.el);

            // Add an event so that the modals can hook into it to close.
            overlay.onRequestHide = ModalEvent();

            var overlayCloseFunc = function() {
                overlay.onRequestHide.fire();
            };

            overlay.addClickListener(overlayCloseFunc);
            El(doc).addListener("keydown", function(e) {
                var keyCode = e.which || e.keyCode;
                if (keyCode === 27) { // 27 is Escape
                    overlayCloseFunc();
                }
            });

            var windowEl = El(window);
            var resizeOverlayTimeout;
            windowEl.addListener("resize", function() {
                if (resizeOverlayTimeout) {
                    clearTimeout(resizeOverlayTimeout);
                }
                resizeOverlayTimeout = setTimeout(Modal.resizeOverlay, 100);
            });

            // Make SURE we have the correct dimensions so we make the overlay the right size.
            // Some devices fire the event before the document is ready to return the new dimensions.
            windowEl.addListener("orientationchange", function() {
                for (var t = 0; t < 3; ++t) {
                    setTimeout(Modal.resizeOverlay, 1000 * t + 200);
                }
            });
        }
    }

    if (document.body) {
        init();
    }

    var api = function(content, options) {
        init();
        return Modal(content, options, overlay, api.customShow, api.customHide);
    };
    api.resizeOverlay = Modal.resizeOverlay;

    return api;
})();

// expose api to var outside browserify so that we can export a module correctly.
nanoModal = nanoModalAPI;
