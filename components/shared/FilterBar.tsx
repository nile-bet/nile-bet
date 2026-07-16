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
    <div className={cn('bg-[#141F36] border-b border-white/5', className)}>
      <div className="flex flex-col px-3 md:px-4 py-2.5 gap-2">
        {/* Date filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {dateFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleSelect(f.key)}
              className={cn(
                'text-base px-6 md:px-10 py-3 rounded-full border font-bold flex-shrink-0 flex-1 md:flex-1 min-w-fit transition-all duration-150',
                active === f.key
                  ? 'bg-gold border-gold text-charcoal'
                  : 'border-transparent bg-[#1E2A47] text-white/70 hover:bg-[#26335A]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {timeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleSelect(f.key)}
              className={cn(
                'text-xs px-3.5 py-1.5 rounded-full border font-medium flex-shrink-0 transition-all duration-150',
                active === f.key
                  ? f.urgent
                    ? 'bg-nile-orange border-nile-orange text-white'
                    : 'bg-gold border-gold text-charcoal'
                  : f.urgent
                  ? 'border-nile-orange/60 text-nile-orange bg-[#2A1508] hover:bg-[#3A1C0B]'
                  : 'border-transparent text-white/70 bg-[#1E2A47] hover:bg-[#26335A]'
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

      </div>
    </div>
  )
}
