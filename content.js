let cookieOperations = [];

// Intercept cookie operations
(function(cookieStore) {
    const originalDocCookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
        get: function() {
            return originalDocCookieDesc.get.call(this);
        },
        set: function(val) {
            cookieOperations.push({type: 'set', cookie: val});
            return originalDocCookieDesc.set.call(this, val);
        }
    });
})(document.cookie);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCookieOperations') {
        sendResponse({cookieOperations: cookieOperations});
        cookieOperations = []; // Clear after sending
    }
});

console.log('Content script loaded');