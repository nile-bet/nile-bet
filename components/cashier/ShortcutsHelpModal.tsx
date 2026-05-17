'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

interface ShortcutsHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  {
    key: 'Ctrl + R',
    label: 'Open Redeem Coupon',
    color: 'text-gold',
  },
  {
    key: 'Ctrl + N',
    label: 'Clear Bet Slip',
    color: 'text-nile-blue-light',
  },
  {
    key: 'Ctrl + K',
    label: 'Go to Check Slip',
    color: 'text-nile-success',
  },
  {
    key: 'Ctrl + B',
    label: 'Go to Dashboard',
    color: 'text-white/70',
  },
  {
    key: '?',
    label: 'Show This Help',
    color: 'text-white/50',
  },
  {
    key: 'Enter',
    label: 'Auto-submit Slip ID (scanner)',
    color: 'text-nile-orange',
  },
  {
    key: 'Escape',
    label: 'Close Modal / Blur Input',
    color: 'text-white/40',
  },
]

export function ShortcutsHelpModal({
  isOpen,
  onClose,
}: ShortcutsHelpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-gold" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-2 border-b border-nile-blue/20"
            >
              <span className="text-white/60 text-sm">
                {s.label}
              </span>
              <kbd
                className={`bg-charcoal border border-nile-blue/40 rounded px-2.5 py-1 text-xs font-mono font-semibold ${s.color}`}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs mt-2 text-center">
          Press ? again or Escape to close
        </p>
      </DialogContent>
    </Dialog>
  )
}