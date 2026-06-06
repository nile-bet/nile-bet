'use client'

import { useState, useEffect } from 'react'
import { getSlipById }
  from '@/lib/actions/bets'
import { SlipDetailCard }
  from '@/components/shared/SlipDetailCard'
import { LoadingSpinner }
  from '@/components/shared/LoadingSpinner'
import { QRScanner }
  from '@/components/cashier/QRScanner'
import { Search, Camera, Clock, Trash2 } from 'lucide-react'
import type { SlipWithSelections }
  from '@/types/database.types'

export default function CashierCheckSlipPage() {
  const [slipId, setSlipId] = useState('')
  const [slip, setSlip] =
    useState<SlipWithSelections | null>(null)
  const [loading, setLoading] =
    useState(false)
  const [notFound, setNotFound] =
    useState(false)
  const [showScanner, setShowScanner] =
    useState(false)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('nilebet_slip_history_cashier')
    if (stored) setHistory(JSON.parse(stored))
  }, [])

  const addToHistory = (id: string) => {
    setHistory(prev => {
      const updated = [id, ...prev.filter(i => i !== id)].slice(0, 10)
      localStorage.setItem('nilebet_slip_history_cashier', JSON.stringify(updated))
      return updated
    })
  }

  const clearHistory = () => {
    localStorage.removeItem('nilebet_slip_history_cashier')
    setHistory([])
  }

  const handleCheck = async (id?: string) => {
    const checkId = (
      id ?? slipId
    ).trim().toUpperCase()
    if (!checkId) return
    setLoading(true)
    setNotFound(false)
    setSlip(null)
    setShowScanner(false)

    const data = await getSlipById(checkId)
    if (data) {
      setSlip(data)
      addToHistory(checkId)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  const handleScan = (code: string) => {
    setSlipId(code)
    handleCheck(code)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-white mb-2">
        Check Slip
      </h1>
      <p className="text-white/50 text-sm mb-6">
        Enter slip ID or scan QR / barcode
      </p>

      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 mb-6 space-y-4">
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
            placeholder="48392017"
            maxLength={12}
            autoFocus
            className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white font-mono text-xl text-center placeholder:text-white/20 placeholder:font-sans placeholder:text-base focus:outline-none focus:border-gold/50"
          />
          <button
            onClick={() => handleCheck()}
            disabled={
              !slipId.trim() || loading
            }
            className="bg-gold text-charcoal px-5 py-3 rounded-lg font-semibold text-sm hover:bg-gold-light disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Check
          </button>
          <button
            onClick={() =>
              setShowScanner(!showScanner)
            }
            className="border border-nile-blue/30 text-white/60 px-3 py-3 rounded-lg hover:text-white hover:border-gold/30"
            title="Scan QR Code"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        {/* QR Scanner */}
        {showScanner && (
          <QRScanner
            onScan={handleScan}
            onClose={() =>
              setShowScanner(false)
            }
            label="Scan Slip QR Code"
          />
        )}

        <p className="text-white/25 text-xs text-center">
          ↵ Barcode scanner auto-submits on
          Enter • 📷 Tap camera to scan QR
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

      {history.length > 0 && (
        <div className="mt-6 bg-slate-dark border border-gold/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold/60" />
              <span className="text-sm font-semibold text-white/70">Recent Slips</span>
            </div>
            <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-nile-danger/70 hover:text-nile-danger transition-colors">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="space-y-2">
            {history.map(id => (
              <button key={id} onClick={() => { setSlipId(id); handleCheck(id) }} className="w-full flex items-center justify-between px-3 py-2 bg-charcoal/50 hover:bg-charcoal rounded-lg border border-gold/10 hover:border-gold/30 transition-all">
                <span className="font-mono text-sm text-white">{id}</span>
                <Search className="w-3 h-3 text-white/30" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}