// background.js
console.log("Ticketmaster Data Assistent Service Worker started.");

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log("Received EXTERNAL message:", request, "from", sender.origin || sender.url || "(unknown origin)");

  if (request.type === 'GET_TM_COOKIE') {
    (async () => {
      try {
        const cookies = await chrome.cookies.getAll({ domain: ".ticketmaster.nl" });
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        sendResponse({ success: true, cookieString });
        console.log('Background.js: Sending TM_COOKIE_RESPONSE with success.');
      } catch (error) {
        console.error("Error retrieving cookies:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep the message port open for the asynchronous response
  }

  // If no handler matches, ensure the message port is closed
  // by not returning true, or explicitly returning false.
  // However, for async responses, returning true is essential.
  // If no async response is intended, no return is needed.
});

// Original fetchEventData and scrapePageContent functions (if still needed)
// These functions were part of the original background.js for scraping event data.
// If the web app will still send 'GET_EVENT_DATA' requests, uncomment and integrate.
/*
async function fetchEventData(eventUrl) {
  // Stap 1: Open de pagina in een nieuw, inactief tabblad
  const tab = await chrome.tabs.create({ url: eventUrl, active: false });
  const tabId = tab.id;

  try {
    // Wacht tot de tab volledig geladen is.
    await new Promise(resolve => {
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Stap 2: Injecteer een script om de eventinformatie te scrapen
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: scrapePageContent, // De functie hieronder wordt in de tab uitgevoerd
    });
    const eventInfo = results[0].result;
    if (!eventInfo) throw new Error("Kon event informatie niet van de pagina scrapen.");

    // Stap 3: Haal de cookies op voor het Ticketmaster domein
    const cookies = await chrome.cookies.getAll({ domain: ".ticketmaster.nl" });
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Stap 4: Haal de Event ID uit de URL
    const eventId = (eventUrl.match(/(\d+)(?!.*\d)/) || [])[0];
    if (!eventId) throw new Error('Kon geen Event ID vinden in de URL.');

    // Combineer en retourneer het eindresultaat
    return { eventInfo, cookieString, eventId };

  } finally {
    // Stap 6: Ruim op door de onzichtbare tab te sluiten
    await chrome.tabs.remove(tabId);
  }
}

function scrapePageContent() {
  const titleElement = document.querySelector('h1.event-header__title');
  const venueElement = document.querySelector('a[data-testid="venue-name"]');
  const dateElement = document.querySelector('div[data-testid="event-date"]');
  return {
    title: titleElement ? titleElement.innerText : 'Titel niet gevonden',
    venue: venueElement ? venueElement.innerText : 'Locatie niet gevonden',
    date: dateElement ? dateElement.innerText : 'Datum niet gevonden',
  };
}
*/