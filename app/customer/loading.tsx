export default function CustomerLoading() {
  return (
    <div className="sc" style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header className="sc-nav" aria-hidden>
        <div className="sc-nav-inner">
          <div className="sc-skeleton" style={{ width: 140, height: 28 }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="sc-skeleton" style={{ width: 80, height: 20 }} />
            <div className="sc-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <div className="sc-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }} aria-busy="true">
        <div className="sc-skeleton" style={{ width: '60%', maxWidth: 320, height: 32, marginBottom: 24 }} />

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="sc-skeleton" style={{ flex: '1 1 220px', minHeight: 40 }} />
          <div className="sc-skeleton" style={{ width: 140, height: 40 }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--hairline)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div className="sc-skeleton" style={{ width: '100%', aspectRatio: '4 / 3', marginBottom: 12 }} />
              <div className="sc-skeleton" style={{ width: '80%', height: 18, marginBottom: 8 }} />
              <div className="sc-skeleton" style={{ width: '50%', height: 14, marginBottom: 16 }} />
              <div className="sc-skeleton" style={{ width: '100%', height: 36 }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
