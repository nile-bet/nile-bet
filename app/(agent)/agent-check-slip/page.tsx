'use client'

import { useState } from 'react'
import { getSlipById }
  from '@/lib/actions/bets'
import { SlipDetailCard }
  from '@/components/shared/SlipDetailCard'
import { LoadingSpinner }
  from '@/components/shared/LoadingSpinner'
import { Search } from 'lucide-react'
import type { SlipWithSelections }
  from '@/types/database.types'

export default function AgentCheckSlipPage() {
  const [slipId, setSlipId] = useState('')
  const [slip, setSlip] =
    useState<SlipWithSelections | null>(null)
  const [loading, setLoading] =
    useState(false)
  const [notFound, setNotFound] =
    useState(false)

  const handleCheck = async () => {
    const id = slipId.trim().toUpperCase()
    if (!id) return
    setLoading(true)
    setNotFound(false)
    setSlip(null)

    const data = await getSlipById(id)
    if (data) {
      setSlip(data)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        Check Slip
      </h1>

      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 mb-6">
        <label className="text-xs text-white/60 block mb-2">
          Enter Slip ID or Scan Barcode
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={slipId}
            onChange={(e) =>
              setSlipId(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCheck()
              }
            }}
            placeholder="e.g. 48392017"
            maxLength={10}
            autoFocus
            className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white font-mono text-center text-lg placeholder:text-white/25 placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-gold/50"
          />
          <button
            onClick={handleCheck}
            disabled={
              !slipId.trim() || loading
            }
            className="bg-gold text-charcoal px-5 py-3 rounded-lg font-semibold text-sm hover:bg-gold-light disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Check
          </button>
        </div>
        <p className="text-white/30 text-xs mt-2">
          ↵ Press Enter to auto-submit (works with barcode scanner)
        </p>
      </div>

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
            Check the ID and try again
          </p>
        </div>
      )}

      {slip && !loading && (
        <SlipDetailCard
          slip={slip}
          showShareOptions
        />
      )}
    </div>
  )
}