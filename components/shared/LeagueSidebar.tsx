'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, Search, Star } from 'lucide-react'
import type { League, CountryWithLeagues } from '@/types/database.types'

interface LeagueSidebarProps {
  countries: CountryWithLeagues[]
  topLeagues: League[]
  selectedLeagueId: string | 'top' | null
  onLeagueSelect: (id: string | 'top') => void
  className?: string
}

export function LeagueSidebar({
  countries,
  topLeagues,
  selectedLeagueId,
  onLeagueSelect,
  className,
}: LeagueSidebarProps) {
  const [search, setSearch] = useState('')
  const [openCountry, setOpenCountry] = useState<string | null>(null)
  const [showAllCountries, setShowAllCountries] = useState(false)

  // Sort countries A-Z
  const sortedCountries = useMemo(() =>
    [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedCountries
    const q = search.toLowerCase()
    return sortedCountries
      .map((c) => ({
        ...c,
        leagues: c.leagues.filter((l) =>
          l.name.toLowerCase().includes(q)
        ),
      }))
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.leagues.length > 0
      )
  }, [sortedCountries, search])

  const filteredTop = useMemo(() => {
    if (!search.trim()) return topLeagues
    const q = search.toLowerCase()
    return topLeagues.filter((l) =>
      l.name.toLowerCase().includes(q)
    )
  }, [topLeagues, search])

  // Show countries if searching or if toggled
  const shouldShowCountries = showAllCountries || search.trim().length > 0

  return (
    <div
      className={cn(
        'w-[200px] flex-shrink-0 bg-slate-dark border-r border-gold/10 flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Search */}
      <div className="p-3 border-b border-gold/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Search leagues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-charcoal border border-gold/20 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Top Leagues */}
        <div className="pt-2">
          <div className="px-3 py-1 flex items-center gap-1.5">
            <Star className="w-3 h-3 text-gold/60" />
            <span className="text-[10px] text-gold/60 tracking-widest uppercase font-medium">
              Top Leagues
            </span>
          </div>

          {/* All Top Leagues option */}
          <button
            onClick={() => onLeagueSelect('top')}
            className={cn(
              'w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 transition-colors',
              selectedLeagueId === 'top'
                ? 'bg-gold/10 text-gold border-l-2 border-gold'
                : 'text-white/70 hover:bg-gold/5 hover:text-white border-l-2 border-transparent'
            )}
          >
            <span>⭐</span>
            <span className="truncate">All Top Leagues</span>
          </button>

          {filteredTop.map((league) => (
            <button
              key={league.id}
              onClick={() => onLeagueSelect(league.id)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors',
                selectedLeagueId === league.id
                  ? 'bg-gold/10 text-gold border-l-2 border-gold'
                  : 'text-white/60 hover:bg-gold/5 hover:text-white border-l-2 border-transparent'
              )}
            >
              <span className="flex-shrink-0">
                {(league as any).flag_emoji ?? '🏳️'}
              </span>
              <span className="truncate">{league.name}</span>
            </button>
          ))}
        </div>

        {/* Divider + View All Countries button */}
        <div className="mx-3 my-2 border-t border-gold/10" />

        <button
          onClick={() => setShowAllCountries(!showAllCountries)}
          className="w-full px-3 py-2 flex items-center justify-between text-gold/60 hover:text-gold text-[11px] transition-colors"
        >
          <span className="tracking-widest uppercase font-medium">
            {shouldShowCountries ? 'Hide Countries' : 'View All Countries →'}
          </span>
          <ChevronRight className={cn(
            'w-3.5 h-3.5 transition-transform',
            shouldShowCountries && 'rotate-90'
          )} />
        </button>

        {/* All Countries - shown when toggled or searching */}
        {shouldShowCountries && (
          <div>
            {filtered.map((country) => (
              <div key={country.id}>
                {/* Country header */}
                <button
                  onClick={() =>
                    setOpenCountry(
                      openCountry === country.id ? null : country.id
                    )
                  }
                  className="w-full text-left px-3 py-2 flex items-center justify-between text-white/70 hover:text-white hover:bg-gold/5 transition-colors"
                >
                  <span className="flex items-center gap-2 text-[13px]">
                    <span>{country.flag_emoji}</span>
                    <span className="truncate">{country.name}</span>
                  </span>
                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5 text-white/30 transition-transform flex-shrink-0',
                      openCountry === country.id && 'rotate-90'
                    )}
                  />
                </button>

                {/* Leagues */}
                {openCountry === country.id && (
                  <div className="bg-charcoal/30">
                    {country.leagues.length === 0 ? (
                      <p className="text-xs text-white/30 px-8 py-2">No leagues</p>
                    ) : (
                      country.leagues.map((league) => (
                        <button
                          key={league.id}
                          onClick={() => onLeagueSelect(league.id)}
                          className={cn(
                            'w-full text-left px-8 py-1.5 text-[12px] transition-colors',
                            selectedLeagueId === league.id
                              ? 'text-gold bg-gold/10'
                              : 'text-white/50 hover:text-white hover:bg-gold/5'
                          )}
                        >
                          {league.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
