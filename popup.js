document.addEventListener('DOMContentLoaded', function () {
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
  const generateEmailButton = document.getElementById('generateEmailButton');

  let scanResults = null;

  scanButton.addEventListener('click', function () {
    scanButton.disabled = true;
    progressContainer.classList.remove('hidden');
    results.classList.add('hidden');
    objectionInfo.classList.add('hidden');
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateProgress') {
      let percentage;
      switch (message.status) {
        case 'Starting scan...':
          percentage = 20;
          break;
        case 'Browser data cleared':
          percentage = 40;
          break;
        case 'Website reloaded':
          percentage = 60;
          updateProgress(percentage, 'Scanning...');
          return;
        case 'Scan complete':
          percentage = 100;
          break;
        default:
          percentage = 80;
      }
      updateProgress(percentage, message.status);
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
    progressFill.style.width = `${percentage}%`;
    progressStatus.textContent = status;
  }

  function displayResults(result) {
    console.log('Display Results called with:', result);
    console.log('Cookies After:', result.cookiesAfter);
    console.log('Third Party Requests:', result.thirdPartyRequests);

    knownCookieTableBody.innerHTML = '';
    otherCookieList.innerHTML = '';
    trackerList.innerHTML = '';

    let knownCookiesFound = false;
    let otherCookiesFound = false;
    let trackersFound = false;

    if (result.cookiesAfter && result.cookiesAfter.length > 0) {
      result.cookiesAfter.forEach(cookie => {
        const knownCookie = knownCookies.find(known => known.regex.test(cookie.name));
        if (knownCookie) {
          knownCookiesFound = true;
          const row = knownCookieTableBody.insertRow();
          row.insertCell(0).textContent = cookie.name;
          row.insertCell(1).textContent = knownCookie.company;
          const actionCell = row.insertCell(2);
          const infoButton = document.createElement('button');
          infoButton.textContent = 'Info';
          infoButton.className = 'info-button';
          infoButton.addEventListener('click', () => {
            actionCell.textContent = knownCookie.description;
          });
          actionCell.appendChild(infoButton);
        } else {
          otherCookiesFound = true;
          const li = document.createElement('li');
          li.textContent = cookie.name;
          const valueButton = document.createElement('button');
          valueButton.textContent = 'Show Value';
          valueButton.className = 'value-button';
          valueButton.addEventListener('click', () => {
            const valueElement = li.querySelector('.cookie-value');
            if (valueElement) {
              valueElement.remove();
              valueButton.textContent = 'Show Value';
            } else {
              const value = document.createElement('div');
              value.className = 'cookie-value';
              value.textContent = cookie.value;
              li.appendChild(value);
              valueButton.textContent = 'Hide Value';
            }
          });
          li.appendChild(valueButton);
          otherCookieList.appendChild(li);
        }
      });
    }

    if (result.thirdPartyRequests && result.thirdPartyRequests.length > 0) {
      trackersFound = true;
      result.thirdPartyRequests.forEach(request => {
        const li = document.createElement('li');
        li.textContent = request.id; // Display the tracker type
        const payloadButton = document.createElement('button');
        payloadButton.textContent = 'Show tracker payload';
        payloadButton.className = 'payload-button';
        payloadButton.addEventListener('click', function () {
          const payloadElement = this.nextElementSibling;
          if (payloadElement && payloadElement.classList.contains('tracker-payload')) {
            payloadElement.classList.toggle('hidden');
            this.textContent = payloadElement.classList.contains('hidden') ? 'Show tracker payload' : 'Hide tracker payload';
          } else {
            const payload = document.createElement('div');
            payload.className = 'tracker-payload';

            // Parse and display payload as key-value pairs
            const payloadData = parsePayload(request.payload);
            if (Object.keys(payloadData).length > 0) {
              const table = document.createElement('table');
              table.className = 'payload-table';
              for (const [key, value] of Object.entries(payloadData)) {
                const row = table.insertRow();
                const keyCell = row.insertCell(0);
                const valueCell = row.insertCell(1);
                keyCell.textContent = key;
                valueCell.textContent = value;
              }
              payload.appendChild(table);
            } else {
              payload.textContent = 'No payload available';
            }

            li.insertBefore(payload, this.nextSibling);
            this.textContent = 'Hide tracker payload';
          }
        });
        li.appendChild(payloadButton);
        trackerList.appendChild(li);
      });
    } else {
      trackerList.innerHTML = '<li>No trackers detected</li>';
    }

    function parsePayload(payload) {
      const result = {};
      if (typeof payload === 'string') {
        // Try to parse as URL parameters
        const params = new URLSearchParams(payload);
        for (const [key, value] of params) {
          result[key] = value;
        }
      } else if (typeof payload === 'object') {
        // If it's already an object, use it directly
        return payload;
      }
      return result;
    }

    toggleOtherCookiesButton.addEventListener('click', function () {
      otherCookieList.classList.toggle('hidden');
      this.textContent = otherCookieList.classList.contains('hidden') ? 'Show other found cookies' : 'Hide other found cookies';
    });

    progressContainer.classList.add('hidden');
    results.classList.remove('hidden');

    if (knownCookiesFound || otherCookiesFound || trackersFound) {
      objectionInfo.classList.remove('hidden');
    } else {
      objectionInfo.classList.add('hidden');
    }

    console.log('Known Cookies:', result.cookiesAfter.filter(cookie => knownCookies.some(known => known.regex.test(cookie.name))));
    console.log('Other Cookies:', result.cookiesAfter.filter(cookie => !knownCookies.some(known => known.regex.test(cookie.name))));
  }

  exportButton.addEventListener('click', function () {
    if (scanResults) {
      exportResults(scanResults);
    } else {
      alert('No scan results available. Please perform a scan first.');
    }
  });

  function exportResults(result) {
    let hostname = "Unknown";
    try {
      if (result.url) {
        hostname = new URL(result.url).hostname;
      }
    } catch (error) {
      console.error("Invalid URL:", result.url);
    }

    let exportText = `Export of cookies and trackers found on: ${hostname}\n\n`;

    exportText += "Known Tracking Cookies Found:\n";
    exportText += "Cookie Name | Associated Company | Description\n";
    exportText += "------------|---------------------|-------------\n";
    result.cookiesAfter.forEach(cookie => {
      const knownCookie = knownCookies.find(known => known.regex.test(cookie.name));
      if (knownCookie) {
        exportText += `${cookie.name} | ${knownCookie.company} | ${knownCookie.description}\n`;
      }
    });

    exportText += "\nOther Cookies Found:\n";
    exportText += "Cookie Name | Value\n";
    exportText += "------------|------\n";
    result.cookiesAfter.forEach(cookie => {
      if (!knownCookies.some(known => known.regex.test(cookie.name))) {
        exportText += `${cookie.name} | ${cookie.value}\n`;
      }
    });

    exportText += "\nTrackers Detected:\n";
    result.thirdPartyRequests.forEach(request => {
      exportText += `${request.url}\n`;
    });

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: 'consent_sentinel_results.txt',
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url);
    });
  }

  generateEmailButton.addEventListener('click', function () {
    // This function will be implemented later
    alert('Email generation feature coming soon!');
  });
});