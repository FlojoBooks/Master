// server.js (v12: Static Cookie from Env)
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

app.use(express.json());
// Serve the React build
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.post('/api/get-event-data', async (req, res) => {
    const { eventUrl, cookie } = req.body;
    if (!eventUrl || !cookie) {
        return res.status(400).json({ error: 'Event URL and cookie are required.' });
    }

    try {
        // Step 1: Get Event ID from URL
        const match = eventUrl.match(/(\d+)(?!.*\d)/);
        if (!match || !match[0]) {
            throw new Error('Could not find a valid Event ID (number) in the URL.');
        }
        const eventId = match[0];
        console.log(`Step 1: Found Event ID: ${eventId}`);

        // Step 2: Cookie is received from the request body
        console.log('Step 2: Cookie successfully loaded from request body.');

        // Step 3: Build API URL
        const apiUrl = `https://availability.ticketmaster.nl/api/v2/TM_NL/availability/${eventId}?subChannelId=1`;

        // Step 4: Make API request with the cookie
        console.log("Step 3: Making API request with cookie...");
        const apiResponse = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'Referer': eventUrl,
                'Cookie': cookie,
            }
        });

        if (!apiResponse.ok) {
            throw new Error(`Ticketmaster API responded with status ${apiResponse.status} (${apiResponse.statusText})`);
        }

        const data = await apiResponse.json();
        console.log("Step 4: Successfully received data from the API!");
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

app.listen(port, host, () => {
	console.log(`Server draait op http://${host}:${port}`);
});