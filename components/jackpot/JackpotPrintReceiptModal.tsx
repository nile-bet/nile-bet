'use client'

import { useRef, useEffect, useState } from 'react'
import { usePrint } from '@/lib/hooks/usePrint'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getJackpotSlipById } from '@/lib/actions/jackpot'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatETB } from '@/lib/utils/formatCurrency'
import { Printer, Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

interface Props {
  isOpen: boolean
  onClose: () => void
  slipId: string
  jackpot: any
  bettorUsername?: string
}

export function JackpotPrintReceiptModal({
  isOpen,
  onClose,
  slipId,
  jackpot,
  bettorUsername,
}: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  const [slip, setSlip] = useState<any>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [barcodeDataUrl, setBarcodeDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen || !slipId) return
    // Fetch immediately, then retry a couple times if selections aren't attached yet
    // (slip_selections may be inserted a moment after the slip row itself)
    let attempts = 0
    let cancelled = false
    const tryFetch = () => {
      getJackpotSlipById(slipId).then((s) => {
        if (cancelled) return
        setSlip(s)
        const sels = s?.jackpot_slip_selections ?? []
        if (sels.length === 0 && attempts < 3) {
          attempts++
          setTimeout(tryFetch, 1000)
        }
      })
    }
    tryFetch()
    const url = `${window.location.origin}/slip/${slipId}`
    QRCode.toDataURL(url, { width: 120, margin: 1 })
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
    return () => { cancelled = true }
  }, [isOpen, slipId])

  const handlePrint = usePrint(receiptRef, {
    documentTitle: `NILE-Jackpot-${slipId}`,
    onAfterPrint: () => toast.success('Receipt printed!'),
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      @media print {
        body { margin: 0; }
        .thermal-receipt { width: 80mm !important; }
      }
    `,
  })

  const handleCopyId = () => {
    navigator.clipboard.writeText(slipId)
    setCopied(true)
    toast.success('Slip ID copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/slip/${slipId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `NILE Jackpot #${slipId}`, url })
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  const selections = slip?.jackpot_slip_selections?.sort(
    (a: any, b: any) => a.game_number - b.game_number
  ) ?? []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-lg w-full" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-gold" />
            Jackpot Receipt
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

        {/* Slip summary */}
        <div className="bg-charcoal/50 rounded-xl p-4 mb-4 text-center">
          <p className="text-white/50 text-xs mb-1">JACKPOT SLIP ID</p>
          <p className="text-gold font-mono text-2xl font-bold tracking-widest">#{slipId}</p>
          <p className="text-white/50 text-xs mt-1">🏆 {jackpot?.name}</p>
          <p className="text-nile-success text-sm mt-1">
            Win All: {formatETB(jackpot?.win_all_reward ?? 0)}
          </p>
          {(jackpot?.near_win_reward ?? 0) > 0 && (
            <p className="text-gold text-xs mt-0.5">🛡️ Miss 1: {formatETB(jackpot?.near_win_reward ?? 0)}</p>
          )}
        </div>

        {/* Retry if selections missing */}
        {slip && selections.length === 0 && (
          <div className="flex items-center justify-between bg-nile-orange/10 border border-nile-orange/30 rounded-lg px-3 py-2 mb-3">
            <p className="text-nile-orange text-xs">Picks still loading...</p>
            <button
              onClick={() => getJackpotSlipById(slipId).then(setSlip)}
              className="text-xs bg-nile-orange/20 text-nile-orange px-3 py-1 rounded-lg hover:bg-nile-orange/30"
            >
              🔄 Reload
            </button>
          </div>
        )}

        {/* Receipt preview */}
        <div
          className="border border-dashed border-nile-blue/30 rounded-lg overflow-hidden"
          style={{ maxHeight: '55vh', overflowY: 'auto' }}
        >
          <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', backgroundColor: 'white' }}>
            {/* Thermal receipt */}
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
              <div style={{ fontSize: '10px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Jackpot:</span>
                  <span>{jackpot?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date:</span>
                  <span>{slip?.created_at ? new Date(slip.created_at).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-ET')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Time:</span>
                  <span>{slip?.created_at ? new Date(slip.created_at).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-ET')}</span>
                </div>
                {!slip?.is_anonymous && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Bettor:</span>
                    <span>{bettorUsername ?? (user ? `@${user.username}` : 'Anonymous')}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {/* Rewards */}
              <div style={{ fontSize: '10px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Win All 12:</span>
                  <span style={{ fontWeight: 'bold' }}>{formatETB(jackpot?.win_all_reward ?? 0)}</span>
                </div>
                {(jackpot?.near_win_reward ?? 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Miss 1 (Insured):</span>
                    <span>{formatETB(jackpot?.near_win_reward ?? 0)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Entry Fee:</span>
                  <span style={{ fontWeight: 'bold' }}>{formatETB(jackpot?.fixed_stake ?? 0)}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {/* Selections */}
              <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px' }}>
                MY PICKS ({selections.length}/12)
                {selections.length === 0 && (
                  <span style={{ fontSize: '9px', color: '#888', marginLeft: '4px' }}>(loading...)</span>
                )}
              </div>
              {selections.length === 0 ? (
                <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', padding: '6px 0' }}>
                  Picks loading — tap Reload above
                </div>
              ) : (
                selections.map((sel: any, i: number) => {
                  const match = sel.jackpot_matches
                  const pick = sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'
                  const isCorrect = sel.result === 'correct'
                  const isWrong = sel.result === 'wrong'
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '9px',
                      marginBottom: '2px',
                      padding: '2px 3px',
                      backgroundColor: isCorrect ? '#e8f5e9' : isWrong ? '#ffebee' : 'transparent',
                      borderRadius: '3px',
                    }}>
                      <span style={{ flex: 1 }}>
                        {sel.game_number}. {match?.home_team ?? 'Home'} v {match?.away_team ?? 'Away'}
                      </span>
                      <span style={{ fontWeight: 'bold', marginLeft: '6px', minWidth: '14px', textAlign: 'right' }}>
                        {pick}{isCorrect ? ' ✓' : isWrong ? ' ✗' : ''}
                      </span>
                    </div>
                  )
                })
              )}

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
              </div>
            </div>
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
