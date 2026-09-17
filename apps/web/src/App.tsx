import './App.css'

function App() {

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Library database home">
          Library Database
        </a>
        <span className="tagline">Imperial Sci-fi Fantasy Society</span>
      </header>

      <div className="site-layout">
        <aside className="menubar">
          <nav aria-label="Main navigation">
            <a href="/">Home</a>
            <a href="/items">Search items</a>
            <a href="/members">Search members</a>
            <a href="/login">Log in</a>
          </nav>
        </aside>

        <main className="main-content">
          <h1>Welcome to the ICSF Library Database</h1>
        </main>
      </div>
    </div>
  )
}

export default App
