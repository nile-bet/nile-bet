'use client'

import { useEffect } from 'react'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { useNotificationStore }
  from '@/lib/stores/notificationStore'
import { toast } from 'sonner'

export function useRealtimeCashier() {
  const { user, updateBalance } =
    useAuthStore()
  const { addNotification } =
    useNotificationStore()

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Balance updates
    const profileChannel = supabase
      .channel(`cashier-profile-${user.id}`)
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

    // Notifications
    const notifChannel = supabase
      .channel(`cashier-notifs-${user.id}`)
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

    // Credit request approvals
    const requestChannel = supabase
      .channel(`cashier-requests-${user.id}`)
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
              `✅ Credit request approved! ETB ${(updated.amount ?? 0).toLocaleString()} added to your balance.`
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

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(requestChannel)
    }
  }, [user?.id])
}