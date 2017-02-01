var ModalEvent = require("./ModalEvent");

function El(tag, classNames) {
    var doc = document;
    var el = (tag.nodeType || tag === window) ? tag : doc.createElement(tag);
    var eventHandlers = [];
    if (classNames) {
        el.className = classNames;
    }

    var onShowEvent = ModalEvent();
    var onHideEvent = ModalEvent();

    var addListener = function(event, handler) {
        if (el.addEventListener) {
            el.addEventListener(event, handler, false);
        } else {
            el.attachEvent("on" + event, handler);
        }
        eventHandlers.push({
            event: event,
            handler: handler
        });
    };

    var removeListener = function(event, handler) {
        if (el.removeEventListener) {
            el.removeEventListener(event, handler);
        } else {
            el.detachEvent("on" + event, handler);
        }
        var t = eventHandlers.length;
        var handlerObj;
        while (t-- > 0) {
            handlerObj = eventHandlers[t];
            if (handlerObj.event === event && handlerObj.handler === handler) {
                eventHandlers.splice(t, 1);
                break;
            }
        }
    };

    var addClickListener = function(handler) {
        var throttle = false;
        var throttleHandler = function(e) {
            if (!throttle) {
                throttle = true;
                setTimeout(function() {
                    throttle = false;
                }, 100);
                handler(e);
            }
        };
        addListener("touchstart", throttleHandler);
        addListener("mousedown", throttleHandler);
    };

    var show = function(arg) {
        if (el) {
            el.style.display = "block";
            onShowEvent.fire(arg);
        }
    };

    var hide = function(arg) {
        if (el) {
            el.style.display = "none";
            onHideEvent.fire(arg);
        }
    };

    var isShowing = function() {
        return el.style && el.style.display === "block";
    };

    var html = function(html) {
        if (el) {
            el.innerHTML = html;
        }
    };

    var text = function(text) {
        if (el) {
            html("");
            el.appendChild(doc.createTextNode(text));
        }
    };

    var remove = function() {
        if (el.parentNode) {
            var x = eventHandlers.length;
            var eventHandler;
            while (x-- > 0) {
                eventHandler = eventHandlers[x];
                removeListener(eventHandler.event, eventHandler.handler);
            }
            el.parentNode.removeChild(el);
            onShowEvent.removeAllListeners();
            onHideEvent.removeAllListeners();
        }
    };

    var add = function(elObject) {
        var elementToAppend = elObject.el || elObject;
        el.appendChild(elementToAppend);
    };

    return {
        el: el,
        addListener: addListener,
        addClickListener: addClickListener,
        onShowEvent: onShowEvent,
        onHideEvent: onHideEvent,
        show: show,
        hide: hide,
        isShowing: isShowing,
        html: html,
        text: text,
        remove: remove,
        add: add
    };
}

module.exports = El;
