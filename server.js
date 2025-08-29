// server.js (v12: Static Cookie from Env)
const express = require('express');
const path = require('path');


const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

app.use(express.json());
// Serve the React build
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
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