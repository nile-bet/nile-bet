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

export function useRealtimeBettor() {
  const { user, updateBalance,
    updateReservedBalance } = useAuthStore()
  const { addNotification } =
    useNotificationStore()

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Profile balance updates
    const profileChannel = supabase
      .channel(`profile-${user.id}`)
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
          updateReservedBalance(
            updated.reserved_balance ?? 0
          )
        }
      )
      .subscribe()

    // Slip status changes
    const slipsChannel = supabase
      .channel(`slips-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'slips',
          filter: `bettor_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.status === 'won') {
            toast.success(
              `🎉 You won ${formatETB(updated.net_payout)}!`,
              { duration: 8000 }
            )
          } else if (
            updated.status === 'near_win'
          ) {
            toast(
              `🛡️ Insurance applied! ${formatETB(updated.insurance_payout)} credited`,
              { duration: 8000 }
            )
          } else if (
            updated.status === 'lost'
          ) {
            toast('Better luck next time! 💪')
          }
        }
      )
      .subscribe()

    // Notifications
    const notifChannel = supabase
      .channel(`notifs-${user.id}`)
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
          toast(
            (payload.new as any).message,
            { duration: 5000 }
          )
        }
      )
      .subscribe()

    // Coupon status
    const couponChannel = supabase
      .channel(`coupons-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coupons',
          filter: `bettor_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.status === 'redeemed') {
            toast.success(
              '✅ Your coupon has been redeemed!'
            )
          } else if (
            updated.status === 'expired'
          ) {
            toast.error(
              'Your coupon has expired. Generate a new one.'
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(slipsChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(couponChannel)
    }
  }, [user?.id])
}