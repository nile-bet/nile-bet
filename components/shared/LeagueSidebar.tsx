'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  openPanelRef?: React.MutableRefObject<(() => void) | null>
}

export function LeagueSidebar({
  countries,
  topLeagues,
  selectedLeagueId,
  onLeagueSelect,
  className,
  openPanelRef,
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

  if (openPanelRef) {
    openPanelRef.current = () => setShowCountriesPanel(true)
  }

  const handleLeagueSelect = (id: string | 'top') => {
    onLeagueSelect(id)
    setShowCountriesPanel(false)
    setOpenCountry(null)
  }

  return (
    <div className={cn('w-[200px] flex-shrink-0 bg-[#1C2155] border-r border-[rgba(212,175,55,0.15)] flex flex-col relative', className)}>
      {/* Search */}
      <div className="p-3 border-b border-gold/10 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input type="text" placeholder="Search leagues..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-charcoal border border-gold/20 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="pt-2">
          <div className="px-3 py-1 flex items-center gap-1.5">
            <Star className="w-3 h-3 text-gold/60" />
            <span className="text-[10px] text-gold/60 tracking-widest uppercase font-medium">Top Leagues</span>
          </div>
          <button onClick={() => handleLeagueSelect('top')}
            className={cn('w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 transition-colors',
              selectedLeagueId === 'top' ? 'bg-gold/10 text-gold border-l-2 border-gold' : 'text-white/70 hover:bg-gold/5 hover:text-white border-l-2 border-transparent'
            )}>
            <span>⭐</span><span className="truncate">All Top Leagues</span>
          </button>
          {filteredTop.map((league) => (
            <button key={league.id} onClick={() => handleLeagueSelect(league.id)}
              className={cn('w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors',
                selectedLeagueId === league.id ? 'bg-gold/10 text-gold border-l-2 border-gold' : 'text-white/60 hover:bg-gold/5 hover:text-white border-l-2 border-transparent'
              )}>
              <span className="flex-shrink-0"><FlagImage emoji={(league as any).flag_emoji ?? '🏳️'} /></span>
              <span className="truncate">{league.name}</span>
            </button>
          ))}
        </div>
        <div className="mx-3 my-2 border-t border-gold/10" />
        <button onClick={() => setShowCountriesPanel(true)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-gold hover:bg-gold/10 transition-colors border border-gold/20 rounded-none">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[11px] tracking-widest uppercase font-bold">All Countries</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Portal overlay */}
      {showCountriesPanel && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowCountriesPanel(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 99998,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />
          {/* Panel — full width on mobile, 380px on desktop */}
          <div style={{
            position: 'fixed', top: 0, left: 0,
            height: '100%',
            width: 'min(380px, 100vw)',
            backgroundColor: '#0d1526',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.6)',
            borderRight: '1px solid rgba(218,165,32,0.2)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(218,165,32,0.2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe style={{ width: 18, height: 18, color: '#d4a017' }} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Select League</span>
              </div>
              <button onClick={() => setShowCountriesPanel(false)} style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(218,165,32,0.1)', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
                <input type="text" placeholder="Search country or league..." value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#0a0f1e', border: '1px solid rgba(218,165,32,0.2)', borderRadius: 6, paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* Top Leagues */}
              {!countrySearch.trim() && topLeagues.length > 0 && (
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ padding: '8px 16px', backgroundColor: 'rgba(218,165,32,0.05)' }}>
                    <span style={{ fontSize: 10, color: 'rgba(218,165,32,0.7)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>⭐ Top Leagues</span>
                  </div>
                  <button onClick={() => handleLeagueSelect('top')}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, background: selectedLeagueId === 'top' ? 'rgba(218,165,32,0.1)' : 'none', border: 'none', borderLeft: selectedLeagueId === 'top' ? '3px solid #d4a017' : '3px solid transparent', cursor: 'pointer', color: selectedLeagueId === 'top' ? '#d4a017' : 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                    <span>⭐</span><span>All Top Leagues</span>
                  </button>
                  {topLeagues.map((league) => (
                    <button key={league.id} onClick={() => handleLeagueSelect(league.id)}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 8, background: selectedLeagueId === league.id ? 'rgba(218,165,32,0.1)' : 'none', border: 'none', borderLeft: selectedLeagueId === league.id ? '3px solid #d4a017' : '3px solid transparent', cursor: 'pointer', color: selectedLeagueId === league.id ? '#d4a017' : 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                      <FlagImage emoji={(league as any).flag_emoji ?? '🏳️'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{league.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* All Countries */}
              <div style={{ padding: '8px 16px 4px', backgroundColor: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0, zIndex: 1 }}>
                <span style={{ fontSize: 10, color: 'rgba(218,165,32,0.7)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                  All Countries ({filteredCountries.length})
                </span>
              </div>

              {filteredCountries.map((country) => (
                <div key={country.id}>
                  <button
                    onClick={() => setOpenCountry(openCountry === country.id ? null : country.id)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: openCountry === country.id ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                      <FlagImage emoji={country.flag_emoji} />
                      <span>{country.name}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>({country.leagues.length})</span>
                    </span>
                    <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)', transform: openCountry === country.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </button>
                  {openCountry === country.id && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {country.leagues.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '8px 40px' }}>No leagues</p>
                      ) : (
                        country.leagues.map((league) => (
                          <button key={league.id} onClick={() => handleLeagueSelect(league.id)}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 40px', display: 'block', background: selectedLeagueId === league.id ? 'rgba(218,165,32,0.1)' : 'none', border: 'none', cursor: 'pointer', color: selectedLeagueId === league.id ? '#d4a017' : 'rgba(255,255,255,0.6)', fontSize: 12, borderLeft: selectedLeagueId === league.id ? '2px solid #d4a017' : '2px solid transparent' }}>
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
        </>,
        document.body
      )}
    </div>
  )
}
