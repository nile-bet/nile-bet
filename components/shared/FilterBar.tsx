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
    <div
      className={cn(
        'bg-slate-dark border-b border-gold/10',
        className
      )}
    >
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {/* Date label */}
        <span className="text-[11px] text-gold font-extrabold tracking-widest uppercase mr-1">
          Date
        </span>

        {/* Date filters */}
        {dateFilters.map((f) => (
          <button
            key={f.key}
            onClick={() =>
              handleSelect(f.key)
            }
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-all duration-150',
              active === f.key
                ? 'bg-gold border-gold text-charcoal font-semibold'
                : 'border-gold/30 text-white font-semibold hover:border-gold hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}

        {/* Divider */}
        <div className="h-5 w-px bg-gold/20 mx-1" />

        {/* Time label */}
        <span className="text-[11px] text-gold font-extrabold tracking-widest uppercase mr-1">
          Kick-off
        </span>

        {/* Time filters */}
        {timeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() =>
              handleSelect(f.key)
            }
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-all duration-150',
              active === f.key
                ? f.urgent
                  ? 'bg-nile-orange border-nile-orange text-white font-semibold'
                  : 'bg-gold border-gold text-charcoal font-semibold'
                : f.urgent
                ? 'border-nile-orange/30 text-nile-orange/70 hover:border-nile-orange/60 hover:text-nile-orange'
                : 'border-gold/30 text-white font-semibold hover:border-gold hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}

        {/* Match count */}
        {matchCount !== undefined && (
          <span className="ml-auto bg-gold/10 border border-gold/30 text-gold text-xs rounded-full px-3 py-1">
            {matchCount} matches
          </span>
        )}
      </div>

      {/* Active filter tag */}
      {active && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <span className="text-xs text-white/50">
            Active filter:
          </span>
          <span className="flex items-center gap-1.5 bg-nile-blue border border-gold/30 text-gold text-xs rounded-full px-3 py-0.5">
            {filterLabel[active]}
            <button
              onClick={clear}
              className="text-gold/60 hover:text-gold ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}