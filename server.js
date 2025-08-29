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
    const { eventUrl, cookieString } = req.body;

    if (!eventUrl || !cookieString) {
        return res.status(400).json({ error: 'Event URL and cookie string are required.' });
    }

    const eventIdMatch = eventUrl.match(/(\d+)(?!.*\d)/);
    const eventId = eventIdMatch ? eventIdMatch[0] : null;

    if (!eventId) {
        return res.status(400).json({ error: 'Could not extract Event ID from the provided URL.' });
    }

    try {
        console.log(`Received Event ID: ${eventId}`);
        console.log(`Received Cookie String (length): ${cookieString.length}`);

        // Build the API URL with the ID.
        const apiUrl = `https://availability.ticketmaster.nl/api/v2/TM_NL/availability/${eventId}?subChannelId=1`;

        // Make the API request with the provided cookie.
        console.log("Making API request with provided cookie...");
        const apiResponse = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'Referer': eventUrl, // Use the original eventUrl as Referer
                'Cookie': cookieString,
            }
        });

        if (!apiResponse.ok) {
            throw new Error(`Ticketmaster API responded with status ${apiResponse.status} (${apiResponse.statusText})`);
        }

        const data = await apiResponse.json();
        console.log("Successfully received data from the API!");
        res.json(data);

    } catch (error) {
        console.error("Backend error:", error.message);
        res.status(500).json({ error: 'An error occurred on the server side.', details: error.message });
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
