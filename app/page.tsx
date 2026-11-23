export default function Home() {
  return (
    <main className="location-shell home-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">E</span><span>Electro</span></a>
      </header>
      <section className="home-hero">
        <p className="eyebrow">SHARE YOUR WHEREABOUTS</p>
        <h1>Find location of Bus</h1>
        <p>Share your exact position securely with a simple map link.</p>
        <div className="home-actions">
          <a className="primary-button" href="/send"><span className="button-icon">◎</span>Share location</a>
          <a className="secondary-button" href="/view">View a location <span>→</span></a>
        </div>
      </section>
      <footer className="home-footer">
        <span>© 2026 Electro</span>
        <a href="#privacy">Privacy Policy</a>
      </footer>
    </main>
  );
}
