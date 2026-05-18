export default function CustomerOrderDetailLoading() {
  return (
    <div className="sc" style={{ minHeight: '100vh', background: 'var(--paper)' }} aria-busy="true">
      <header className="sc-nav" aria-hidden>
        <div className="sc-nav-inner">
          <div className="sc-skeleton" style={{ width: 140, height: 28 }} />
          <div className="sc-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        </div>
      </header>
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px' }}>
        <div className="sc-skeleton" style={{ width: '50%', maxWidth: 280, height: 28, marginBottom: 20 }} />
        <div
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div className="sc-skeleton" style={{ width: '60%', height: 22, marginBottom: 12 }} />
          <div className="sc-skeleton" style={{ width: '40%', height: 14, marginBottom: 20 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="sc-skeleton" style={{ width: '30%', height: 14 }} />
              <div className="sc-skeleton" style={{ width: '40%', height: 14 }} />
            </div>
          ))}
        </div>
        <div
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div className="sc-skeleton" style={{ width: '40%', height: 20, marginBottom: 16 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div className="sc-skeleton" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="sc-skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
                <div className="sc-skeleton" style={{ width: '40%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
