export default function CustomerProductDetailLoading() {
  return (
    <div className="sc" style={{ minHeight: '100vh', background: 'var(--paper)' }} aria-busy="true">
      <header className="sc-nav" aria-hidden>
        <div className="sc-nav-inner">
          <div className="sc-skeleton" style={{ width: 140, height: 28 }} />
          <div className="sc-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        </div>
      </header>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: 24,
          }}
        >
          <div className="sc-skeleton" style={{ width: '100%', aspectRatio: '1 / 1' }} />
          <div>
            <div className="sc-skeleton" style={{ width: '70%', height: 32, marginBottom: 12 }} />
            <div className="sc-skeleton" style={{ width: '40%', height: 24, marginBottom: 20 }} />
            <div className="sc-skeleton" style={{ width: '100%', height: 14, marginBottom: 8 }} />
            <div className="sc-skeleton" style={{ width: '90%', height: 14, marginBottom: 8 }} />
            <div className="sc-skeleton" style={{ width: '80%', height: 14, marginBottom: 24 }} />
            <div className="sc-skeleton" style={{ width: '100%', height: 44 }} />
          </div>
        </div>
      </main>
    </div>
  );
}
