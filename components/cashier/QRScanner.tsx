'use client'

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import { Camera, X } from 'lucide-react'
import { toast } from 'sonner'

interface QRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
  label?: string
}

export function QRScanner({
  onScan,
  onClose,
  label = 'Scan QR Code',
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number>(0)
  const [scanning, setScanning] =
    useState(false)
  const [error, setError] = useState('')

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((t) => t.stop())
      streamRef.current = null
    }
    cancelAnimationFrame(animRef.current)
    setScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          }
        )
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setScanning(true)
        scanLoop()
      }
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied'
          : 'Camera not available'
      )
    }
  }, [])

  const scanLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scan = async () => {
      if (
        video.readyState ===
        video.HAVE_ENOUGH_DATA
      ) {
        canvas.height = video.videoHeight
        canvas.width = video.videoWidth
        ctx.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        )

        try {
          const imageData =
            ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            )
          const jsQR = (
            await import('jsqr')
          ).default
          const code = jsQR(
            imageData.data,
            imageData.width,
            imageData.height
          )

          if (code?.data) {
            // Extract slip ID from URL
            // or use raw data
            const raw = code.data
            const match = raw.match(
              /\/slip\/([A-Z0-9]+)/
            )
            const slipId = match
              ? match[1]
              : raw.trim()

            stopCamera()
            onScan(slipId)
            return
          }
        } catch {
          // jsQR error, continue scanning
        }
      }

      animRef.current = requestAnimationFrame(scan)
    }

    animRef.current = requestAnimationFrame(scan)
  }, [onScan, stopCamera])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  return (
    <div className="bg-charcoal rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-dark">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-gold" />
          <span className="text-white text-sm font-medium">
            {label}
          </span>
        </div>
        <button
          onClick={() => {
            stopCamera()
            onClose()
          }}
          className="text-white/50 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-6 text-center">
          <p className="text-nile-danger text-sm">
            {error}
          </p>
          <button
            onClick={startCamera}
            className="mt-3 border border-gold/30 text-gold px-4 py-2 rounded-lg text-xs"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full"
            style={{ maxHeight: '300px' }}
            playsInline
            muted
          />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Scan overlay */}
              <div className="w-48 h-48 border-2 border-gold rounded-lg relative">
                {/* Corner decorations */}
                {['tl', 'tr', 'bl', 'br'].map(
                  (corner) => (
                    <div
                      key={corner}
                      className={`absolute w-6 h-6 border-gold border-2
                        ${corner === 'tl' ? 'top-0 left-0 border-r-0 border-b-0' : ''}
                        ${corner === 'tr' ? 'top-0 right-0 border-l-0 border-b-0' : ''}
                        ${corner === 'bl' ? 'bottom-0 left-0 border-r-0 border-t-0' : ''}
                        ${corner === 'br' ? 'bottom-0 right-0 border-l-0 border-t-0' : ''}
                      `}
                    />
                  )
                )}
                {/* Scan line animation */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gold/70 animate-bounce"
                  style={{ top: '50%' }}
                />
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>
      )}

      <div className="px-4 py-3 text-center">
        <p className="text-white/40 text-xs">
          {scanning
            ? 'Scanning...'
            : 'Starting camera...'}
        </p>
      </div>
    </div>
  )
}