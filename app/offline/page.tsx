'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center text-center px-6">
      <div className="font-display text-5xl font-black text-gold tracking-widest mb-2">
        NILE
      </div>
      <p className="text-white/40 text-sm mb-16">
        Flow into Wins
      </p>

      <div className="text-7xl mb-6">
        📡
      </div>
      <h1 className="text-white font-bold text-2xl mb-3">
        You're Offline
      </h1>
      <p className="text-white/50 leading-relaxed max-w-sm mb-8">
        Check your connection and try again.
        Any pending bets will sync
        automatically when you're back online.
      </p>
      <button
        onClick={() =>
          window.location.reload()
        }
        className="bg-gold text-charcoal px-8 py-3 rounded-xl font-bold text-sm hover:bg-gold-light"
      >
        Try Again
      </button>
    </div>
  )
}