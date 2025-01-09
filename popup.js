document.addEventListener('DOMContentLoaded', function() {
    const scanButton = document.getElementById('scanButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const results = document.getElementById('results');
    const cookieList = document.getElementById('cookieList');
    const trackerList = document.getElementById('trackerList');
    const initialInfo = document.getElementById('initialInfo');
    const objectionInfo = document.getElementById('objectionInfo');
    const generateEmailButton = document.getElementById('generateEmailButton');
  
    const trackerNames = {
      "ga request": "Google Analytics",
      "aa request": "Adobe Analytics",
      "ads request": "Google Ads",
      "doubleclick request": "DoubleClick",
      "facebook request": "Facebook",
      "linkedin request": "LinkedIn",
      "awin request": "AWIN",
      "amazon request": "Amazon",
      "bing request": "Bing",
      "pinterest request": "Pinterest",
      "snapchat request": "Snapchat",
      "tiktok request": "TikTok",
      "reddit request": "Reddit",
      "snowplow request": "Snowplow",
      "adform request": "AdForm",
      "gtmss request": "Google Analytics (Server Side)"
    };
  
    scanButton.addEventListener('click', function() {
      scanButton.disabled = true;
      initialInfo.classList.add('hidden');
      progressContainer.classList.remove('hidden');
      results.classList.add('hidden');
      objectionInfo.classList.add('hidden');
      updateProgress(0, 'Initiating scan...');
  
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.runtime.sendMessage({action: 'scanWebsite', tabId: tabs[0].id}, function(response) {
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
        displayResults(message.result);
        scanButton.disabled = false;
      }
    });
  
    function updateProgress(percentage, status) {
      progressFill.style.width = `${percentage}%`;
      progressStatus.textContent = status;
    }
  
    function displayResults(result) {
      cookieList.innerHTML = '';
      trackerList.innerHTML = '';
  
      let cookiesFound = false;
      let trackersFound = false;
  
      if (result.cookiesAfter && result.cookiesAfter.length > 0) {
        cookiesFound = true;
        result.cookiesAfter.forEach(cookie => {
          const li = document.createElement('li');
          li.innerHTML = `<i class="fas fa-cookie"></i> ${cookie.name}`;
          li.addEventListener('click', function() {
            const valueElement = this.querySelector('.cookie-value');
            if (valueElement) {
              valueElement.style.display = valueElement.style.display === 'none' ? 'block' : 'none';
            } else {
              const value = document.createElement('div');
              value.className = 'cookie-value';
              value.textContent = cookie.value;
              this.appendChild(value);
            }
          });
          cookieList.appendChild(li);
        });
      } else {
        cookieList.innerHTML = '<li><i class="fas fa-cookie-bite"></i> No cookies found</li>';
      }
  
      if (result.thirdPartyRequests && result.thirdPartyRequests.length > 0) {
        trackersFound = true;
        result.thirdPartyRequests.forEach(request => {
          const li = document.createElement('li');
          li.innerHTML = `<i class="fas fa-satellite-dish"></i> ${trackerNames[request.id] || request.id}`;
          li.addEventListener('click', function() {
            const urlElement = this.querySelector('.tracker-url');
            if (urlElement) {
              urlElement.style.display = urlElement.style.display === 'none' ? 'block' : 'none';
            } else {
              const url = document.createElement('div');
              url.className = 'tracker-url';
              url.textContent = request.url;
              this.appendChild(url);
            }
          });
          trackerList.appendChild(li);
        });
      } else {
        trackerList.innerHTML = '<li><i class="fas fa-shield-alt"></i> No trackers detected</li>';
      }
  
      progressContainer.classList.add('hidden');
      results.classList.remove('hidden');
  
      if (cookiesFound || trackersFound) {
        objectionInfo.classList.remove('hidden');
        generateEmailButton.classList.remove('hidden');
      } else {
        objectionInfo.classList.add('hidden');
        generateEmailButton.classList.add('hidden');
      }
    }
  
    generateEmailButton.addEventListener('click', function() {
      // This function will be implemented later
      alert('Email generation feature coming soon!');
    });
  });