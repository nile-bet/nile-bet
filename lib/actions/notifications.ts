'use server'

import { createClient } from '@/lib/supabase/server'

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('to_user_id', userId)
    .eq('is_read', false)
}

export async function getNotifications(userId: string, limit = 100) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
