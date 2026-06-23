'use client'

import { useState } from 'react'
import {
  Bell,
  Check,
  Trophy,
  CheckCircle,
  Clock,
  Wallet,
  Megaphone,
  Gift,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuthStore } from '@/lib/stores/authStore'
import { useNotificationStore }
  from '@/lib/stores/notificationStore'
import { formatTimeAgo }
  from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { Notification }
  from '@/types/database.types'

type IconConfig = {
  icon: React.ElementType
  color: string
}

function getNotifIcon(
  type: string
): IconConfig {
  const icons: Record<string, IconConfig> = {
    slip_won: {
      icon: Trophy,
      color: 'text-gold',
    },
    slip_lost: {
      icon: XCircle,
      color: 'text-nile-danger',
    },
    slip_cancelled: {
      icon: RotateCcw,
      color: 'text-white/50',
    },
    coupon_redeemed: {
      icon: CheckCircle,
      color: 'text-nile-success',
    },
    coupon_expired: {
      icon: Clock,
      color: 'text-nile-orange',
    },
    balance_updated: {
      icon: Wallet,
      color: 'text-gold',
    },
    welcome_bonus: {
      icon: Gift,
      color: 'text-gold',
    },
    jackpot_won: {
      icon: Trophy,
      color: 'text-gold',
    },
    broadcast: {
      icon: Megaphone,
      color: 'text-nile-blue-light',
    },
  }

  return icons[type] ?? {
    icon: Bell,
    color: 'text-white/50',
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { role } = useAuthStore()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore()
  const notifPath = role === 'admin'
    ? '/notifications'
    : role === 'agent'
    ? '/agent-notifications'
    : role === 'cashier'
    ? '/cashier-notifications'
    : '/bettor-notifications'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-white/60 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-nile-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9
                ? '9+'
                : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-slate-dark border-nile-blue/40"
        align="end"
      >
        <div className="flex items-center justify-between p-4 border-b border-nile-blue/20">
          <h3 className="font-semibold text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-gold text-xs hover:text-gold-light flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-white/40 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (() => {
            const unread = notifications.filter((n: Notification) => !n.is_read).slice(0, 50)
            const read = notifications.filter((n: Notification) => n.is_read).slice(0, 20)

            const renderNotif = (notif: Notification) => {
              const { icon: Icon, color } = getNotifIcon(notif.type)
              return (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    'flex gap-3 p-3 cursor-pointer hover:bg-nile-blue/10 transition-colors border-b border-nile-blue/10',
                    !notif.is_read && 'border-l-2 border-l-gold bg-gold/5'
                  )}
                >
                  <div className={cn('mt-0.5 flex-shrink-0', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-snug">{notif.message}</p>
                    <p className="text-xs text-white/40 mt-0.5">{formatTimeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" />
                  )}
                </div>
              )
            }

            return (
              <>
                {/* Unread section */}
                {unread.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 flex items-center justify-between sticky top-0 z-10"
                      style={{ background: 'rgba(212,175,55,0.08)', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#FFD700' }}>
                        Unread · {unread.length}
                      </span>
                    </div>
                    {unread.map(renderNotif)}
                  </>
                )}

                {/* Read section */}
                {read.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 sticky top-0 z-10"
                      style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', borderTop: unread.length > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Read · {read.length}
                      </span>
                    </div>
                    {read.map(renderNotif)}
                  </>
                )}

                {/* Empty unread state */}
                {unread.length === 0 && read.length === 0 && (
                  <div className="py-8 text-center text-white/40 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No notifications yet
                  </div>
                )}
              </>
            )
          })()}
        </div>

        <div className="p-3 border-t border-nile-blue/20">
          <a
            href={notifPath}
            className="text-xs text-gold hover:text-gold-light text-center block"
          >
            View all notifications &#8594;
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}
