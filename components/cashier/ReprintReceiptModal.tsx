'use client'

import { useRef, useEffect, useState } from 'react'
import { usePrint } from '@/lib/hooks/usePrint'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ThermalReceipt } from './ThermalReceipt'
import { getSlipById } from '@/lib/actions/bets'
import { getJackpotSlipById } from '@/lib/actions/jackpot'
import { formatETB } from '@/lib/utils/formatCurrency'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

interface Props {
  isOpen: boolean
  onClose: () => void
  slipId: string
  isJackpot: boolean
}

export function ReprintReceiptModal({ isOpen, onClose, slipId, isJackpot }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [slip, setSlip] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [barcodeDataUrl, setBarcodeDataUrl] = useState('')

  useEffect(() => {
    if (!isOpen || !slipId) return
    setLoading(true)
    setSlip(null)
    setQrDataUrl('')
    setBarcodeDataUrl('')

    const fetch = isJackpot
      ? getJackpotSlipById(slipId)
      : getSlipById(slipId)

    fetch.then((data) => {
      setSlip(data)
      setLoading(false)
    })

    const url = `${window.location.origin}/slip/${slipId}`
    QRCode.toDataURL(url, { width: 120, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(console.error)

    import('bwip-js').then((mod) => {
      const bwipjs = mod.default
      const canvas = document.createElement('canvas')
      bwipjs.toCanvas(canvas, {
        bcid: 'code128',
        text: slipId,
        scale: 2,
        height: 10,
        width: 80,
        includetext: true,
        textxalign: 'center',
        textsize: 10,
        backgroundcolor: 'FFFFFF',
        barcolor: '000000',
      })
      setBarcodeDataUrl(canvas.toDataURL('image/png'))
    }).catch(console.error)
  }, [isOpen, slipId, isJackpot])

  const handlePrint = usePrint(receiptRef, {
    
    documentTitle: `NILE-Reprint-${slipId}`,
    onAfterPrint: () => toast.success('Receipt re-printed!'),
    onPrintError: () => {
      console.error("Print failed")
      toast.error('Print failed. Check printer connection.')
    },
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      @media print {
        body { margin: 0; padding: 0; }
        .thermal-receipt { width: 80mm !important; }
      }
    `,
  })

  // ── Normal slip receipt data ──────────────────────────────────────────────
  const normalSlipData = slip && !isJackpot ? {
    slipId: slip.slip_id,
    isJackpot: false,
    stake: slip.stake,
    totalOdds: slip.total_odds,
    maxPayout: slip.max_payout,
    netPayout: slip.net_payout,
    winningTax: slip.winning_tax,
    placedAt: slip.created_at,
    isAnonymous: slip.is_anonymous,
    insuranceApplied: slip.insurance_applied,
    cancellationDeadline: slip.cancellation_deadline,
    bettorUsername: (slip as any).bettor?.username,
    cashierUsername: (slip as any).cashier?.username,
    agentUsername: (slip as any).agent?.username,
    selections: (slip.slip_selections ?? []).map((sel: any) => ({
      matchName: sel.matches
        ? `${sel.matches.home_team} vs ${sel.matches.away_team}`
        : '',
      marketName: sel.match_markets?.market_templates?.name ?? '',
      selection: sel.selection,
      odd: sel.odd_at_placement ?? 0,
    })),
  } : null

  // ── Jackpot selections ────────────────────────────────────────────────────
  const jackpotSelections = slip?.jackpot_slip_selections
    ?.slice()
    .sort((a: any, b: any) => a.game_number - b.game_number) ?? []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="bg-slate-dark border-nile-blue/40 max-w-lg w-full"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-gold" />
            Re-print Receipt — #{slipId}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="text-white/50 text-sm text-center py-8">Loading slip…</p>
        )}

        {!loading && !slip && (
          <p className="text-nile-danger text-sm text-center py-8">Slip not found.</p>
        )}

        {!loading && slip && (
          <>
            {/* Print button */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
            </div>

            {/* Slip summary */}
            <div className="bg-charcoal/50 rounded-xl p-4 mb-4 text-center">
              <p className="text-white/50 text-xs mb-1">{isJackpot ? 'JACKPOT SLIP' : 'SLIP ID'}</p>
              <p className="text-gold font-mono text-2xl font-bold tracking-widest">#{slipId}</p>
              {isJackpot && slip.jackpots?.name && (
                <p className="text-white/50 text-xs mt-1">🏆 {slip.jackpots.name}</p>
              )}
              {!isJackpot && slip.net_payout && (
                <p className="text-nile-success text-sm mt-1">
                  Potential win: {formatETB(slip.net_payout)}
                </p>
              )}
            </div>

            {/* Receipt preview */}
            <div
              className="border border-dashed border-nile-blue/30 rounded-lg overflow-hidden"
              style={{ maxHeight: '55vh', overflowY: 'auto' }}
            >
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', backgroundColor: 'white' }}>

                {/* ── NORMAL SLIP ── */}
                {!isJackpot && normalSlipData && (
                  <div ref={receiptRef}>
                    <ThermalReceipt {...normalSlipData} />
                    {/* Re-print stamp */}
                    <div style={{
                      fontFamily: "'Courier New', monospace",
                      backgroundColor: '#FFFFFF',
                      textAlign: 'center',
                      fontSize: '10px',
                      color: '#555',
                      borderTop: '1px dashed #000',
                      padding: '4px',
                      letterSpacing: '2px',
                    }}>
                      *** RE-PRINT ***
                    </div>
                  </div>
                )}

                {/* ── JACKPOT SLIP ── */}
                {isJackpot && (
                  <div
                    ref={receiptRef}
                    className="thermal-receipt"
                    style={{
                      width: '80mm',
                      backgroundColor: '#FFFFFF',
                      color: '#000000',
                      fontFamily: "'Courier New', monospace",
                      fontSize: '11px',
                      padding: '4mm',
                      lineHeight: '1.4',
                    }}
                  >
                    {/* Header */}
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '3px' }}>NILE BET</div>
                      <div style={{ fontSize: '10px' }}>Flow into Wins</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>🏆 WEEKEND JACKPOT</div>
                      <div style={{ fontSize: '9px', marginTop: '3px', color: '#555' }}>
                        {new Date(slip.created_at).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(slip.created_at).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Slip ID */}
                    <div style={{ textAlign: 'center', margin: '4px 0' }}>
                      <div style={{ fontSize: '10px' }}>SLIP ID</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px' }}>#{slipId}</div>
                    </div>

                    {/* Barcode */}
                    {barcodeDataUrl && (
                      <div style={{ textAlign: 'center' }}>
                        <img src={barcodeDataUrl} alt="barcode" style={{ maxWidth: '100%', height: 'auto' }} />
                      </div>
                    )}

                    <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                    {/* Info */}
                    <div style={{ fontSize: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Jackpot:</span><span>{slip.jackpots?.name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Entry Fee:</span>
                        <span style={{ fontWeight: 'bold' }}>{formatETB(slip.jackpots?.fixed_stake ?? slip.stake ?? 50)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Win All 12:</span>
                        <span style={{ fontWeight: 'bold' }}>{formatETB(slip.jackpots?.win_all_reward ?? 250000)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Miss 1:</span>
                        <span>{formatETB(slip.jackpots?.near_win_reward ?? 25000)}</span>
                      </div>
                      {slip.bettor?.username && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Bettor:</span><span>@{slip.bettor.username}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                    {/* Selections */}
                    <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px' }}>
                      MY PICKS ({jackpotSelections.length}/12)
                    </div>
                    {jackpotSelections.map((sel: any, i: number) => {
                      const match = sel.jackpot_matches
                      const pick = sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
                          <span>{sel.game_number}. {match?.home_team} v {match?.away_team}</span>
                          <span style={{ fontWeight: 'bold' }}>{pick}</span>
                        </div>
                      )
                    })}

                    {/* QR */}
                    {qrDataUrl && (
                      <div style={{ textAlign: 'center', marginTop: '6px' }}>
                        <img src={qrDataUrl} alt="QR" style={{ width: '80px', height: '80px' }} />
                        <div style={{ fontSize: '8px', color: '#888' }}>Scan to verify</div>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ borderTop: '1px dashed #000', marginTop: '6px', paddingTop: '4px', textAlign: 'center', fontSize: '9px', color: '#555' }}>
                      <div>Good luck! 🏆</div>
                      <div style={{ fontWeight: 'bold' }}>NILE BET</div>
                      <div>Must be 18+ to bet</div>
                      <div style={{ marginTop: '4px' }}>═══════════════════════</div>
                    </div>

                    {/* Re-print stamp */}
                    <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', borderTop: '1px dashed #000', padding: '4px', letterSpacing: '2px' }}>
                      *** RE-PRINT ***
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

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
