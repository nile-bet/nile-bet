'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { Bell, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AdminNotificationsPage() {
  const { user } = useAuthStore()
  const { notifications, setNotifications, markAllAsRead, markAsRead } = useNotificationStore()
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .select('*')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data)
      })
  }, [user])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <button
          onClick={markAllAsRead}
          className="text-sm text-gold hover:text-gold-light flex items-center gap-1"
        >
          <Check className="w-4 h-4" /> Mark all read
        </button>
      </div>
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                n.is_read
                  ? 'bg-charcoal border-nile-blue/20 opacity-60'
                  : 'bg-nile-blue/10 border-gold/20'
              }`}
            >
              <p className="text-white text-sm">{n.message}</p>
              <p className="text-white/40 text-xs mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
