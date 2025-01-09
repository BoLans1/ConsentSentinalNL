// List of endpoints to check (you'll need to provide the full list)
const thirdPartyEndpoints = [
    'https://googleads.g.doubleclick.net/',
    // Add more endpoints here
];

// List of third-party cookies to check (you'll need to provide the full list)
const thirdPartyCookies = [
    // Add cookie names here
];

let currentTabId = null;
let thirdPartyRequests = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanWebsite') {
        currentTabId = request.tabId;
        thirdPartyRequests = [];
        scanWebsite(request.tabId);
        sendResponse({ status: 'Scan initiated' });
    }
    return true;
});

function updateProgress(status) {
    chrome.runtime.sendMessage({ action: 'updateProgress', status: status });
}

async function scanWebsite(tabId) {
    if (!tabId) {
        console.error('No tab ID provided');
        return;
    }

    updateProgress('Starting scan...');

    try {
        const tab = await chrome.tabs.get(tabId);
        const url = new URL(tab.url);
        const domain = url.hostname;

        updateProgress(`Scanning: ${tab.url}`);

        // Get cookies before clearing
        const cookiesBefore = await getAllCookiesForDomain(domain);
        console.log('Cookies before clearing:', cookiesBefore);

        // Clear browser data
        await clearBrowserDataForSite(tabId, domain);

        updateProgress('Browser data cleared');

        // Reload the website
        await chrome.tabs.reload(tabId);

        updateProgress('Website reloaded');

        // Wait longer for the page to load and scripts to run
        await new Promise(resolve => setTimeout(resolve, 15000));

        // Get cookies after reload
        const cookiesAfter = await getAllCookiesForDomain(domain);
        console.log('Cookies after reload:', cookiesAfter);

        // Get cookie operations from content script
        const cookieOps = await getCookieOperations(tabId);
        console.log('Cookie operations:', cookieOps);

        // Check local and session storage
        const storageData = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: getStorageData,
        });
        console.log('Storage data after reload:', storageData[0].result);

        updateProgress('Scan complete');

        // Return results
        const result = {
            sharesData: cookiesAfter.length > 0 || thirdPartyRequests.length > 0,
            cookiesBefore: cookiesBefore,
            cookiesAfter: cookiesAfter,
            thirdPartyRequests: thirdPartyRequests,
            cookieOperations: cookieOps.cookieOperations,
            localStorage: storageData[0].result.localStorage,
            sessionStorage: storageData[0].result.sessionStorage
        };

        chrome.runtime.sendMessage({
            action: 'scanComplete',
            result: result,
            url: tab.url
        });

    } catch (error) {
        console.error('Error during website scan:', error);
        updateProgress('Error during scan');
    }
}

async function getCookieOperations(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'getCookieOperations' }, (response) => {
            resolve(response || { cookieOperations: [] });
        });
    });
}

async function clearBrowserDataForSite(tabId, domain) {
    console.log('Clearing data for domain:', domain);

    // Clear all cookies for the domain and its subdomains
    const allCookies = await getAllCookiesForDomain(domain);
    console.log('Cookies before clearing:', allCookies);
    for (let cookie of allCookies) {
        await chrome.cookies.remove({ url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`, name: cookie.name });
    }
    const remainingCookies = await getAllCookiesForDomain(domain);
    console.log('Cookies after clearing:', remainingCookies);

    // Clear cache for the domain
    await chrome.browsingData.removeCache({ origins: [`https://${domain}`] });

    // Clear local and session storage
    await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: clearStorageData,
    });

    console.log('Finished clearing data for domain:', domain);
}

async function getAllCookiesForDomain(domain) {
    const allCookies = await chrome.cookies.getAll({});
    return allCookies.filter(cookie =>
        cookie.domain === domain ||
        cookie.domain === '.' + domain ||
        domain.endsWith(cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain)
    );
}

function clearStorageData() {
    console.log('Local storage before clearing:', { ...localStorage });
    console.log('Session storage before clearing:', { ...sessionStorage });
    localStorage.clear();
    sessionStorage.clear();
    console.log('Local storage after clearing:', { ...localStorage });
    console.log('Session storage after clearing:', { ...sessionStorage });
    return 'Storage cleared';
}

function getStorageData() {
    return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
    };
}

// Listen for web requests to check for third-party endpoints
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.tabId === currentTabId &&
            thirdPartyEndpoints.some(endpoint => details.url.startsWith(endpoint))) {
            thirdPartyRequests.push(details.url);
            console.log('Third-party request detected:', details.url);
        }
    },
    { urls: ["<all_urls>"] }
);

console.log('Background script loaded');