import { Suspense } from 'react'
import {
  getActiveJackpot,
  getJackpotLeaderboard,
  getAllJackpotsPublic,
} from '@/lib/actions/jackpot'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { JackpotClient }
  from '@/components/jackpot/JackpotClient'
import { LoadingSpinner }
  from '@/components/shared/LoadingSpinner'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { Trophy } from 'lucide-react'

export default async function JackpotPage() {
  const [jackpot, allJackpots] =
    await Promise.all([
      getActiveJackpot(),
      getAllJackpotsPublic(),
    ])

  const leaderboard = jackpot
    ? await getJackpotLeaderboard(jackpot.id)
    : []

  return (
    <div className="min-h-screen flex flex-col bg-charcoal">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero banner */}
        <div
          className="relative py-8 px-4 text-center overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, #1A1A2E 0%, #1B3A6B 50%, #C9A84C20 100%)',
          }}
        >
          {/* Animated stars background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute text-gold/20 animate-pulse"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  fontSize: `${8 + Math.random() * 16}px`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                }}
              >
                ★
              </div>
            ))}
          </div>

          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gold/20 rounded-full border border-gold/30">
                <Trophy className="w-8 h-8 text-gold" />
              </div>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
              Weekend Jackpot
            </h1>
            <p className="text-gold text-xl font-semibold mb-4">
              🏆 Pick 12. Win Big.
            </p>

            {jackpot ? (
              <div className="flex flex-wrap justify-center gap-6 mt-6">
                <div className="text-center">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
                    Win All 12
                  </p>
                  <p className="text-gold font-mono text-2xl font-bold">
                    {formatETB(
                      jackpot.win_all_reward
                    )}
                  </p>
                </div>
                <div className="text-white/30 text-2xl self-center">
                  |
                </div>
                <div className="text-center">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
                    Miss 1
                  </p>
                  <p className="text-gold/70 font-mono text-2xl font-bold">
                    {formatETB(
                      jackpot.near_win_reward
                    )}
                  </p>
                </div>
                <div className="text-white/30 text-2xl self-center">
                  |
                </div>
                <div className="text-center">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
                    Entry Fee
                  </p>
                  <p className="text-white font-mono text-2xl font-bold">
                    {formatETB(
                      jackpot.fixed_stake
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-white/50 text-lg mt-4">
                No active jackpot right now.
                Check back soon!
              </p>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <LoadingSpinner
                  size="md"
                  color="gold"
                  text="Loading jackpot..."
                />
              </div>
            }
          >
            <JackpotClient
              jackpot={jackpot}
              leaderboard={leaderboard}
              pastJackpots={allJackpots}
            />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  )
}