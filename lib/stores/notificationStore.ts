import { create } from 'zustand'
import type { Notification }
  from '@/types/database.types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (
    n: Notification[]
  ) => void
  addNotification: (
    n: Notification
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
}

export const useNotificationStore =
  create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,

    setNotifications: (notifications) =>
      set({
        notifications,
        unreadCount: notifications.filter(
          (n) => !n.is_read
        ).length,
      }),

    addNotification: (n) => {
      const existing = get().notifications
      const updated = [n, ...existing]
      set({
        notifications: updated,
        unreadCount: updated.filter(
          (notif) => !notif.is_read
        ).length,
      })
    },

    markAsRead: (id) => {
      const updated =
        get().notifications.map((n) =>
          n.id === id
            ? { ...n, is_read: true }
            : n
        )
      set({
        notifications: updated,
        unreadCount: updated.filter(
          (n) => !n.is_read
        ).length,
      })
    },

    markAllAsRead: () => {
      const updated =
        get().notifications.map((n) => ({
          ...n,
          is_read: true,
        }))
      set({
        notifications: updated,
        unreadCount: 0,
      })
    },

    removeNotification: (id) => {
      const updated =
        get().notifications.filter(
          (n) => n.id !== id
        )
      set({
        notifications: updated,
        unreadCount: updated.filter(
          (n) => !n.is_read
        ).length,
      })
    },
  }))