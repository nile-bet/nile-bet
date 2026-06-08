'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

const PRESETS = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'lifetime', label: 'Lifetime' },
  { key: 'custom', label: 'Custom Range' },
]

export interface DateFilterValue {
  type: 'daily' | 'weekly' | 'monthly' | 'lifetime' | 'custom'
  startDate?: string
  endDate?: string
}

interface DateRangeFilterProps {
  value: DateFilterValue
  onChange: (v: DateFilterValue) => void
  onExport?: () => void
  exportLoading?: boolean
}

export function DateRangeFilter({ value, onChange, onExport, exportLoading }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(value.type === 'custom')
  const [start, setStart] = useState(value.startDate ?? '')
  const [end, setEnd] = useState(value.endDate ?? '')

  const handlePreset = (key: string) => {
    if (key === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    onChange({ type: key as any })
  }

  const handleApplyCustom = () => {
    if (!start || !end) return
    onChange({ type: 'custom', startDate: start, endDate: end + 'T23:59:59' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((f) => (
        <button
          key={f.key}
          onClick={() => handlePreset(f.key)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            (value.type === f.key || (f.key === 'custom' && showCustom))
              ? 'bg-gold text-charcoal'
              : 'bg-slate-dark border border-nile-blue/30 text-white/60 hover:text-white'
          )}
        >
          {f.key === 'custom' ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{f.label}</span> : f.label}
        </button>
      ))}

      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="bg-slate-dark border border-nile-blue/30 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold/50"
          />
          <span className="text-white/40 text-sm">to</span>
          <input
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="bg-slate-dark border border-nile-blue/30 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold/50"
          />
          <button
            onClick={handleApplyCustom}
            disabled={!start || !end}
            className="bg-gold text-charcoal px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}

      {onExport && (
        <button
          onClick={onExport}
          disabled={exportLoading}
          className="border border-gold/30 text-gold px-4 py-1.5 rounded-lg text-sm hover:bg-gold/10 disabled:opacity-40 flex items-center gap-2 ml-auto"
        >
          📊 Export Excel
        </button>
      )}
    </div>
  )
}
