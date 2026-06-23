'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'

export function useRealtimeAdmin() {
  const { user, updateBalance } = useAuthStore()
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()

    const profileChannel = supabase
      .channel(`admin-profile-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as any
        updateBalance(updated.credit_balance)
      })
      .subscribe()

    const notifChannel = supabase
      .channel(`admin-notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `to_user_id=eq.${user.id}`,
      }, (payload) => {
        addNotification(payload.new as any)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(notifChannel)
    }
  }, [user?.id])
}
