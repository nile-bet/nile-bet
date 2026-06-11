'use client'

import { useRef, useEffect, useState } from 'react'

import { usePrint } from '@/lib/hooks/usePrint'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getJackpotSlipById,
} from '@/lib/actions/jackpot'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
  formatDate,
} from '@/lib/utils/formatCurrency'
import { Printer, Share2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

interface Props {
  isOpen: boolean
  onClose: () => void
  slipId: string
  jackpot: any
}

export function JackpotPrintReceiptModal({
  isOpen,
  onClose,
  slipId,
  jackpot,
}: Props) {
  const receiptRef =
    useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  const [slip, setSlip] =
    useState<any>(null)
  const [qrDataUrl, setQrDataUrl] =
    useState('')
  const [barcodeDataUrl, setBarcodeDataUrl] =
    useState('')

  useEffect(() => {
    if (!isOpen || !slipId) return

    // Delay fetch so DB has time to commit all selections
    setTimeout(() => {
      getJackpotSlipById(slipId).then(setSlip)
    }, 1000)

    // QR Code
    const url = `${window.location.origin}/slip/${slipId}`
    QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
    })
      .then(setQrDataUrl)
      .catch(console.error)

    // Barcode
    import('bwip-js')
      .then((mod) => {
        const bwipjs = mod.default
        const canvas =
          document.createElement('canvas')
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
        setBarcodeDataUrl(
          canvas.toDataURL('image/png')
        )
      })
      .catch(console.error)
  }, [isOpen, slipId])

  const handlePrint = usePrint(receiptRef, {
    
    documentTitle: `NILE-Jackpot-${slipId}`,
    onAfterPrint: () =>
      toast.success('Receipt printed!'),
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      @media print {
        body { margin: 0; }
        .thermal-receipt { width: 80mm !important; }
      }
    `,
  })

  const selections =
    slip?.jackpot_slip_selections?.sort(
      (a: any, b: any) =>
        a.game_number - b.game_number
    ) ?? []

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-gold" />
            Jackpot Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(slipId)
              toast.success('Slip ID copied!')
            }}
            className="flex items-center justify-center border border-nile-blue/30 text-white/60 px-3 py-2.5 rounded-lg hover:text-white"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              const url = `${window.location.origin}/slip/${slipId}`
              if (navigator.share) {
                await navigator.share({
                  title: `NILE Jackpot #${slipId}`,
                  url,
                })
              } else {
                navigator.clipboard.writeText(url)
                toast.success('Link copied!')
              }
            }}
            className="flex items-center justify-center border border-nile-blue/30 text-white/60 px-3 py-2.5 rounded-lg hover:text-white"
          >
            <Share2 className="w-4 h-4" />
          </button>
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

        {/* Slip summary */}
        <div className="bg-charcoal/50 rounded-xl p-3 mb-4 text-center">
          <p className="text-white/50 text-xs mb-0.5">
            JACKPOT SLIP
          </p>
          <p className="text-gold font-mono text-2xl font-bold">
            #{slipId}
          </p>
          <p className="text-white/50 text-xs mt-1">
            🏆 {jackpot?.name}
          </p>
          <p className="text-gold font-mono text-sm mt-1">
            Entry: {formatETB(jackpot?.fixed_stake ?? 50)}
          </p>
        </div>

        {/* Receipt preview */}
        <div
          className="border border-dashed border-nile-blue/30 rounded-lg overflow-auto"
          style={{ maxHeight: '360px' }}
        >
          <div
            style={{
              transform: 'scale(0.82)',
              transformOrigin: 'top center',
              backgroundColor: 'white',
            }}
          >
            {/* Thermal receipt content */}
            <div
              ref={receiptRef}
              className="thermal-receipt"
              style={{
                width: '80mm',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                fontFamily:
                  "'Courier New', monospace",
                fontSize: '11px',
                padding: '4mm',
                lineHeight: '1.4',
              }}
            >
              {/* Header */}
              <div
                style={{
                  textAlign: 'center',
                  borderBottom:
                    '1px dashed #000',
                  paddingBottom: '4px',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    letterSpacing: '3px',
                  }}
                >
                  NILE BET
                </div>
                <div
                  style={{ fontSize: '10px' }}
                >
                  Flow into Wins
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    marginTop: '2px',
                  }}
                >
                  🏆 WEEKEND JACKPOT
                </div>
              </div>

              {/* Slip ID */}
              <div
                style={{
                  textAlign: 'center',
                  margin: '4px 0',
                }}
              >
                <div
                  style={{ fontSize: '10px' }}
                >
                  SLIP ID
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                  }}
                >
                  #{slipId}
                </div>
              </div>

              {/* Barcode */}
              {barcodeDataUrl && (
                <div
                  style={{
                    textAlign: 'center',
                  }}
                >
                  <img
                    src={barcodeDataUrl}
                    alt="barcode"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  borderTop:
                    '1px dashed #000',
                  margin: '4px 0',
                }}
              />

              {/* Info */}
              <div
                style={{ fontSize: '10px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span>Jackpot:</span>
                  <span>
                    {jackpot?.name}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span>Entry Fee:</span>
                  <span
                    style={{
                      fontWeight: 'bold',
                    }}
                  >
                    {formatETB(
                      jackpot?.fixed_stake ?? 50
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span>Win All 12:</span>
                  <span
                    style={{
                      fontWeight: 'bold',
                    }}
                  >
                    {formatETB(
                      jackpot?.win_all_reward ?? 250000
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span>Miss 1:</span>
                  <span>
                    {formatETB(
                      jackpot?.near_win_reward ?? 25000
                    )}
                  </span>
                </div>
                {!slip?.is_anonymous &&
                  user && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                      }}
                    >
                      <span>Bettor:</span>
                      <span>
                        @{user.username}
                      </span>
                    </div>
                  )}
              </div>

              <div
                style={{
                  borderTop:
                    '1px dashed #000',
                  margin: '4px 0',
                }}
              />

              {/* Selections */}
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginBottom: '3px',
                }}
              >
                MY PICKS ({selections.length}/12)
                {selections.length === 0 && (
                  <span style={{ fontSize: '9px', color: '#888', marginLeft: '4px' }}>(loading...)</span>
                )}
              </div>
              {selections.map(
                (sel: any, i: number) => {
                  const match =
                    sel.jackpot_matches
                  const pick =
                    sel.selection === 'home'
                      ? '1'
                      : sel.selection ===
                        'away'
                      ? '2'
                      : 'X'
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        fontSize: '9px',
                        marginBottom: '2px',
                      }}
                    >
                      <span>
                        {sel.game_number}.{' '}
                        {match?.home_team} v{' '}
                        {match?.away_team}
                      </span>
                      <span
                        style={{
                          fontWeight: 'bold',
                        }}
                      >
                        {pick}
                      </span>
                    </div>
                  )
                }
              )}

              {/* QR */}
              {qrDataUrl && (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '6px',
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{
                      width: '80px',
                      height: '80px',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '8px',
                      color: '#888',
                    }}
                  >
                    Scan to verify
                  </div>
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  borderTop:
                    '1px dashed #000',
                  marginTop: '6px',
                  paddingTop: '4px',
                  textAlign: 'center',
                  fontSize: '9px',
                  color: '#555',
                }}
              >
                <div>Good luck! 🏆</div>
                <div style={{ fontWeight: 'bold' }}>
                  NILE BET
                </div>
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