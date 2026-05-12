'use client'

import { useState, useEffect } from 'react'
import { X, Megaphone } from 'lucide-react'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Broadcast {
  id: string
  message: string
  priority: 'normal' | 'urgent'
}

export function BroadcastBanner() {
  const [normal, setNormal] =
    useState<Broadcast | null>(null)
  const [urgent, setUrgent] =
    useState<Broadcast | null>(null)
  const { role } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    if (!role) return

    const loadBroadcasts = async () => {
      const dismissed = JSON.parse(
        localStorage.getItem(
          'dismissed_broadcasts'
        ) ?? '[]'
      )

      const roleField =
        role === 'bettor'
          ? 'send_to_bettors'
          : role === 'cashier'
          ? 'send_to_cashiers'
          : role === 'agent'
          ? 'send_to_agents'
          : null

      if (!roleField) return

      const { data } = await supabase
        .from('broadcast_messages')
        .select('*')
        .eq(roleField, true)
        .order('created_at', {
          ascending: false,
        })
        .limit(5)

      if (!data) return

      const unseen = data.filter(
        (b) => !dismissed.includes(b.id)
      )

      const urgentMsg = unseen.find(
        (b) => b.priority === 'urgent'
      )
      const normalMsg = unseen.find(
        (b) => b.priority === 'normal'
      )

      if (urgentMsg) setUrgent(urgentMsg)
      if (normalMsg) setNormal(normalMsg)
    }

    loadBroadcasts()
  }, [role])

  const dismissNormal = () => {
    if (!normal) return
    const dismissed = JSON.parse(
      localStorage.getItem(
        'dismissed_broadcasts'
      ) ?? '[]'
    )
    localStorage.setItem(
      'dismissed_broadcasts',
      JSON.stringify([...dismissed, normal.id])
    )
    setNormal(null)
  }

  const dismissUrgent = () => {
    if (!urgent) return
    const dismissed = JSON.parse(
      localStorage.getItem(
        'dismissed_broadcasts'
      ) ?? '[]'
    )
    localStorage.setItem(
      'dismissed_broadcasts',
      JSON.stringify([
        ...dismissed,
        urgent.id,
      ])
    )
    setUrgent(null)
  }

  return (
    <>
      {/* Normal banner */}
      {normal && (
        <div className="bg-nile-blue/40 border-b border-gold/20 px-4 py-2.5 flex items-center gap-3">
          <Megaphone className="w-4 h-4 text-gold flex-shrink-0" />
          <p className="text-sm text-white flex-1">
            {normal.message}
          </p>
          <button
            onClick={dismissNormal}
            className="text-white/40 hover:text-white flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Urgent modal */}
      <Dialog
        open={!!urgent}
        onOpenChange={() => {}}
      >
        <DialogContent className="bg-slate-dark border-nile-danger/40 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-nile-danger/20 rounded-full">
                <Megaphone className="w-5 h-5 text-nile-danger" />
              </div>
              <DialogTitle className="text-nile-danger text-lg">
                ⚠️ URGENT MESSAGE
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-white/80 text-sm leading-relaxed py-2">
            {urgent?.message}
          </p>
          <Button
            onClick={dismissUrgent}
            className="w-full bg-nile-danger hover:bg-nile-danger/80 text-white font-semibold mt-2"
          >
            OK, I Understand
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}