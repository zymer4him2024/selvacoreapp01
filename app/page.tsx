export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Selvacore
          </h1>
          <p className="text-xl text-text-secondary">
            Installation Management Platform
          </p>
        </div>
        
        <div className="flex gap-4 justify-center mt-8">
          <a
            href="/select-language"
            className="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
          >
            Get Started
          </a>
          <a
            href="/login"
            className="px-8 py-4 bg-surface hover:bg-surface-elevated text-white font-semibold rounded-apple transition-all hover:scale-105 border border-border"
          >
            Sign In
          </a>
        </div>
        
        <p className="text-sm text-text-tertiary mt-8">
          Step-by-step setup in progress... 🚀
        </p>
      </div>
    </main>
  )
}

