function exportResults(result, hostname, logoDataUrl) {
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consent Sentinel Report - ${hostname}</title>
        <style>
            body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
    color: #333;
    line-height: 1.6;
}

.container {
    background-color: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

h1, h2 {
    color: #1a2b49;
    margin-top: 0;
}

h1 {
    text-align: center;
    color: #ff6600;
    font-size: 28px;
    margin-bottom: 20px;
    border-bottom: 2px solid #ff6600;
    padding-bottom: 15px;
}

.logo {
    display: block;
    margin: 0 auto 20px;
    width: 100px;
    height: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
    table-layout: fixed;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

th, td {
    border: 1px solid #ddd;
    padding: 15px;
    text-align: left;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

th {
    background-color: #ff6600;
    color: white;
    font-weight: bold;
}

tr:nth-child(even) {
    background-color: #f9f9f9;
}

tr:hover {
    background-color: #f0f0f0;
    transition: background-color 0.2s;
}

.info-button {
    background-color: #ff6600;
    color: white;
    border: none;
    padding: 8px 15px;
    cursor: pointer;
    border-radius: 6px;
    font-weight: bold;
    transition: background-color 0.3s, transform 0.1s;
}

.info-button:hover {
    background-color: #e65c00;
    transform: translateY(-2px);
}

.info-button:active {
    transform: translateY(1px);
}

.section {
    margin-bottom: 40px;
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

h2 {
    font-size: 24px;
    border-bottom: 2px solid #ff6600;
    padding-bottom: 10px;
    margin-bottom: 20px;
}

/* Additional styles for better readability and structure */
p {
    margin-bottom: 15px;
}

ul, ol {
    margin-bottom: 20px;
    margin-top: 10px;
    padding-left: 20px;
}

li {
    margin-bottom: 10px;
}

/* Responsive design for smaller screens */
@media (max-width: 600px) {
    body {
        padding: 10px;
    }

    .container {
        padding: 20px;
    }

    table {
        font-size: 14px;
    }

    th, td {
        padding: 10px;
    }
}
        </style>
    </head>
    <body>
        <div class="container">
            <img src="${logoDataUrl}" alt="Consent Sentinel Logo" class="logo">
            <h1>Consent Sentinel Report</h1>
            <p style="text-align: center;">Scan results for: <strong>${hostname}</strong></p>
            
            <div class="section">
                <h2>Scan Process</h2>
                <p>Consent Sentinel NL followed these steps to scan the website:</p>
                <ol>
                    <li>Cleared all browser data for the site. Inlcuding
                    <ul>Cookies</ul>
                    <ul>All browser storage options</ul>
                    <ul>History</ul>
                    <ul>Chrome Webkit information</ul>
                    </li>
                    <li>Reloaded the website</li>
                    <li>Captured cookies and trackers set during this process</li>
                </ol>
            </div>

            <div class="section">
                <h2>Known Tracking Cookies Found:</h2>
                <p class="section-description">These cookies are known to be used for tracking purposes. They have been identified and matched against our database of known tracking cookies.</p>
                <table>
                    <tr>
                        <th style="width: 25%;">Cookie Name</th>
                        <th style="width: 25%;">Associated Company</th>
                        <th style="width: 50%;">Description</th>
                    </tr>
                    ${result.cookiesAfter.filter(cookie => knownCookies.some(known => known.regex.test(cookie.name)))
      .map(cookie => {
        const knownCookie = knownCookies.find(known => known.regex.test(cookie.name));
        return `
                            <tr>
                                <td>${cookie.name}</td>
                                <td>${knownCookie.company}</td>
                                <td>${knownCookie.description}</td>
                            </tr>
                            `;
      }).join('') || '<tr><td colspan="3">No known tracking cookies found</td></tr>'}
                </table>
            </div>

            <div class="section">
                <h2>Other Cookies Found:</h2>
                <p class="section-description">These cookies were found on the website but are not in our database of known tracking cookies. They may be used for various purposes including functionality, preferences, or potentially tracking.</p>
                <table>
                    <tr>
                        <th style="width: 30%;">Cookie Name</th>
                        <th style="width: 70%;">Value</th>
                    </tr>
                    ${result.cookiesAfter.filter(cookie => !knownCookies.some(known => known.regex.test(cookie.name)))
      .map(cookie => `
                        <tr>
                            <td>${cookie.name}</td>
                            <td>${cookie.value}</td>
                        </tr>
                        `).join('') || '<tr><td colspan="2">No other cookies found</td></tr>'}
                </table>
            </div>

            <div class="section">
                <h2>Trackers Detected:</h2>
                <p class="section-description">These are third-party requests detected during the page load that may be used for tracking or analytics purposes. The payload shows the data being sent to these third parties.</p>
                <table>
                    <tr>
                        <th style="width: 30%;">Tracker Type</th>
                        <th style="width: 70%;">Payload</th>
                    </tr>
                    ${result.thirdPartyRequests.map(request => `
                    <tr>
                        <td>${request.id}</td>
                        <td>${request.payload || 'No payload available'}</td>
                    </tr>
                    `).join('') || '<tr><td colspan="2">No trackers detected</td></tr>'}
                </table>
            </div>
        </div>
    </body>
    </html>
    `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: `consent_sentinel_report_${hostname}.html`,
    saveAs: true
  }, () => {
    URL.revokeObjectURL(url);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const description = document.getElementById('description');
  const scanButton = document.getElementById('scanButton');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressStatus = document.getElementById('progressStatus');
  const results = document.getElementById('results');
  const knownCookieTableBody = document.querySelector('#knownCookieTable tbody');
  const otherCookieList = document.getElementById('otherCookieList');
  const trackerList = document.getElementById('trackerList');
  const toggleOtherCookiesButton = document.getElementById('toggleOtherCookies');
  const exportButton = document.getElementById('exportResults');
  const objectionInfo = document.getElementById('objectionInfo');

  let scanResults = null;

  if (scanButton) {
    scanButton.addEventListener('click', function () {
      this.disabled = true;
      if (description) description.classList.add('hidden');
      if (progressContainer) progressContainer.classList.remove('hidden');
      if (results) results.classList.add('hidden');
      if (objectionInfo) objectionInfo.classList.add('hidden');
      if (exportButton) exportButton.classList.add('hidden');
      updateProgress(0, 'Initiating scan...');

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.runtime.sendMessage({ action: 'scanWebsite', tabId: tabs[0].id }, function (response) {
            if (response && response.status === 'Scan initiated') {
              updateProgress(10, 'Scan in progress...');
            }
          });
        } else {
          updateProgress(100, 'No active tab found. Please open a website and try again.');
          scanButton.disabled = false;
        }
      });
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateProgress') {
      let percentage;
      let detailedStatus;
      switch (message.status) {
        case 'Starting scan...':
          percentage = 20;
          detailedStatus = 'Preparing to clear existing data...';
          break;
        case 'Browser data cleared':
          percentage = 40;
          detailedStatus = 'Existing cookies and storage cleared. Reloading page...';
          break;
        case 'Website reloaded':
          percentage = 60;
          detailedStatus = 'Page reloaded. Analyzing new cookies and trackers...';
          break;
        case 'Scan complete':
          percentage = 100;
          detailedStatus = 'Scan completed. Preparing results...';
          break;
        default:
          percentage = 80;
          detailedStatus = 'Processing scan data...';
      }
      updateProgress(percentage, detailedStatus);
    } else if (message.action === 'scanComplete') {
      scanResults = message.result;
      if (sender.tab && sender.tab.url) {
        scanResults.url = sender.tab.url;
      }
      displayResults(scanResults);
      scanButton.disabled = false;
    }
  });

  function updateProgress(percentage, status) {
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressStatus) progressStatus.textContent = status;
  }

  function displayResults(result) {
    console.log('Display Results called with:', result);
    console.log('Cookies After:', result.cookiesAfter);
    console.log('Third Party Requests:', result.thirdPartyRequests);

    const resultsContainer = document.getElementById('results');
    const knownCookiesSection = document.getElementById('knownCookiesFound');
    const otherCookiesSection = document.getElementById('otherCookiesFound');
    const trackersSection = document.getElementById('trackersFound');

    let knownCookiesFound = false;
    let otherCookiesFound = false;
    let trackersFound = false;

    // Known Tracking Cookies
    const knownTrackingCookies = result.cookiesAfter.filter(cookie =>
      knownCookies.some(known => known.regex.test(cookie.name))
    );

    if (knownTrackingCookies.length > 0) {
      knownCookiesFound = true;
      knownCookiesSection.innerHTML = `
        <h3>Known Tracking Cookies Found:</h3>
        <table id="knownCookieTable">
          <thead>
            <tr>
              <th>Cookie Name</th>
              <th>Associated Company</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${knownTrackingCookies.map(cookie => {
        const knownCookie = knownCookies.find(known => known.regex.test(cookie.name));
        return `
                <tr>
                  <td>${cookie.name}</td>
                  <td>${knownCookie.company}</td>
                  <td>
                    <button class="info-button" data-description="${knownCookie.description}">Info</button>
                  </td>
                </tr>
              `;
      }).join('')}
          </tbody>
        </table>
      `;

      // Add event listeners for info buttons
      document.querySelectorAll('.info-button').forEach(button => {
        button.addEventListener('click', function () {
          const description = this.getAttribute('data-description');
          this.parentElement.innerHTML = description;
        });
      });
    } else {
      knownCookiesSection.innerHTML = '<p class="no-items-message">No known tracking cookies detected</p>';
    }

    // Other Cookies
    const otherCookies = result.cookiesAfter.filter(cookie =>
      !knownCookies.some(known => known.regex.test(cookie.name))
    );

    if (otherCookies.length > 0) {
      otherCookiesFound = true;
      otherCookiesSection.innerHTML = `
        <h3>Other Cookies Found:</h3>
        <button id="toggleOtherCookies">Show other found cookies</button>
        <ul id="otherCookieList" class="hidden">
          ${otherCookies.map(cookie => `
            <li>
              ${cookie.name}
              <button class="value-button" data-value="${cookie.value}">Show Value</button>
              <span class="cookie-value hidden">${cookie.value}</span>
            </li>
          `).join('')}
        </ul>
      `;

      document.getElementById('toggleOtherCookies').addEventListener('click', function () {
        const list = document.getElementById('otherCookieList');
        list.classList.toggle('hidden');
        this.textContent = list.classList.contains('hidden') ? 'Show other found cookies' : 'Hide other found cookies';
      });

      document.querySelectorAll('.value-button').forEach(button => {
        button.addEventListener('click', function () {
          const valueSpan = this.nextElementSibling;
          valueSpan.classList.toggle('hidden');
          this.textContent = valueSpan.classList.contains('hidden') ? 'Show Value' : 'Hide Value';
        });
      });
    } else {
      otherCookiesSection.innerHTML = '<p class="no-items-message">No other cookies found</p>';
    }

    // Trackers
    const trackersWithPayload = result.thirdPartyRequests.filter(request =>
      request.payload && request.payload.trim() !== ''
    );

    if (trackersWithPayload.length > 0) {
      trackersFound = true;
      trackersSection.innerHTML = `
        <h3>Trackers Detected:</h3>
        <ul id="trackerList">
          ${trackersWithPayload.map(request => `
            <li>
              ${request.id}
              <button class="payload-button">Show tracker payload</button>
              <div class="tracker-payload hidden"></div>
            </li>
          `).join('')}
        </ul>
      `;

      document.querySelectorAll('.payload-button').forEach((button, index) => {
        button.addEventListener('click', function () {
          const payloadDiv = this.nextElementSibling;
          if (payloadDiv.classList.contains('hidden')) {
            const payload = parsePayload(trackersWithPayload[index].payload);
            payloadDiv.innerHTML = Object.entries(payload)
              .map(([key, value]) => `<strong>${key}:</strong> ${value}<br>`)
              .join('');
            payloadDiv.classList.remove('hidden');
            this.textContent = 'Hide tracker payload';
          } else {
            payloadDiv.classList.add('hidden');
            this.textContent = 'Show tracker payload';
          }
        });
      });
    } else {
      trackersSection.innerHTML = '<p class="no-items-message">No trackers detected</p>';
    }

    resultsContainer.classList.remove('hidden');
    document.getElementById('exportResults').classList.remove('hidden');

    if (knownCookiesFound || otherCookiesFound || trackersFound) {
      document.getElementById('objectionInfo').classList.remove('hidden');
    } else {
      document.getElementById('objectionInfo').classList.add('hidden');
    }
  }

  function parsePayload(payload) {
    try {
      return JSON.parse(payload);
    } catch (e) {
      const result = {};
      payload.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        result[decodeURIComponent(key)] = decodeURIComponent(value);
      });
      return result;
    }
  }

  function parsePayload(payload) {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch (e) {
        const result = {};
        payload.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          result[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        return result;
      }
    }
    return payload || {};
  }

  toggleOtherCookiesButton.addEventListener('click', function () {
    otherCookieList.classList.toggle('hidden');
    this.textContent = otherCookieList.classList.contains('hidden') ? 'Show other found cookies' : 'Hide other found cookies';
  });

  exportButton.addEventListener('click', function () {
    if (scanResults) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          const hostname = new URL(tabs[0].url).hostname;

          fetch(chrome.runtime.getURL("icons/icon128.png"))
            .then(response => response.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = function () {
                exportResults(scanResults, hostname, reader.result);
              }
              reader.readAsDataURL(blob);
            });
        } else {
          alert('Unable to determine the current website. Please try again.');
        }
      });
    } else {
      alert('No scan results available. Please perform a scan first.');
    }
  });
});