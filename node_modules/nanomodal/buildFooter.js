
if (typeof window !== "undefined") {
    if (typeof window.define === "function" && window.define.amd) {
        window.define(function() {
            return nanoModal;
        });
    }
    window.nanoModal = nanoModal;
}
if (typeof module !== "undefined") {
    module.exports = nanoModal;
}
