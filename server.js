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
    const { eventUrl } = req.body;
    if (!eventUrl) {
        return res.status(400).json({ error: 'Event URL is verplicht.' });
    }

    try {
        // Step 1: Get Event ID from URL
        const match = eventUrl.match(/(\d+)(?!.*\d)/);
        if (!match || !match[0]) {
            throw new Error('Kon geen geldige Event ID (nummer) vinden in de URL.');
        }
        const eventId = match[0];
        console.log(`Stap 1: Event ID gevonden: ${eventId}`);

        // Step 2: Get cookie from environment variable
        const cookie = process.env.TM_COOKIE;
        if (!cookie) {
            console.error('Fout: TM_COOKIE omgevingsvariabele is niet ingesteld.');
            throw new Error('Serverconfiguratiefout: TM_COOKIE is niet ingesteld.');
        }
        console.log('Stap 2: Cookie succesvol geladen uit omgevingsvariabele.');

        // Step 3: Build API URL
        const apiUrl = `https://availability.ticketmaster.nl/api/v2/TM_NL/availability/${eventId}?subChannelId=1`;

        // Step 4: Make API request with the cookie
        console.log("Stap 3: Bezig met API-verzoek inclusief cookie...");
        const apiResponse = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'Referer': eventUrl,
                'Cookie': cookie,
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
        // Provide a clearer error message to the client for the specific cookie issue
        if (error.message.includes('TM_COOKIE')) {
            return res.status(500).json({ error: 'Serverconfiguratiefout.', details: 'De server is niet correct geconfigureerd.' });
        }
        res.status(500).json({ error: 'Er is een fout opgetreden aan de serverkant.', details: error.message });
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