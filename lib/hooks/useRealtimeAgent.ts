'use client'

import { useEffect } from 'react'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { useNotificationStore }
  from '@/lib/stores/notificationStore'
import { toast } from 'sonner'
import { formatETB }
  from '@/lib/utils/formatCurrency'

export function useRealtimeAgent() {
  const {
    user,
    updateBalance,
  } = useAuthStore()
  const { addNotification } =
    useNotificationStore()

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Balance updates
    const profileChannel = supabase
      .channel(`agent-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any
          updateBalance(updated.credit_balance)
        }
      )
      .subscribe()

    // Credit request status
    const requestChannel = supabase
      .channel(`agent-requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'credit_requests',
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.status === 'approved') {
            toast.success(
              `✅ Credit request approved! ETB ${(updated.amount ?? 0).toLocaleString()} added.`
            )
          } else if (
            updated.status === 'declined'
          ) {
            toast.error(
              `❌ Credit request declined.${updated.admin_note ? ` Reason: ${updated.admin_note}` : ''}`
            )
          }
        }
      )
      .subscribe()

    // Notifications
    const notifChannel = supabase
      .channel(`agent-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          addNotification(payload.new as any)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(requestChannel)
      supabase.removeChannel(notifChannel)
    }
  }, [user?.id])
}