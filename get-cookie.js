// get-cookie.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// URL to a popular event to initialize a session
const eventUrl = 'https://www.ticketmaster.nl/artist/anouk-tickets/886046';

(async () => {
    let browser = null;
    try {
        console.error('--- Ticketmaster Cookie Fetcher ---');
        console.error('Stap 1: Starten van de browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        console.error(`Stap 2: Navigeren naar: ${eventUrl}`);
        console.error('Dit kan even duren...');
        await page.goto(eventUrl, { waitUntil: 'networkidle2' });

        console.error('Stap 3: Cookie ophalen...');
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        if (cookieString.length < 200) {
            throw new Error(`Onvolledige cookie ontvangen (lengte: ${cookieString.length}). Mogelijk is de anti-bot-beveiliging van Ticketmaster actief of is de pagina veranderd.`);
        }

        console.error('Stap 4: Cookie succesvol opgehaald!');
        console.error('---');
        console.error('Kopieer de onderstaande cookie-string en voeg deze toe aan uw .env bestand als TM_COOKIE');
        console.error('---');
        
        // The final cookie string is printed to standard output
        console.log(cookieString);

    } catch (error) {
        console.error('\n--- FOUT ---');
        console.error('Er is een fout opgetreden bij het ophalen van de cookie:');
        console.error(error.message);
        process.exit(1); // Exit with an error code
    } finally {
        if (browser) {
            await browser.close();
            console.error('\nStap 5: Browser afgesloten.');
        }
    }
})();
