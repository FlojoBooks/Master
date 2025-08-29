// app.js (Versie 5.0: "Multi-Event Dashboard")
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
            const response = await fetch('/api/get-event-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventUrl })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `Serverfout: ${response.statusText}`);
            }

            const data = await response.json();
            statusMessageDiv.innerHTML = '';
            
            // Creëer en voeg een nieuw blok toe voor dit evenement
            createEventBlock(data, eventUrl);
            
            // Maak het input veld leeg voor de volgende URL
            urlInput.value = '';

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