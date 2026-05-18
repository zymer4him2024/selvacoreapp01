export default function CustomerDevicesLoading() {
  return (
    <div className="sc" style={{ minHeight: '100vh', background: 'var(--paper)' }} aria-busy="true">
      <header className="sc-nav" aria-hidden>
        <div className="sc-nav-inner">
          <div className="sc-skeleton" style={{ width: 140, height: 28 }} />
          <div className="sc-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        </div>
      </header>
      <main style={{ margin: '0 auto', padding: '24px 20px' }}>
        <div className="sc-skeleton" style={{ width: '40%', maxWidth: 240, height: 32, marginBottom: 24 }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--hairline)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div className="sc-skeleton" style={{ width: '70%', height: 20, marginBottom: 10 }} />
              <div className="sc-skeleton" style={{ width: '50%', height: 14, marginBottom: 16 }} />
              <div className="sc-skeleton" style={{ width: '100%', height: 80, marginBottom: 12 }} />
              <div className="sc-skeleton" style={{ width: '100%', height: 36 }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
