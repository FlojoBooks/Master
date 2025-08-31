import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import './App.css'
import './index.css'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

function SummaryBox({ totalStandard, totalResale }) {
  return (
    <div className="summary-box">
      <p><b>Totaal Standaard Tickets:</b> {totalStandard}</p>
      <p><b>Totaal Verkoop Tickets:</b> {totalResale}</p>
    </div>
  )
}

function EventBlock({ data, eventUrl }) {
  const { totalStandard, totalResale } = useMemo(() => {
    let standard = 0
    let resale = 0

    if (!data?.groups || !data?.offers) return { totalStandard: 0, totalResale: 0 }

    data.groups.forEach((group) => {
      if (!group.offerIds || group.offerIds.length === 0) return
      const offerDetails = data.offers.find((o) => o.id === group.offerIds[0])
      if (!offerDetails) return

      let seatCount = 0
      if (group.places) {
        for (const section in group.places) {
          for (const row in group.places[section]) {
            seatCount += group.places[section][row].length
          }
        }
      }

      if (offerDetails.type === 'standard') standard += seatCount
      else if (offerDetails.type === 'resale') resale += seatCount
    })

    return { totalStandard: standard, totalResale: resale }
  }, [data])

  const chartData = useMemo(() => ({
    labels: ['Standaard Tickets', 'Verkoop Tickets'],
    datasets: [
      {
        data: [totalStandard, totalResale],
        backgroundColor: ['#36A2EB', '#FF6384'],
        hoverOffset: 4
      }
    ]
  }), [totalStandard, totalResale])

  const options = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Verhouding Ticket Types' }
    }
  }), [])

  return (
    <div className="event-block">
      <h2>
        <a href={eventUrl} target="_blank" rel="noopener noreferrer">Evenement Details</a>
      </h2>
      <SummaryBox totalStandard={totalStandard} totalResale={totalResale} />
      <div className="chart-box">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  )
}

function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'light' ? (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  )
}

function App() {
  const [eventUrl, setEventUrl] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  

  

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])

  const onSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!eventUrl) return
    
    setLoading(true)
    setError('')

    let cookie; // Declare cookie here

    console.log('App.jsx: Sending GET_TM_COOKIE message to extension...');
    try {
      const response = await chrome.runtime.sendMessage('fnkklcbipplidfliidenikiblcnbdffj', { type: 'GET_TM_COOKIE', source: 'ticketmaster-dashboard' });
      console.log('App.jsx: Response from extension:', response);
      if (response.success) {
        cookie = response.cookieString;
      } else {
        throw new Error(response.error || 'Kon cookie niet ophalen via extensie.');
      }
    } catch (e) {
      setError(`Fout bij communicatie met extensie: ${e.message}`);
      setLoading(false);
      return;
    }

    console.log('App.jsx: Cookie value before fetch:', cookie);

    try {
      const res = await fetch('/api/get-event-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventUrl, cookieString: cookie })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        const message = err?.details || `Serverfout: ${res.statusText}`
        throw new Error(message)
      }
      const data = await res.json()
      setEvents((prev) => [{ id: Date.now(), url: eventUrl, data }, ...prev])
      setEventUrl('')
    } catch (e) {
      setError(e.message || 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }, [eventUrl])

  return (
    <div className="dashboard-container">
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <h1>Multi-Event Dashboard</h1>

      

      <div className="input-container">
        <h3>Nieuw Evenement</h3>
        <form onSubmit={onSubmit} id="event-form">
          <input
            type="url"
            id="event-url-input"
            placeholder="https://www.ticketmaster.nl/event/..."
            required
            value={eventUrl}
            onChange={(e) => setEventUrl(e.target.value)}
          />
          <button type="submit" id="submit-button" disabled={loading}>
            {loading ? 'Bezig...' : 'Voeg Evenement Toe'}
          </button>
        </form>
      </div>

      <div id="status-message">
        {loading && <p>Data wordt opgehaald. Dit kan 15-20 seconden duren...</p>}
        {!!error && <p className="error">Fout: {error}</p>}
      </div>

      <div id="events-container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
        gap: 20
      }}>
        {events.map((ev) => (
          <EventBlock key={ev.id} data={ev.data} eventUrl={ev.url} />)
        )}
      </div>
    </div>
  )
}

export default App