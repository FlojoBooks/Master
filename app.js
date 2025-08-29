// app.js (Versie 5.0: "Multi-Event Dashboard")
const EXTENSION_ID = "HIER_KOMT_JOUW_EXTENSIE_ID"; // Placeholder for your extension ID
document.addEventListener('DOMContentLoaded', () => {
    const eventForm = document.getElementById('event-form');
    const urlInput = document.getElementById('event-url-input');
    const submitButton = document.getElementById('submit-button');
    const eventsContainer = document.getElementById('events-container');
    const statusMessageDiv = document.getElementById('status-message');

    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const eventUrl = urlInput.value;

        submitButton.disabled = true;
        submitButton.textContent = 'Bezig...';
        statusMessageDiv.innerHTML = '<p>Data wordt opgehaald. Dit kan 15-20 seconden duren...</p>';

        try {
            chrome.runtime.sendMessage(EXTENSION_ID, { type: 'GET_EVENT_DATA', eventUrl: eventUrl },
                function(response) {
                    if (chrome.runtime.lastError) {
                        statusMessageDiv.innerHTML = `<p class="error">Fout: Kan geen verbinding maken met de extensie. Zorg ervoor dat de extensie is geïnstalleerd en ingeschakeld.</p>`;
                        console.error("Extension connection error:", chrome.runtime.lastError.message);
                        submitButton.disabled = false;
                        submitButton.textContent = 'Voeg Evenement Toe';
                        return;
                    }

                    if (response.success) {
                        statusMessageDiv.innerHTML = '';
                        createEventBlock(response.data, eventUrl);
                        urlInput.value = '';
                    } else {
                        console.error("Fout van extensie:", response.error);
                        statusMessageDiv.innerHTML = `<p class="error">Fout: ${response.error}</p>`;
                    }
                    submitButton.disabled = false;
                    submitButton.textContent = 'Voeg Evenement Toe';
                }
            );

        } catch (error) {
            console.error("Fout:", error);
            statusMessageDiv.innerHTML = `<p class="error">Fout: ${error.message}</p>`;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Voeg Evenement Toe';
        }
    });

    /**
     * Creëert een volledig nieuw HTML-blok voor een evenement en voegt het toe aan de container.
     * @param {object} data - De API data voor het evenement.
     * @param {string} eventUrl - De URL van het evenement.
     */
    function createEventBlock(data, eventUrl) {
        if (!data || !data.groups || !data.offers) {
            statusMessageDiv.innerHTML += `<p class="error">Data voor ${eventUrl} heeft een onverwachte structuur.</p>`;
            return;
        }

        // Genereer een unieke ID voor dit event blok en de canvas-elementen
        const eventId = "event-" + new Date().getTime(); // Simpele unieke ID

        // Creëer de HTML-structuur voor het nieuwe blok
        const block = document.createElement('div');
        block.className = 'event-block';
        block.id = eventId;
        block.innerHTML = `
            <h2><a href="${eventUrl}" target="_blank" rel="noopener noreferrer">Evenement Details</a></h2>
            <div class="summary-box" id="summary-${eventId}">Berekenen...</div>
            <div class="chart-box">
                <canvas id="chart-${eventId}"></canvas>
            </div>
        `;
        // Voeg het nieuwe blok toe aan het begin van de container
        eventsContainer.prepend(block);

        // Verwerk de data en vul het blok met de grafiek en totalen
        processAndFillBlock(data, eventId);
    }

    /**
     * Verwerkt de data en vult een specifiek event-blok met de totalen en grafiek.
     * @param {object} data - De API data.
     * @param {string} eventId - De unieke ID van het te vullen HTML-blok.
     */
    function processAndFillBlock(data, eventId) {
        let totalStandard = 0;
        let totalResale = 0;

        data.groups.forEach(group => {
            if (!group.offerIds || group.offerIds.length === 0) return;
            const offerDetails = data.offers.find(offer => offer.id === group.offerIds[0]);
            if (!offerDetails) return;

            let seatCount = 0;
            if (group.places) {
                for (const section in group.places) {
                    for (const row in group.places[section]) {
                        seatCount += group.places[section][row].length;
                    }
                }
            }
            
            if (offerDetails.type === 'standard') totalStandard += seatCount;
            else if (offerDetails.type === 'resale') totalResale += seatCount;
        });

        // Werk de totalen bij in het summary-box
        const summaryBox = document.getElementById(`summary-${eventId}`);
        summaryBox.innerHTML = `
            <p><b>Totaal Standaard Tickets:</b> ${totalStandard}</p>
            <p><b>Totaal Verkoop Tickets:</b> ${totalResale}</p>
        `;

        // Teken de grafiek in het canvas van dit blok
        const ctx = document.getElementById(`chart-${eventId}`).getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Standaard Tickets', 'Verkoop Tickets'],
                datasets: [{
                    data: [totalStandard, totalResale],
                    backgroundColor: ['#36A2EB', '#FF6384'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Verhouding Ticket Types'
                    }
                }
            }
        });
    }
});