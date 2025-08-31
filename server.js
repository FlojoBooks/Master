// server.js (Versie 11: "Hybrid Method - Fast ID & Cookie Fetch")
const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const AnonymizeUAPlugin = require('puppeteer-extra-plugin-anonymize-ua');
puppeteer.use(AnonymizeUAPlugin());
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

// IMPORTANT: Replace with your actual proxy URL
const PROXY_SERVER = process.env.PROXY_SERVER || 'http://your.proxy.server:port'; 
let agent = null;
try {
    agent = new HttpsProxyAgent(PROXY_SERVER);
    console.log('HttpsProxyAgent created:', agent);
} catch (error) {
    console.error('Error creating HttpsProxyAgent:', error.message);
    // Fallback to no proxy or exit if agent creation fails
    agent = null;
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Serve the React build (if present)
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.post('/api/get-event-data', async (req, res) => {
    const { eventUrl, cookieString } = req.body;

    if (!eventUrl || !cookieString) {
        return res.status(400).json({ error: 'Event URL and cookie string are required.' });
    }

    const eventIdMatch = eventUrl.match(/(\d+)(?!.*\d)/);
    const eventId = eventIdMatch ? eventIdMatch[0] : null;

    if (!eventId) {
        return res.status(400).json({ error: 'Could not extract Event ID from the provided URL.' });
    }

    let browser = null;
    try {
        console.log(`Received Event ID: ${eventId}`);
        
        // 1. Parse the proxy URL to separate auth from the host
        const proxyUrl = new URL(PROXY_SERVER);
        const proxyHost = `${proxyUrl.hostname}:${proxyUrl.port}`;
        const proxyUsername = proxyUrl.username;
        const proxyPassword = proxyUrl.password;

        console.log(`Using proxy host: ${proxyHost}`);

        // Build the API URL
        const apiUrl = `https://availability.ticketmaster.nl/api/v2/TM_NL/availability/${eventId}?subChannelId=1`;

        console.log("Launching Puppeteer to fetch API data...");
        browser = await puppeteer.launch({
            headless: true,
            args: [
                // 2. Provide the proxy host WITHOUT authentication
                `--proxy-server=${proxyHost}`,
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();

        // 3. Set up authentication
        if (proxyUsername && proxyPassword) {
            await page.authenticate({ username: proxyUsername, password: proxyPassword });
            console.log("Set up proxy authentication.");
        }

        // Set a realistic viewport to make the browser look more human
        await page.setViewport({ width: 1920, height: 1080 });
        console.log("Set viewport to 1920x1080.");

        // Warm up the browser by visiting the homepage to get session cookies
        console.log("Warming up browser by visiting the homepage...");
        await page.goto('https://www.ticketmaster.nl/event/avond-van-de-filmmuziek-tickets/3001', { waitUntil: 'domcontentloaded' });
        console.log("Homepage visited. Necessary session cookies should be set.");

        // Go to the API URL
        console.log(`Navigating to: ${apiUrl}`);
        const response = await page.goto(apiUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 // Increase timeout to 60 seconds as a safeguard
        });

        if (!response.ok()) {
             throw new Error(`Puppeteer received non-ok response: ${response.status()} ${response.statusText()}`);
        }

        const jsonContent = await page.evaluate(() => document.body.innerText);
        
        if (jsonContent.includes('Forbidden') || jsonContent.includes('blocked')) {
            console.error("API response indicates a block:", jsonContent);
            throw new Error('The request was blocked by the API.');
        }

        const data = JSON.parse(jsonContent);

        console.log("Successfully received data from the API via Puppeteer!");
        res.json(data);

    } catch (error) {
        console.error("Backend error (Puppeteer):", error.message);
        res.status(500).json({ error: 'An error occurred on the server side with Puppeteer.', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
            console.log("Puppeteer browser closed.");
        }
    }
});

// Fallback to index.html for client-side routing
app.use((req, res, next) => {
	if (req.method === 'GET' && !req.path.startsWith('/api')) {
		res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
	} else {
		next();
	}
});

app.listen(port, () => {
	console.log(`Server draait op http://localhost:${port}`);
});
