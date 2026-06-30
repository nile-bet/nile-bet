'use client'

import { useRef, forwardRef } from 'react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'

interface ReceiptSelection {
  matchName: string
  marketName: string
  selection: string
  odd: number
}

interface ThermalReceiptProps {
  slipId: string
  isJackpot?: boolean
  stake: number
  totalOdds?: number
  maxPayout?: number
  netPayout?: number
  winningTax?: number
  taxPercent?: number
  jackpotWinAll?: number
  jackpotMiss1?: number
  selections: ReceiptSelection[]
  bettorUsername?: string
  cashierUsername?: string
  agentUsername?: string
  placedAt: string
  kickOffTime?: string
  platformName?: string
  platformSlogan?: string
  isAnonymous?: boolean
  insuranceApplied?: boolean
}

export const ThermalReceipt = forwardRef<
  HTMLDivElement,
  ThermalReceiptProps
>(function ThermalReceipt(props, ref) {
  const {
    slipId,
    isJackpot = false,
    stake,
    totalOdds,
    maxPayout,
    netPayout,
    winningTax,
    taxPercent = 15,
    jackpotWinAll,
    jackpotMiss1,
    selections,
    bettorUsername,
    cashierUsername,
    agentUsername,
    placedAt,
    platformName = 'NILE Bet',
    platformSlogan = 'Flow into Wins',
    isAnonymous = false,
    insuranceApplied = false,
  } = props

  const [qrDataUrl, setQrDataUrl] =
    useState('')
  const [barcodeDataUrl, setBarcodeDataUrl] =
    useState('')

  useEffect(() => {
    // Generate QR code
    const slipUrl =
      `${typeof window !== 'undefined' ? window.location.origin : 'https://nile-bet.vercel.app'}/slip/${slipId}`

    QRCode.toDataURL(slipUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then(setQrDataUrl)
      .catch(console.error)

    // Generate barcode using bwip-js
    const generateBarcode = async () => {
      try {
        const bwipjs = (
          await import('bwip-js')
        ).default
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
      } catch (err) {
        console.error(
          'Barcode generation failed:',
          err
        )
      }
    }

    generateBarcode()
  }, [slipId])

  const now = new Date(placedAt)
  const dateStr = now.toLocaleDateString(
    'en-ET',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  )
  const timeStr = now.toLocaleTimeString(
    'en-ET',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  )

  return (
    <div
      ref={ref}
      className="thermal-receipt"
      style={{
        width: '80mm',
        minHeight: '200px',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily:
          "'Courier New', Courier, monospace",
        fontSize: '11px',
        padding: '4mm',
        lineHeight: '1.4',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '1px dashed #000',
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
          {platformName.toUpperCase()}
        </div>
        <div style={{ fontSize: '10px' }}>
          {platformSlogan}
        </div>
        {isJackpot && (
          <div
            style={{
              fontSize: '13px',
              fontWeight: 'bold',
              marginTop: '2px',
            }}
          >
            🏆 WEEKEND JACKPOT
          </div>
        )}
        <div
          style={{
            fontSize: '9px',
            marginTop: '3px',
            color: '#555',
          }}
        >
          {dateStr} {timeStr}
        </div>
      </div>

      {/* Slip ID */}
      <div
        style={{
          textAlign: 'center',
          margin: '4px 0',
        }}
      >
        <div style={{ fontSize: '10px' }}>
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
        <div style={{ textAlign: 'center' }}>
          <img
            src={barcodeDataUrl}
            alt={`Barcode for slip ${slipId}`}
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          borderTop: '1px dashed #000',
          margin: '4px 0',
        }}
      />

      {/* Bettor info */}
      <div
        style={{
          fontSize: '10px',
          marginBottom: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Bettor:</span>
          <span style={{ fontWeight: 'bold' }}>
            {isAnonymous
              ? 'Anonymous'
              : bettorUsername
              ? `@${bettorUsername}`
              : 'Anonymous'}
          </span>
        </div>
        {cashierUsername && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Cashier:</span>
            <span>@{cashierUsername}</span>
          </div>
        )}
        {agentUsername && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Agent:</span>
            <span>@{agentUsername}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px dashed #000',
          margin: '4px 0',
        }}
      />

      {/* Selections */}
      <div
        style={{
          fontSize: '10px',
          marginBottom: '4px',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            marginBottom: '3px',
            textAlign: 'center',
          }}
        >
          SELECTIONS ({selections.length})
        </div>
        {selections.map((sel, i) => (
          <div
            key={i}
            style={{
              marginBottom: '5px',
              paddingBottom: '3px',
              borderBottom:
                i < selections.length - 1
                  ? '1px dotted #ccc'
                  : 'none',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                color: '#555',
              }}
            >
              {i + 1}. {sel.matchName}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1px',
              }}
            >
              <span>
                {sel.marketName}: {sel.selection}
              </span>
              <span style={{ fontWeight: 'bold' }}>
                {sel.odd.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px dashed #000',
          margin: '4px 0',
        }}
      />

      {/* Financials */}
      <div style={{ fontSize: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Entry Fee:</span>
          <span style={{ fontWeight: 'bold' }}>{formatETB(stake)}</span>
        </div>
        {totalOdds && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Odds:</span>
            <span>{totalOdds.toFixed(2)}</span>
          </div>
        )}

        {/* Jackpot prize breakdown */}
        {isJackpot && maxPayout && (
          <>
            <div style={{ borderTop: '1px dashed #ccc', margin: '4px 0' }} />
            <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '9px', marginBottom: '3px', letterSpacing: '1px' }}>
              PRIZE BREAKDOWN
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Win All 12 (gross):</span>
              <span>{formatETB(maxPayout)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c00' }}>
              <span>Tax ({taxPercent}%):</span>
              <span>-{formatETB(maxPayout * (taxPercent / 100))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', marginTop: '2px' }}>
              <span>Win All 12 (net):</span>
              <span>{formatETB(maxPayout * (1 - taxPercent / 100))}</span>
            </div>
            {jackpotMiss1 && jackpotMiss1 > 0 && (
              <>
                <div style={{ borderTop: '1px dashed #ccc', margin: '3px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Miss 1 (gross):</span>
                  <span>{formatETB(jackpotMiss1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c00' }}>
                  <span>Tax ({taxPercent}%):</span>
                  <span>-{formatETB(jackpotMiss1 * (taxPercent / 100))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Miss 1 (net):</span>
                  <span>{formatETB(jackpotMiss1 * (1 - taxPercent / 100))}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* Regular slip payout */}
        {!isJackpot && maxPayout && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Max Payout:</span>
            <span>{formatETB(maxPayout)}</span>
          </div>
        )}
        {!isJackpot && winningTax !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
            <span>Tax ({taxPercent}%):</span>
            <span>-{formatETB(winningTax)}</span>
          </div>
        )}
        {!isJackpot && netPayout && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '3px', paddingTop: '3px', borderTop: '1px solid #000' }}>
            <span>Net Payout:</span>
            <span>{formatETB(netPayout)}</span>
          </div>
        )}
        {insuranceApplied && (
          <div style={{ textAlign: 'center', marginTop: '3px', fontSize: '9px', color: '#555' }}>
            🛡️ Insurance Active (10+ selections)
          </div>
        )}
      </div>

      {/* QR Code */}
      {qrDataUrl && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '6px',
          }}
        >
          <img
            src={qrDataUrl}
            alt="Scan to verify"
            style={{
              width: '90px',
              height: '90px',
            }}
          />
          <div
            style={{
              fontSize: '8px',
              color: '#888',
              marginTop: '2px',
            }}
          >
            Scan to verify slip
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: '1px dashed #000',
          marginTop: '6px',
          paddingTop: '4px',
          textAlign: 'center',
          fontSize: '9px',
          color: '#555',
        }}
      >
        <div>Thank you for betting with</div>
        <div style={{ fontWeight: 'bold' }}>
          {platformName}
        </div>
        <div style={{ marginTop: '2px' }}>
          Must be 18+ to bet
        </div>
        <div>Bet responsibly</div>
        <div style={{ marginTop: '4px' }}>
          ═══════════════════════
        </div>
      </div>
    </div>
  )
})