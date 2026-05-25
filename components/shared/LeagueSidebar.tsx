'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { FlagImage } from '@/components/shared/FlagImage'
import { ChevronRight, Search, Star, X, Globe } from 'lucide-react'
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
  const [showCountriesPanel, setShowCountriesPanel] = useState(false)
  const [openCountry, setOpenCountry] = useState<string | null>(null)
  const [countrySearch, setCountrySearch] = useState('')

  const sortedCountries = useMemo(() =>
    [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  )

  const filteredTop = useMemo(() => {
    if (!search.trim()) return topLeagues
    const q = search.toLowerCase()
    return topLeagues.filter((l) => l.name.toLowerCase().includes(q))
  }, [topLeagues, search])

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return sortedCountries
    const q = countrySearch.toLowerCase()
    return sortedCountries
      .map((c) => ({
        ...c,
        leagues: c.leagues.filter((l) => l.name.toLowerCase().includes(q)),
      }))
      .filter((c) => c.name.toLowerCase().includes(q) || c.leagues.length > 0)
  }, [sortedCountries, countrySearch])

  const handleLeagueSelect = (id: string | 'top') => {
    onLeagueSelect(id)
    setShowCountriesPanel(false)
  }

  return (
    <div className={cn('w-[200px] flex-shrink-0 bg-slate-dark border-r border-gold/10 flex flex-col overflow-hidden relative', className)}>
      {/* Search */}
      <div className="p-3 border-b border-gold/10 flex-shrink-0">
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
            <span className="text-[10px] text-gold/60 tracking-widest uppercase font-medium">Top Leagues</span>
          </div>

          <button
            onClick={() => handleLeagueSelect('top')}
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
              onClick={() => handleLeagueSelect(league.id)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors',
                selectedLeagueId === league.id
                  ? 'bg-gold/10 text-gold border-l-2 border-gold'
                  : 'text-white/60 hover:bg-gold/5 hover:text-white border-l-2 border-transparent'
              )}
            >
              <span className="flex-shrink-0">
                <FlagImage emoji={(league as any).flag_emoji ?? '🏳️'} />
              </span>
              <span className="truncate">{league.name}</span>
            </button>
          ))}
        </div>

        <div className="mx-3 my-2 border-t border-gold/10" />

        {/* View All Countries Button */}
        <button
          onClick={() => setShowCountriesPanel(true)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-gold hover:bg-gold/10 transition-colors border border-gold/20 mx-0 rounded-none"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[11px] tracking-widest uppercase font-bold">All Countries</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Backdrop blur overlay - portal to body */}
      {showCountriesPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99]"
            onClick={() => setShowCountriesPanel(false)}
          />
          <div className="fixed top-0 left-0 h-full w-[280px] bg-slate-dark z-[100] flex flex-col shadow-2xl border-r border-gold/20 transition-transform duration-300 translate-x-0">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-gold/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gold" />
            <span className="text-white font-bold text-sm">Select League</span>
          </div>
          <button
            onClick={() => setShowCountriesPanel(false)}
            className="text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Country Search */}
        <div className="p-3 border-b border-gold/10 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Search leagues..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="w-full bg-charcoal border border-gold/20 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
            />
          </div>
        </div>

        {/* Top Leagues in panel */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="px-3 py-1.5">
            <span className="text-[10px] text-gold/60 tracking-widest uppercase font-medium">Top Leagues</span>
          </div>
          {topLeagues.map((league) => (
            <button
              key={league.id}
              onClick={() => handleLeagueSelect(league.id)}
              className={cn(
                'w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors border-l-2',
                selectedLeagueId === league.id
                  ? 'bg-gold/10 text-gold border-gold'
                  : 'text-white/70 hover:bg-gold/5 hover:text-white border-transparent'
              )}
            >
              <FlagImage emoji={(league as any).flag_emoji ?? '🏳️'} />
              <span className="truncate">{league.name}</span>
            </button>
          ))}

          <div className="mx-3 my-2 border-t border-gold/10" />

          {/* All Countries */}
          <div className="px-3 py-1.5">
            <span className="text-[10px] text-gold/60 tracking-widest uppercase font-medium">All Countries</span>
          </div>
          {filteredCountries.map((country) => (
            <div key={country.id}>
              <button
                onClick={() => setOpenCountry(openCountry === country.id ? null : country.id)}
                className="w-full text-left px-3 py-2 flex items-center justify-between text-white/70 hover:text-white hover:bg-gold/5 transition-colors"
              >
                <span className="flex items-center gap-2 text-[13px]">
                  <FlagImage emoji={country.flag_emoji} />
                  <span className="truncate">{country.name}</span>
                </span>
                <ChevronRight className={cn(
                  'w-3.5 h-3.5 text-white/30 transition-transform flex-shrink-0',
                  openCountry === country.id && 'rotate-90'
                )} />
              </button>

              {openCountry === country.id && (
                <div className="bg-charcoal/30">
                  {country.leagues.length === 0 ? (
                    <p className="text-xs text-white/30 px-8 py-2">No leagues</p>
                  ) : (
                    country.leagues.map((league) => (
                      <button
                        key={league.id}
                        onClick={() => handleLeagueSelect(league.id)}
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
          </div>
        </>
      )}
    </div>
  )
}
