'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { Logo }
  from '@/components/shared/Logo'
import { SlipDetailCard }
  from '@/components/shared/SlipDetailCard'
import { LoadingSpinner }
  from '@/components/shared/LoadingSpinner'
import { getSlipById }
  from '@/lib/actions/bets'
import { cn } from '@/lib/utils'
import { Clock, Trash2 } from 'lucide-react'
import type { SlipWithSelections }
  from '@/types/database.types'

const HISTORY_KEY = 'nilebet_slip_history_public'
const MAX_HISTORY = 10

export default function CheckSlipPage() {
  const [slipId, setSlipId] = useState('')
  const [loading, setLoading] =
    useState(false)
  const [slip, setSlip] =
    useState<SlipWithSelections | null>(null)
  const [notFound, setNotFound] =
    useState(false)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) setHistory(JSON.parse(stored))
  }, [])

  const addToHistory = (id: string) => {
    setHistory(prev => {
      const updated = [id, ...prev.filter(i => i !== id)].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  const handleCheck = async () => {
    if (!slipId.trim()) return
    setLoading(true)
    setNotFound(false)
    setSlip(null)

    const data = await getSlipById(
      slipId.trim().toUpperCase()
    )

    if (data) {
      setSlip(data)
      addToHistory(slipId.trim().toUpperCase())
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" showTagline />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              Check Your Slip
            </h1>
            <p className="text-white/50 text-sm">
              Enter your slip ID to see the
              current status
            </p>
          </div>

          {/* Input card */}
          <div className="bg-slate-dark border border-gold/20 rounded-xl p-6 mb-6">
            <label className="text-sm text-white/70 block mb-2">
              Enter Slip ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={slipId}
                onChange={(e) =>
                  setSlipId(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  handleCheck()
                }
                placeholder="e.g. 48392017 or JP48392017"
                maxLength={10}
                className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white font-mono text-center placeholder:text-white/25 placeholder:font-sans focus:outline-none focus:border-gold/50"
              />
              <button
                onClick={handleCheck}
                disabled={
                  !slipId.trim() || loading
                }
                className={cn(
                  'px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2',
                  slipId.trim() && !loading
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                <Search className="w-4 h-4" />
                Check
              </button>
            </div>
          </div>

          {/* Result */}
          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner
                size="md"
                color="gold"
                text="Searching..."
              />
            </div>
          )}

          {notFound && !loading && (
            <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-6 text-center">
              <p className="text-nile-danger font-semibold">
                ❌ Slip not found
              </p>
              <p className="text-white/50 text-sm mt-1">
                Please check the ID and try
                again
              </p>
            </div>
          )}

          {slip && !loading && (
            <SlipDetailCard
              slip={slip}
              showShareOptions
            />
          )}

          {/* Recent History */}
          {history.length > 0 && (
            <div className="mt-8 bg-slate-dark border border-gold/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold/60" />
                  <span className="text-sm font-semibold text-white/70">Recent Slips</span>
                </div>
                <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-nile-danger/70 hover:text-nile-danger transition-colors">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="space-y-2">
                {history.map(id => (
                  <button key={id} onClick={() => { setSlipId(id); handleCheck() }} className="w-full flex items-center justify-between px-3 py-2 bg-charcoal/50 hover:bg-charcoal rounded-lg border border-gold/10 hover:border-gold/30 transition-all">
                    <span className="font-mono text-sm text-white">{id}</span>
                    <Search className="w-3 h-3 text-white/30" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}