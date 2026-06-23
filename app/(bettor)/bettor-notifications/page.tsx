'use client'

import { useEffect } from 'react'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { EmptyState }
  from '@/components/shared/EmptyState'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import { useNotificationStore }
  from '@/lib/stores/notificationStore'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { createClient }
  from '@/lib/supabase/client'
import {
  Bell, Trophy, XCircle,
  CheckCircle, Clock, Wallet,
  Megaphone, Gift, RotateCcw,
} from 'lucide-react'
import { formatTimeAgo }
  from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'

function getIcon(type: string) {
  const map: Record<
    string,
    { icon: any; color: string }
  > = {
    slip_won: { icon: Trophy, color: 'text-gold' },
    slip_lost: { icon: XCircle, color: 'text-nile-danger' },
    slip_cancelled: { icon: RotateCcw, color: 'text-white/50' },
    coupon_redeemed: { icon: CheckCircle, color: 'text-nile-success' },
    coupon_expired: { icon: Clock, color: 'text-nile-orange' },
    balance_updated: { icon: Wallet, color: 'text-gold' },
    welcome_bonus: { icon: Gift, color: 'text-gold' },
    jackpot_won: { icon: Trophy, color: 'text-gold' },
    broadcast: { icon: Megaphone, color: 'text-nile-blue-light' },
  }
  return map[type] ?? { icon: Bell, color: 'text-white/50' }
}

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const {
    notifications,
    setNotifications,
    markAsRead: markAsReadLocal,
    markAllAsRead: markAllAsReadLocal,
  } = useNotificationStore()
  const markAsRead = async (id: string) => { markAsReadLocal(id); await markNotificationRead(id) }
  const markAllAsRead = async () => { if (user) { markAllAsReadLocal(); await markAllNotificationsRead(user.id) } }

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    supabase
      .from('notifications')
      .select('*')
      .eq('to_user_id', user.id)
      .order('created_at', {
        ascending: false,
      })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data)
      })
  }, [user])

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-white">
            Notifications
          </h1>
          {notifications.some(
            (n) => !n.is_read
          ) && (
            <button
              onClick={markAllAsRead}
              className="text-gold text-sm hover:text-gold-light flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            message="Notifications about your bets and account will appear here"
            icon={Bell}
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const { icon: Icon, color } =
                getIcon(notif.type)
              return (
                <div
                  key={notif.id}
                  onClick={() =>
                    markAsRead(notif.id)
                  }
                  className={cn(
                    'bg-slate-dark rounded-xl p-4 flex gap-3 cursor-pointer transition-colors hover:bg-nile-blue/10 border',
                    !notif.is_read
                      ? 'border-l-4 border-l-gold border-gold/20 bg-gold/5'
                      : 'border-nile-blue/20'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex-shrink-0',
                      color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm leading-snug">
                      {notif.message}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {formatTimeAgo(
                        notif.created_at
                      )}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-2" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}