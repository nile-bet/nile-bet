'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Home, Globe, BarChart2, Search, User, X, Loader2 } from 'lucide-react'
import { MatchListClient } from '@/components/bettor/MatchListClient'
import { PlaceBetModal } from '@/components/bettor/PlaceBetModal'
import { useBetSlipStore } from '@/lib/stores/betSlipStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { searchBettorByUsername } from '@/lib/actions/matches'
import { formatETB } from '@/lib/utils/formatCurrency'
import type {
  MatchWithLeague,
  CountryWithLeagues,
  League,
  PlatformSettings,
} from '@/types/database.types'

interface Props {
  initialMatches: MatchWithLeague[]
  countries: CountryWithLeagues[]
  topLeagues: League[]
  settings: PlatformSettings
  jackpot?: any
}

export function CashierPlaceBetClient({
  initialMatches,
  countries,
  topLeagues,
  settings,
  jackpot,
}: Props) {
  const [showPlaceBet, setShowPlaceBet] = useState(false)
  const { user } = useAuthStore()
  const { selectedBettorId, selectedBettorName, setSelectedBettor, setAnonymous } = useBetSlipStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; username: string; credit_balance: number }[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || !user) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const r = await searchBettorByUsername(query.trim(), user.id)
      setResults(r)
      setSearching(false)
      setShowResults(true)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, user])

  const handleSportsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('open-countries-panel'))
  }

  return (
    <div className="flex flex-col">
      {/* Bettor search bar */}
      <div className="px-4 py-2 bg-[#141F36] border-b border-gold/20 relative">
        {selectedBettorId ? (
          <div className="flex items-center justify-between bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gold" />
              <span className="text-sm text-white font-medium">@{selectedBettorName}</span>
            </div>
            <button
              onClick={() => { setSelectedBettor('', ''); setQuery('') }}
              className="text-white/40 hover:text-nile-danger"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 bg-charcoal border border-gold/20 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Search bettor by username..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
              {searching && <Loader2 className="w-4 h-4 text-gold animate-spin flex-shrink-0" />}
            </div>
            {showResults && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#141F36] border border-gold/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {results.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBettor(b.id, b.username)
                      setAnonymous(false)
                      setQuery('')
                      setShowResults(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gold/10 text-left border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-white">@{b.username}</span>
                    <span className="text-xs text-gold font-mono">{formatETB(b.credit_balance)}</span>
                  </button>
                ))}
              </div>
            )}
            {showResults && !searching && query.trim() && results.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#141F36] border border-gold/20 rounded-lg shadow-xl z-50 px-3 py-2">
                <span className="text-xs text-white/40">No bettor found — bet will be placed anonymously</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <MatchListClient
          initialMatches={initialMatches}
          countries={countries}
          topLeagues={topLeagues}
          settings={settings}
          basePath="/cashier"
        />
      </div>
      <PlaceBetModal
        isOpen={showPlaceBet}
        onClose={() => setShowPlaceBet(false)}
        forceNamed
      />
    </div>
  )
}
