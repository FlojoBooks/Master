// content.js
// Listen for messages from the web page
window.addEventListener('message', (event) => {
  // Only accept messages from our own window and with a specific origin
  if (event.source !== window || event.data.source !== 'ticketmaster-dashboard') {
    return;
  }

  // Forward message to background script
  chrome.runtime.sendMessage(event.data, (response) => {
    // Send response back to the web page
    window.postMessage({ source: 'ticketmaster-extension', ...response }, '*');
  });
});

// Listen for messages from background script (if any, though not strictly needed for this flow)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.source === 'ticketmaster-extension-background') {
    window.postMessage({ source: 'ticketmaster-extension', ...request }, '*');
  }
  return true;
});
