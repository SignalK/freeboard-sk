if (!require) {
    var require = function(src) {
        var noop = function() {};
        var sources = {
            "./ModalEvent": window.ModalEvent || noop
        };
        var requiredFunction = sources[src];
        if (requiredFunction === noop) {
            console.warn("Could not find required module: " + src);
        }
        return requiredFunction;
    }
}

if (!module) {
    var module = {};
}

function touchClick(el, eventType) {
    if (!eventType) {
        eventType = "ontouchend" in document.documentElement ? "touchstart" : "click";
    }
    var clickEvent = document.createEvent('MouseEvent');
    clickEvent.initMouseEvent(eventType, true, true, window,
        0, 0, 0, 0, 0, false, false, false, false, 0, null);

    el.dispatchEvent(clickEvent);
}
