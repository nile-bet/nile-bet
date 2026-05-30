'use client'

import { useRef, useState } from 'react'
import { usePrint } from '@/lib/hooks/usePrint'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ThermalReceipt }
  from './ThermalReceipt'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { Printer, Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface PrintReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  slipData: {
    slipId: string
    isJackpot?: boolean
    stake: number
    totalOdds?: number
    maxPayout?: number
    netPayout?: number
    winningTax?: number
    selections: {
      matchName: string
      marketName: string
      selection: string
      odd: number
    }[]
    bettorUsername?: string
    cashierUsername?: string
    agentUsername?: string
    placedAt: string
    isAnonymous?: boolean
    insuranceApplied?: boolean
    cancellationDeadline?: string
  }
}

export function PrintReceiptModal({
  isOpen,
  onClose,
  slipData,
}: PrintReceiptModalProps) {
  const receiptRef =
    useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const handlePrint = usePrint(receiptRef, {
    
    documentTitle: `NILE-Bet-${slipData.slipId}`,
    onAfterPrint: () => {
      toast.success('Receipt printed!')
    },
    onPrintError: () => {
      toast.error(
        'Print failed. Check printer connection.'
      )
    },
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .thermal-receipt {
          width: 80mm !important;
        }
      }
    `,
  })

  const handleCopyId = () => {
    navigator.clipboard.writeText(
      slipData.slipId
    )
    setCopied(true)
    toast.success('Slip ID copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const slipUrl = `${window.location.origin}/slip/${slipData.slipId}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NILE Bet Slip #${slipData.slipId}`,
          text: `Check my bet slip! Potential win: ${formatETB(slipData.netPayout ?? 0)}`,
          url: slipUrl,
        })
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(slipUrl)
      toast.success('Slip link copied!')
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-lg w-full" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-gold" />
            Bet Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 border border-nile-blue/30 text-white/60 px-3 py-2.5 rounded-lg text-sm hover:text-white"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopyId}
            className="flex items-center justify-center gap-1.5 border border-nile-blue/30 text-white/60 px-3 py-2.5 rounded-lg text-sm hover:text-white"
          >
            {copied ? (
              <Check className="w-4 h-4 text-nile-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Slip ID & Payout summary */}
        <div className="bg-charcoal/50 rounded-xl p-4 mb-4 text-center">
          <p className="text-white/50 text-xs mb-1">
            SLIP ID
          </p>
          <p className="text-gold font-mono text-2xl font-bold tracking-widest">
            #{slipData.slipId}
          </p>
          {slipData.netPayout && (
            <p className="text-nile-success text-sm mt-1">
              Potential win:{' '}
              {formatETB(slipData.netPayout)}
            </p>
          )}
          {slipData.insuranceApplied && (
            <p className="text-gold text-xs mt-0.5">
              🛡️ Insured slip
            </p>
          )}
        </div>

        {/* Receipt preview */}
        <div
          className="border border-dashed border-nile-blue/30 rounded-lg overflow-hidden"
          style={{ maxHeight: '55vh', overflowY: 'auto' }}
        >
          <div
            style={{
              transform: 'scale(0.85)',
              transformOrigin: 'top center',
              backgroundColor: 'white',
            }}
          >
            <ThermalReceipt
              ref={receiptRef}
              {...slipData}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full border border-white/20 text-white/60 py-2.5 rounded-lg text-sm mt-2 hover:text-white"
        >
          Close
        </button>
      </DialogContent>
    </Dialog>
  )
}