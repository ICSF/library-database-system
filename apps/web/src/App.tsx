import { useEffect, useState } from 'react'
import './App.css'

type HealthStatus = 'checking' | 'healthy' | 'unavailable'

function App() {
  const [status, setStatus] = useState<HealthStatus>('checking')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/trpc/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Health check failed')
        }

        return response.json() as Promise<{
          result?: {data?: {json?: {latencyMs?: number}}}
        }>
      })
      .then((data) => {
        setLatencyMs(data.result?.data?.json?.latencyMs ?? null)
        setStatus('healthy')
      })
      .catch(() => {
        setStatus('unavailable')
      })
  }, [])

  const isHealthy = status === 'healthy'
  const isChecking = status === 'checking'

  return (
    <main className="health-page">
      <section className="health-panel" aria-live="polite">
        <div className={`status-mark ${status}`} aria-hidden="true">
          {isChecking ? '...' : isHealthy ? 'OK' : '!'}
        </div>
        <h1>System health</h1>
        <div className={`status-line ${status}`}>
          <span className="status-dot" />
          <span>{isChecking ? 'Checking...' : isHealthy ? 'Healthy' : 'Unavailable'}</span>
          {latencyMs !== null && <span className="latency">{latencyMs} ms</span>}
        </div>
      </section>
    </main>
  )
}

export default App
