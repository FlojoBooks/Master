// server.js (Versie 11: "Hybrid Method - Fast ID & Cookie Fetch")
const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Serve the React build (if present)
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.post('/api/get-event-data', async (req, res) => {
    const { eventUrl } = req.body;
    if (!eventUrl) {
        return res.status(400).json({ error: 'Event URL is verplicht.' });
    }

    let browser = null;
    try {
        // Stap 1: Haal de Event ID direct uit de URL. (SNEL)
        const match = eventUrl.match(/(\d+)(?!.*\d)/);
        if (!match || !match[0]) {
            throw new Error('Kon geen geldige Event ID (nummer) vinden in de URL.');
        }
        const eventId = match[0];
        console.log(`Stap 1: Event ID gevonden: ${eventId}`);

        // Stap 2: Start een headless browser om een geldige cookie te krijgen. (NODIG VOOR 403-FOUT)
        console.log("Stap 2: Bezig met starten van headless browser om cookie op te halen...");
        browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
		});
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigeer naar de pagina om de sessie te initialiseren
        await page.goto(eventUrl, { waitUntil: 'networkidle2' });
        
        // Haal de cookies op nadat de pagina volledig is geladen
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        if (cookieString.length < 200) {
            // Veiligheidscheck: als de cookie te kort is, is het waarschijnlijk misgegaan.
            throw new Error(`Onvolledige cookie ontvangen (lengte: ${cookieString.length}). Anti-bot mogelijk actief.`);
        }
        console.log(`Stap 2: Succesvol een geldige cookie verkregen (lengte: ${cookieString.length}).`);

        // Stap 3: Bouw de API URL met de ID.
        const apiUrl = `https://availability.ticketmaster.nl/api/v2/TM_NL/availability/${eventId}?subChannelId=1`;

        // Stap 4: Doe het API-verzoek met de verkregen cookie.
        console.log("Stap 3: Bezig met API-verzoek inclusief cookie...");
        const apiResponse = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'Referer': eventUrl,
                'Cookie': cookieString,
            }
        });

        if (!apiResponse.ok) {
            throw new Error(`Ticketmaster API reageerde met status ${apiResponse.status} (${apiResponse.statusText})`);
        }

        const data = await apiResponse.json();
        console.log("Stap 4: Succesvol data ontvangen van de API!");
        res.json(data);

    } catch (error) {
        console.error("Fout in backend:", error.message);
        res.status(500).json({ error: 'Er is een fout opgetreden aan de serverkant.', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(port, () => {
	console.log(`Server draait op http://localhost:${port}`);
});