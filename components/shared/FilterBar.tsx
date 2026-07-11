'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export type FilterType =
  | 'today'
  | 'tomorrow'
  | 'weekly'
  | '1hr'
  | '3hr'
  | '6hr'
  | '12hr'

interface FilterBarProps {
  onFilterChange: (
    filter: FilterType | null
  ) => void
  matchCount?: number
  className?: string
}

const dateFilters: {
  key: FilterType
  label: string
}[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'weekly', label: 'Weekly' },
]

const timeFilters: {
  key: FilterType
  label: string
  urgent?: boolean
}[] = [
  { key: '1hr', label: '🔥 1 Hr', urgent: true },
  { key: '3hr', label: '🔥 3 Hr', urgent: true },
  { key: '6hr', label: '6 Hr' },
  { key: '12hr', label: '12 Hr' },
]

export function FilterBar({
  onFilterChange,
  matchCount,
  className,
}: FilterBarProps) {
  const [active, setActive] =
    useState<FilterType | null>(null)

  const handleSelect = (
    key: FilterType
  ) => {
    const next =
      active === key ? null : key
    setActive(next)
    onFilterChange(next)
  }

  const clear = () => {
    setActive(null)
    onFilterChange(null)
  }

  const filterLabel: Record<
    FilterType,
    string
  > = {
    today: 'Today',
    tomorrow: 'Tomorrow',
    weekly: 'Weekly',
    '1hr': '🔥 Within 1 hour',
    '3hr': '🔥 Within 3 hours',
    '6hr': 'Within 6 hours',
    '12hr': 'Within 12 hours',
  }

  return (
    <div className={cn('bg-slate-dark md:bg-[#0D1526] border-b border-white/5', className)}>
      <div className="flex flex-col md:flex-row md:items-center px-3 md:px-6 py-2 md:py-3 md:gap-6">
        {/* Date filters */}
        <div className="flex items-center gap-2 md:gap-3 pt-2.5 pb-1 md:py-0 overflow-x-auto scrollbar-hide">
          {dateFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleSelect(f.key)}
              className={cn(
                'text-sm px-5 py-2 md:px-4 md:py-1.5 rounded-full border font-semibold flex-shrink-0 transition-all duration-150',
                active === f.key
                  ? 'bg-gold border-gold text-charcoal'
                  : 'border-white/20 bg-white/10 text-white shadow-sm hover:border-gold/50 hover:bg-white/15'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="hidden md:block w-px h-6 bg-white/10" />

        {/* Time filters */}
        <div className="flex items-center gap-2 md:gap-3 pb-2.5 md:pb-0 overflow-x-auto scrollbar-hide">
          {timeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleSelect(f.key)}
              className={cn(
                'text-xs px-4 py-1.5 md:px-3.5 md:py-1 rounded-full border font-semibold flex-shrink-0 transition-all duration-150',
                active === f.key
                  ? f.urgent
                    ? 'bg-nile-orange border-nile-orange text-white'
                    : 'bg-gold border-gold text-charcoal'
                  : f.urgent
                  ? 'border-nile-orange/40 text-nile-orange/80 bg-nile-orange/10 hover:bg-nile-orange/20'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-gold/40 hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
          {/* Clear active */}
          {active && (
            <button onClick={clear} className="flex-shrink-0 flex items-center gap-1 text-xs text-white/40 hover:text-white ml-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Match count */}
        {matchCount !== undefined && (
          <span className="hidden md:inline-flex ml-auto flex-shrink-0 text-white/30 text-xs font-medium">
            {matchCount}
          </span>
        )}
      </div>
    </div>
  )
}
