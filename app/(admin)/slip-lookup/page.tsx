'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { SlipDetailCard } from '@/components/shared/SlipDetailCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getSlipById } from '@/lib/actions/bets'
import { cn } from '@/lib/utils'
import type { SlipWithSelections } from '@/types/database.types'

export default function AdminCheckSlipPage() {
  const [slipId, setSlipId] = useState('')
  const [slip, setSlip] = useState<SlipWithSelections | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!slipId.trim()) return
    setLoading(true)
    setError('')
    setSlip(null)
    const result = await getSlipById(slipId.trim())
    if (result) {
      setSlip(result)
    } else {
      setError('Slip not found. Please check the ID and try again.')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Check Slip</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={slipId}
          onChange={(e) => setSlipId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter slip ID (e.g. 12345678)"
          className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-gold text-charcoal px-6 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>
      {loading && <LoadingSpinner />}
      {error && (
        <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg px-4 py-3">
          <p className="text-nile-danger text-sm">{error}</p>
        </div>
      )}
      {slip && <SlipDetailCard slip={slip} />}
    </div>
  )
}
