let cookieOperations = [];

// Intercept cookie operations
(function (cookieStore) {
    cookieStore.set = new Proxy(cookieStore.set, {
        apply: function (target, thisArg, argumentsList) {
            cookieOperations.push({ type: 'set', cookie: argumentsList[0] });
            return Reflect.apply(target, thisArg, argumentsList);
        }
    });

    cookieStore.delete = new Proxy(cookieStore.delete, {
        apply: function (target, thisArg, argumentsList) {
            cookieOperations.push({ type: 'delete', cookie: argumentsList[0] });
            return Reflect.apply(target, thisArg, argumentsList);
        }
    });
})(document.cookie);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCookieOperations') {
        sendResponse({ cookieOperations: cookieOperations });
        cookieOperations = []; // Clear after sending
    }
});