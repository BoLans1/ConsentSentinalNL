
// List of endpoints to check, including regex patterns
const thirdPartyEndpoints = [
  {
    id: "ga request",
    regex: /^https:\/\/(www|region\d+)\.(google-analytics|analytics\.google)\.com\/(\w\/)?collect/
  },
  {
    id: "aa request",
    regex: /^http(s)?:\/\/([^\/]*)\/b\/ss\/([^\/]*)\/[0-9]{1,2}\/([^\/]*)\/(s[0-9]*)((?!pccr=true).)*$/
  },
  {
    id: "ads request",
    regex: /googleads\.g\.doubleclick\.net\/pagead\/viewthrough/
  },
  {
    id: "doubleclick request",
    regex: /(?:fls|ad)\.doubleclick\.net\/activityi?;(?!.*dc_pre)/
  },
  {
    id: "tealium collect request",
    regex: /^https:\/\/collect.*tealiumiq\.com.*(i\.gif|event)$/
  },
  {
    id: "facebook request",
    regex: /facebook\.com\/tr\/?(?!.*&ev=microdata)\?/i
  },
  {
    id: "linkedin request",
    regex: /^https:\/\/px\.ads\.linkedin\.com\/collect\?/
  },
  {
    id: "awin request",
    regex: /http(s){0,1}:\/\/www\.awin1\.com\/sread\.img/
  },
  {
    id: "r42 request",
    regex: /^http(s):\/\/(t\.svtrd\.com|tdn\.r42tag\.com|admin\.relay42\.com)\/(tags-|t-|s-|syncResponse\?ca_site=)([0-9]+)/
  },
  {
    id: "amazon request",
    regex: /^https:\/\/[a-z\-]+\.amazon-adsystem\.com\/s\/iu3.*(event=)/
  },
  {
    id: "bing request",
    regex: /^https:\/\/bat\.bing\.com\/action\/.*(evt=)/
  },
  {
    id: "pinterest request",
    regex: /^https:\/\/ct\.pinterest\.com\/v3\/.*(event=)/
  },
  {
    id: "snapchat request",
    regex: /^https:\/\/tr\.snapchat\.com\/p/
  },
  {
    id: "tiktok request",
    regex: /^https:\/\/analytics\.tiktok\.com\/api\/v2\/pixel/
  },
  {
    id: "reddit request",
    regex: /^https:\/\/alb\.reddit\.com\/rp\.gif.*(event=)/
  },
  {
    id: "snowplow get request",
    regex: /^https:\/\/[^\/]+\/i\?(?=.*&e=)(?=.*&tna=.*)(?=.*&aid=.*)/
  },
  {
    id: "snowplow request",
    regex: /^https:\/\/.*\/.*snowplow/
  },
  {
    id: "adform request",
    regex: /^https:\/\/track\.adform\.net\/Serving\/TrackPoint\//
  },
  {
    id: "gtmss request",
    regex: /^https:\/\/.*\/(collect|metrics|data).*?((?=.*sst\..{3,4}\=))/
  }
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
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get cookies after reload
    const cookiesAfter = await getAllCookiesForDomain(domain);
    console.log('Cookies after reload:', cookiesAfter);

    // Get cookie operations from content script
    let cookieOps = { cookieOperations: [] };
    try {
      cookieOps = await getCookieOperations(tabId);
    } catch (error) {
      console.log('Error getting cookie operations:', error);
    }
    console.log('Cookie operations:', cookieOps);

    // Check local and session storage
    let storageData = { result: { localStorage: {}, sessionStorage: {} } };
    try {
      storageData = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: getStorageData,
      });
    } catch (error) {
      console.log('Error getting storage data:', error);
    }
    console.log('Storage data after reload:', storageData[0]?.result || storageData);

    updateProgress('Scan complete');

    // Return results
    const result = {
      sharesData: cookiesAfter.length > 0 || thirdPartyRequests.length > 0,
      cookiesBefore: cookiesBefore,
      cookiesAfter: cookiesAfter,
      thirdPartyRequests: thirdPartyRequests,
      cookieOperations: cookieOps.cookieOperations,
      localStorage: storageData[0]?.result?.localStorage || {},
      sessionStorage: storageData[0]?.result?.sessionStorage || {}
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
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'getCookieOperations' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Error sending message:', chrome.runtime.lastError);
        resolve({ cookieOperations: [] });
      } else {
        resolve(response || { cookieOperations: [] });
      }
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
    if (details.tabId === currentTabId) {
      for (const endpoint of thirdPartyEndpoints) {
        if (endpoint.regex.test(details.url)) {
          thirdPartyRequests.push({
            id: endpoint.id,
            url: details.url
          });
          console.log(`Third-party request detected (${endpoint.id}):`, details.url);
          break;
        }
      }
    }
  },
  { urls: ["<all_urls>"] }
);
console.log('Background script loaded');