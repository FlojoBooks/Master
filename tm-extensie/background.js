// background.js - De Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background.js: Received message:', request);
  // Luister naar berichten van de webapplicatie
  if (request.type === 'GET_EVENT_DATA' && request.eventUrl) {
    // Bestaande logica voor het ophalen van event data
    // ...
  } else if (request.type === 'GET_TM_COOKIE') {
    (async () => {
      try {
        const cookies = await chrome.cookies.getAll({ domain: ".ticketmaster.nl" });
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        sendResponse({ success: true, cookieString });
        console.log('Background.js: Sending TM_COOKIE_RESPONSE with success.');
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Houdt de message port open voor het asynchrone antwoord
  }

  // Luister alleen naar berichten met het type 'GET_EVENT_DATA'
  if (request.type === 'GET_EVENT_DATA' && request.eventUrl) {
    // Start het asynchrone proces en geef aan dat we later antwoorden
    (async () => {
      try {
        const { eventInfo, cookieString, eventId } = await fetchEventData(request.eventUrl);
        sendResponse({ success: true, eventInfo, cookieString, eventId });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Houdt de message port open voor het asynchrone antwoord
  }
});

/**
 * Voert het volledige scrape- en fetch-proces uit.
 * @param {string} eventUrl De URL van het evenement.
 * @returns {Promise<object>} Een object met eventInfo en availabilityData.
 */
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
    if (cookieString.length < 200) throw new Error("Onvolledige cookie ontvangen. Anti-bot is mogelijk actief.");

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

/**
 * Deze functie wordt IN de Ticketmaster-pagina geïnjecteerd om de data te lezen.
 */
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