function ModalEvent() {
    var listeners = {};
    var nextListenerId = 0;

    var addListener = function(callback) {
        listeners[nextListenerId] = callback;
        return nextListenerId++;
    };

    var removeListener = function(id) {
        if (id) {
            delete listeners[id];
        }
    };

    var removeAllListeners = function() {
        listeners = {};
    };

    var fire = function() {
        for (var x = 0, num = nextListenerId; x < num; ++x) {
            if (listeners[x]) {
                listeners[x].apply(null, arguments);
            }
        }
    };

    return {
        addListener: addListener,
        removeListener: removeListener,
        removeAllListeners: removeAllListeners,
        fire: fire
    };
}

module.exports = ModalEvent;
