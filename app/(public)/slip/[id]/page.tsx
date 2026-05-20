import { getSlipById }
  from '@/lib/actions/bets'
import { getJackpotSlipById }
  from '@/lib/actions/jackpot'
import { SlipDetailCard }
  from '@/components/shared/SlipDetailCard'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import {
  ArrowLeft,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import {
  formatETB,
  formatDate,
} from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SlipPage({
  params,
}: Props) {
  const { id } = await params
  const slipId = id.toUpperCase()

  const isJackpot = slipId.startsWith('JP')

  if (isJackpot) {
    const slip =
      await getJackpotSlipById(slipId)

    return (
      <div className="min-h-screen flex flex-col bg-charcoal">
        <PublicNavbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <Link
            href="/weekend-jackpot"
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jackpot
          </Link>

          {!slip ? (
            <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-8 text-center">
              <p className="text-white/50">
                Jackpot slip not found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-slate-dark border border-gold/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gold/20 rounded-lg">
                    <Trophy className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-xl">
                      #{slip.slip_id}
                    </h1>
                    <p className="text-white/50 text-sm">
                      {slip.jackpots?.name}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span
                      className={cn(
                        'text-xs px-3 py-1 rounded-full border font-semibold',
                        slip.status === 'won'
                          ? 'bg-gold/20 text-gold border-gold/40'
                          : slip.status ===
                            'near_win'
                          ? 'bg-nile-success/20 text-nile-success border-nile-success/40'
                          : slip.status ===
                            'lost'
                          ? 'bg-nile-danger/20 text-nile-danger border-nile-danger/40'
                          : 'bg-nile-blue/20 text-white/60 border-nile-blue/40'
                      )}
                    >
                      {slip.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                    <p className="text-gold font-mono text-lg font-bold">
                      {formatETB(
                        slip.stake ?? 50
                      )}
                    </p>
                    <p className="text-white/50 text-xs">
                      Entry Fee
                    </p>
                  </div>
                  {slip.correct_count !==
                    null && (
                    <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                      <p className="text-white font-bold text-lg">
                        {slip.correct_count}
                        /12
                      </p>
                      <p className="text-white/50 text-xs">
                        Correct
                      </p>
                    </div>
                  )}
                  {slip.reward_amount > 0 && (
                    <div className="bg-nile-success/10 rounded-lg p-3 text-center">
                      <p className="text-nile-success font-mono text-lg font-bold">
                        +{formatETB(
                          slip.reward_amount
                        )}
                      </p>
                      <p className="text-white/50 text-xs">
                        Reward
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selections */}
              <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">
                  My Picks
                </h3>
                <div className="space-y-2">
                  {(
                    slip.jackpot_slip_selections ??
                    []
                  )
                    .sort(
                      (a: any, b: any) =>
                        a.game_number -
                        b.game_number
                    )
                    .map((sel: any) => {
                      const match =
                        sel.jackpot_matches
                      const isCorrect =
                        sel.result ===
                        'correct'
                      const isWrong =
                        sel.result === 'wrong'
                      const isPending =
                        sel.result ===
                        'pending'

                      return (
                        <div
                          key={sel.id}
                          className={cn(
                            'flex items-center justify-between px-3 py-2.5 rounded-lg',
                            isCorrect
                              ? 'bg-nile-success/10 border border-nile-success/20'
                              : isWrong
                              ? 'bg-nile-danger/10 border border-nile-danger/20'
                              : 'bg-charcoal/50'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-white/60 text-xs">
                              Game{' '}
                              {sel.game_number}
                            </p>
                            <p className="text-white text-sm truncate">
                              {match?.home_team} vs{' '}
                              {match?.away_team}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span
                              className={cn(
                                'font-bold text-lg w-8 text-center',
                                isCorrect
                                  ? 'text-nile-success'
                                  : isWrong
                                  ? 'text-nile-danger'
                                  : 'text-gold'
                              )}
                            >
                              {sel.selection ===
                              'home'
                                ? '1'
                                : sel.selection ===
                                  'away'
                                ? '2'
                                : 'X'}
                            </span>
                            {isCorrect && (
                              <span className="text-nile-success">
                                ✅
                              </span>
                            )}
                            {isWrong && (
                              <span className="text-nile-danger">
                                ❌
                              </span>
                            )}
                            {isPending && (
                              <span className="text-white/30">
                                ⏳
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Footer info */}
              <div className="text-center text-white/30 text-xs">
                Placed: {formatDate(slip.created_at)}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    )
  }

  // Regular slip
  const slip = await getSlipById(slipId)

  return (
    <div className="min-h-screen flex flex-col bg-charcoal">
      <PublicNavbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {!slip ? (
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-8 text-center">
            <p className="text-white/50">
              Slip not found
            </p>
          </div>
        ) : (
          <SlipDetailCard
            slip={slip}
            showShareOptions
          />
        )}
      </main>
      <Footer />
    </div>
  )
}