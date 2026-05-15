'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { EmptyState }
  from '@/components/shared/EmptyState'
import { SkeletonSlipCard }
  from '@/components/shared/SkeletonCard'
import { SlipCard }
  from '@/components/bettor/SlipCard'
import {
  getMyBets,
  getMyJackpotBets,
} from '@/lib/actions/coupons'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'near_win', label: 'Near Win 🛡️' },
  { key: 'jackpot', label: '🏆 Jackpot' },
]

export default function MyBetsPage() {
  const { user, isAuthenticated } =
    useAuthStore()
  const [activeTab, setActiveTab] =
    useState('all')
  const [slips, setSlips] = useState<any[]>([])
  const [jackpotSlips, setJackpotSlips] =
    useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    loadBets()
  }, [user, activeTab, page])

  const loadBets = async () => {
    if (!user) return
    setLoading(true)

    if (activeTab === 'jackpot') {
      const data =
        await getMyJackpotBets(user.id)
      setJackpotSlips(data)
    } else {
      const { slips: data, total: t } =
        await getMyBets(user.id, {
          status:
            activeTab === 'all'
              ? undefined
              : activeTab,
          page,
          limit: 10,
        })
      setSlips(data)
      setTotal(t)
    }

    setLoading(false)
  }

  if (!isAuthenticated && !user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-white mb-6">
          My Bets
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setPage(1)
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.key
                  ? 'bg-gold text-charcoal'
                  : 'bg-slate-dark text-white/60 hover:text-white border border-nile-blue/30'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonSlipCard key={i} />
            ))}
          </div>
        ) : activeTab === 'jackpot' ? (
          jackpotSlips.length === 0 ? (
            <EmptyState
              title="No jackpot entries"
              message="Your jackpot entries will appear here"
              icon={Ticket}
            />
          ) : (
            <div className="space-y-4">
              {jackpotSlips.map((js) => (
                <div
                  key={js.id}
                  className="bg-slate-dark border border-gold/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gold font-mono font-bold">
                      #{js.slip_id}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full border font-semibold',
                        js.status === 'won'
                          ? 'bg-nile-success/20 text-nile-success border-nile-success/40'
                          : js.status ===
                            'near_win'
                          ? 'bg-gold/20 text-gold border-gold/40'
                          : js.status ===
                            'lost'
                          ? 'bg-nile-danger/20 text-nile-danger border-nile-danger/40'
                          : 'bg-nile-blue-light/20 text-nile-blue-light border-nile-blue-light/40'
                      )}
                    >
                      {js.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mb-2">
                    {js.jackpots?.name}
                  </p>
                  {js.correct_count > 0 && (
                    <p className="text-gold text-sm font-medium">
                      {js.correct_count} / 12
                      correct
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : slips.length === 0 ? (
          <EmptyState
            title="No bets found"
            message="Your bets will appear here once you start betting"
            icon={Ticket}
          />
        ) : (
          <div className="space-y-4">
            {slips.map((slip) => (
              <SlipCard
                key={slip.id}
                slip={slip}
                onRefresh={loadBets}
              />
            ))}

            {/* Pagination */}
            {total > 10 && (
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.max(1, p - 1)
                    )
                  }
                  disabled={page === 1}
                  className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
                >
                  ← Prev
                </button>
                <span className="text-white/50 text-sm py-2">
                  Page {page} of{' '}
                  {Math.ceil(total / 10)}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => p + 1)
                  }
                  disabled={
                    page >= Math.ceil(total / 10)
                  }
                  className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
                >
                  Next &#8594;
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}