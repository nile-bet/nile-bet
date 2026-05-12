'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                variant === 'danger'
                  ? 'bg-nile-danger/20'
                  : 'bg-gold/20'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${
                  variant === 'danger'
                    ? 'text-nile-danger'
                    : 'text-gold'
                }`}
              />
            </div>
            <DialogTitle className="text-white text-lg">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/60 text-sm mt-2">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 text-white/60 hover:text-white border border-white/20 hover:border-white/40"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 font-semibold ${
              variant === 'danger'
                ? 'bg-nile-danger hover:bg-nile-danger/80 text-white'
                : 'bg-gold hover:bg-gold-light text-charcoal'
            }`}
          >
            {isLoading
              ? 'Please wait...'
              : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}