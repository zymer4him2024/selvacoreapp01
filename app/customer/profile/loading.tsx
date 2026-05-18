export default function CustomerProfileLoading() {
  return (
    <div className="sc" style={{ minHeight: '100vh', background: 'var(--paper)' }} aria-busy="true">
      <header className="sc-nav" aria-hidden>
        <div className="sc-nav-inner">
          <div className="sc-skeleton" style={{ width: 140, height: 28 }} />
          <div className="sc-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        </div>
      </header>
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <div className="sc-skeleton" style={{ width: '40%', maxWidth: 220, height: 32, marginBottom: 24 }} />
        <div
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div className="sc-skeleton" style={{ width: '30%', height: 14, marginBottom: 8 }} />
              <div className="sc-skeleton" style={{ width: '100%', height: 40 }} />
            </div>
          ))}
          <div className="sc-skeleton" style={{ width: 140, height: 40, marginTop: 8 }} />
        </div>
      </main>
    </div>
  );
}
