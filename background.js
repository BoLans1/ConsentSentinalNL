
// List of endpoints to check, including regex patterns
const thirdPartyEndpoints = [
  {
    id: "Google Analytics",
    regex: /^https:\/\/(www|region\d+)\.(google-analytics|analytics\.google)\.com\/(\w\/)?collect/
  },
  {
    id: "Comscore",
    regex: /^https:\/\/sb\.scorecardresearch.com\//
  },
  {
    id: "Adobe Analytics",
    regex: /^http(s)?:\/\/([^\/]*)\/b\/ss\/([^\/]*)\/[0-9]{1,2}\/([^\/]*)\/(s[0-9]*)((?!pccr=true).)*$/
  },
  {
    id: "Google Ads",
    regex: /googleads\.g\.doubleclick\.net\/pagead\/viewthrough/
  },
  {
    id: "DoubleClick Ads",
    regex: /(?:fls|ad)\.doubleclick\.net\/activityi?;(?!.*dc_pre)/
  },
  {
    id: "Facebook",
    regex: /facebook\.com\/tr\/?(?!.*&ev=microdata)\?/i
  },
  {
    id: "LinkedIn",
    regex: /^https:\/\/px\.ads\.linkedin\.com\/collect\?/
  },
  {
    id: "AWIN (Affiliate Marketing)",
    regex: /http(s){0,1}:\/\/www\.awin1\.com\/sread\.img/
  },
  {
    id: "Amazon",
    regex: /^https:\/\/[a-z\-]+\.amazon-adsystem\.com\/s\/iu3.*(event=)/
  },
  {
    id: "Bing Ads",
    regex: /^https:\/\/bat\.bing\.com\/action\/.*(evt=)/
  },
  {
    id: "Pinterest",
    regex: /^https:\/\/ct\.pinterest\.com\/v3\/.*(event=)/
  },
  {
    id: "Snapchat",
    regex: /^https:\/\/tr\.snapchat\.com\/p/
  },
  {
    id: "TikTok",
    regex: /^https:\/\/analytics\.tiktok\.com\/api\/v2\/pixel/
  },
  {
    id: "Reddit",
    regex: /^https:\/\/alb\.reddit\.com\/rp\.gif.*(event=)/
  },
  {
    id: "AdForm",
    regex: /^https:\/\/track\.adform\.net\/Serving\/TrackPoint\//
  },
  {
    id: "Google Analytics (Server Side)",
    regex: /^https:\/\/.*\/(collect|metrics|data).*?((?=.*sst\..{3,4}\=))/
  }
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

    // Step 1: Clear all browser data
    await clearBrowserDataForSite(tabId, domain);
    updateProgress('Initial browser data cleared');

    // Step 2: Reload the website
    await chrome.tabs.reload(tabId);
    updateProgress('Website reloaded (first time)');

    // Step 3: Wait a short period
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Clear the browser data again
    await clearBrowserDataForSite(tabId, domain);
    updateProgress('Browser data cleared again');

    // Step 5: Reload the website again
    await chrome.tabs.reload(tabId);
    updateProgress('Website reloaded (second time)');

    // Step 6: Wait a short period
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Get cookies that are placed
    const cookiesAfter = await getAllCookiesForDomain(domain);
    console.log('Cookies after final reload:', cookiesAfter);

    updateProgress('Scan complete');

    // Return results
    const result = {
      cookiesAfter: cookiesAfter,
      thirdPartyRequests: thirdPartyRequests
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

async function clearBrowserDataForSite(tabId, domain) {
  console.log('Clearing data for domain:', domain);

  // Clear browsing data
  await chrome.browsingData.remove({
    "origins": [`https://${domain}`]
  }, {
    "cache": true,
    "cookies": true,
    "fileSystems": true,
    "indexedDB": true,
    "localStorage": true,
    "serviceWorkers": true,
    "webSQL": true
  });

  // Clear cache storage
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: clearCacheStorage,
  });

  // Clear storage in all frames
  await chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: true },
    function: clearAllStorage,
  });

  console.log('Finished clearing data for domain:', domain);
}

function clearCacheStorage() {
  if ('caches' in window) {
    caches.keys().then(function (names) {
      for (let name of names) caches.delete(name);
    });
  }
}

function clearAllStorage() {
  localStorage.clear();
  sessionStorage.clear();

  if (window.indexedDB) {
    window.indexedDB.databases().then(dbs => {
      for (let db of dbs) {
        window.indexedDB.deleteDatabase(db.name);
      }
    });
  }

  if (window.openDatabase) {
    let dbs = ["mydb", "mydb2"]; // Add known database names
    for (let dbname of dbs) {
      let db = openDatabase(dbname, "", "");
      db.transaction(tx => {
        tx.executeSql('DROP TABLE IF EXISTS myTable', [], () => { }, () => { });
      });
    }
  }
}

async function getAllCookiesForDomain(domain) {
  const allCookies = await chrome.cookies.getAll({});
  return allCookies.filter(cookie =>
    cookie.domain === domain ||
    cookie.domain === '.' + domain ||
    domain.endsWith(cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain)
  );
}

// Listen for web requests to check for third-party endpoints
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId === currentTabId) {
      for (const endpoint of thirdPartyEndpoints) {
        if (endpoint.regex.test(details.url)) {
          thirdPartyRequests.push({
            id: endpoint.id,
            url: details.url,
            payload: details.method === 'POST' ? JSON.stringify(details.requestBody) : new URL(details.url).search.substr(1)
          });
          console.log(`Third-party request detected (${endpoint.id}):`, details.url);
          break;
        }
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

console.log('Background script loaded');