document.getElementById('scanButton').addEventListener('click', function () {
    const progressDiv = document.getElementById('progress');
    const resultsDiv = document.getElementById('results');

    progressDiv.textContent = 'Initiating scan...';
    resultsDiv.textContent = '';

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
            chrome.runtime.sendMessage({ action: 'scanWebsite', tabId: tabs[0].id }, function (response) {
                if (response.status === 'Scan initiated') {
                    progressDiv.textContent = 'Scan in progress...';
                }
            });
        } else {
            progressDiv.textContent = 'No active tab found. Please open a website and try again.';
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const progressDiv = document.getElementById('progress');
    const resultsDiv = document.getElementById('results');

    if (message.action === 'updateProgress') {
        progressDiv.textContent = message.status;
    } else if (message.action === 'scanComplete') {
        progressDiv.textContent = 'Scan complete!';
        resultsDiv.textContent = `Scanned URL: ${message.url}\n\n`;
        resultsDiv.textContent += `Shares data without consent: ${message.result.sharesData ? 'Yes' : 'No'}\n\n`;

        if (message.result.cookies.length > 0) {
            resultsDiv.textContent += 'Third-party cookies found:\n';
            message.result.cookies.forEach(cookie => {
                resultsDiv.textContent += `- ${cookie.name}: ${cookie.value}\n`;
            });
        } else {
            resultsDiv.textContent += 'No third-party cookies found.\n';
        }

        if (message.result.thirdPartyRequests.length > 0) {
            resultsDiv.textContent += '\nThird-party requests detected:\n';
            message.result.thirdPartyRequests.forEach(request => {
                resultsDiv.textContent += `- ${request}\n`;
            });
        } else {
            resultsDiv.textContent += '\nNo third-party requests detected.';
        }
    }
});