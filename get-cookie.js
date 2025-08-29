// get-cookie.js (Versie 2.0: "Stealth Mode")

// Gebruik puppeteer-extra in plaats van de standaard puppeteer
const puppeteer = require('puppeteer-extra');

// Voeg de stealth plugin toe
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const eventPageUrl = 'https://www.ticketmaster.nl/event/avond-van-de-filmmuziek-tickets/3001';

async function getFreshCookie() {
    let browser = null;
    try {
        // Start de browser. De stealth plugin doet nu op de achtergrond zijn werk.
        browser = await puppeteer.launch({ headless: true }); // headless: true is onzichtbaar
        const page = await browser.newPage();

        // Maak ons nog menselijker door een standaard schermresolutie in te stellen
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigeer naar de pagina en wacht tot alles geladen is
        await page.goto(eventPageUrl, { waitUntil: 'networkidle2', timeout: 30000 }); // Langere timeout voor de zekerheid

        // Extra wachttijd voor eventuele scripts die later laden
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Haal de (hopelijk volledige) cookies op
        const cookies = await page.cookies();
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        
        // Print de cookie. We hopen nu op een veel langere string.
        console.log(cookieString);

    } catch (error) {
        console.error('Kon geen cookie ophalen (Stealth):', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

getFreshCookie();