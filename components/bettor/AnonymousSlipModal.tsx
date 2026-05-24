'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Copy, Check, Ticket } from 'lucide-react'
import { formatETB } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'

interface AnonymousSlipModalProps {
  isOpen: boolean
  onClose: () => void
  slipCode: string
  stake: number
  totalOdds: number
  maxPayout: number
  winningTax: number
  netPayout: number
  selections: {
    homeTeam: string
    awayTeam: string
    marketName: string
    selection: string
    odd: number
  }[]
  onOk: () => void
}

export function AnonymousSlipModal({
  isOpen,
  onClose,
  slipCode,
  stake,
  totalOdds,
  maxPayout,
  winningTax,
  netPayout,
  selections,
  onOk,
}: AnonymousSlipModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(slipCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOk = () => {
    onOk()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-gold" />
            Your Slip Code
          </DialogTitle>
        </DialogHeader>

        {/* Slip Code */}
        <div className="bg-charcoal/50 rounded-xl p-4 text-center mb-2">
          <p className="text-white/50 text-xs mb-1 uppercase tracking-widest">Slip Code</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-gold font-mono text-3xl font-bold tracking-widest">
              {slipCode}
            </p>
            <button
              onClick={handleCopy}
              className="text-white/50 hover:text-gold transition-colors"
            >
              {copied
                ? <Check className="w-5 h-5 text-nile-success" />
                : <Copy className="w-5 h-5" />}
            </button>
          </div>
          {copied && <p className="text-[10px] text-nile-success mt-1">Copied!</p>}
          <p className="text-white/40 text-xs mt-2">Show this code to the cashier to place your bet</p>
        </div>

        {/* Receipt preview */}
        <div className="border border-dashed border-nile-blue/30 rounded-lg overflow-hidden">
          <div className="bg-white text-black font-mono text-[11px] p-4" style={{ lineHeight: '1.5' }}>
            {/* Header */}
            <div className="text-center border-b border-dashed border-black pb-2 mb-3">
              <div className="text-lg font-bold tracking-widest">NILE BET</div>
              <div className="text-[10px]">Flow into Wins</div>
              <div className="text-[9px] text-gray-500 mt-1">{new Date().toLocaleString('en-ET')}</div>
            </div>

            {/* Slip ID */}
            <div className="text-center mb-3">
              <div className="text-[10px]">SLIP CODE</div>
              <div className="text-xl font-bold tracking-widest">#{slipCode}</div>
              <div className="text-[9px] text-gray-500">Anonymous / Cash Bet</div>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Selections */}
            <div className="mb-3">
              <div className="font-bold text-center mb-2">SELECTIONS ({selections.length})</div>
              {selections.map((s, i) => (
                <div key={i} className="mb-2 pb-2 border-b border-dotted border-gray-300 last:border-0">
                  <div className="text-[9px] text-gray-500">{i + 1}. {s.homeTeam} vs {s.awayTeam}</div>
                  <div className="flex justify-between mt-0.5">
                    <span>{s.marketName}: {s.selection}</span>
                    <span className="font-bold">{s.odd.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Financials */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Stake:</span>
                <span className="font-bold">{formatETB(stake)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Odds:</span>
                <span>{totalOdds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Payout:</span>
                <span>{formatETB(maxPayout)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax (15%):</span>
                <span>-{formatETB(winningTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-[13px] pt-1 border-t border-black mt-1">
                <span>Net Payout:</span>
                <span>{formatETB(netPayout)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-black mt-3 pt-2 text-center text-[9px] text-gray-500">
              <div>Thank you for betting with NILE Bet</div>
              <div>Must be 18+ · Bet responsibly</div>
              <div className="mt-1">═══════════════════</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleOk}
          className="w-full bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light mt-2"
        >
          OK — Done
        </button>
      </DialogContent>
    </Dialog>
  )
}
