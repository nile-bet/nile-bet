import { format } from 'date-fns'

export function formatETB(
  amount: number | null | undefined
): string {
  if (amount == null) return 'ETB 0.00'
  return `ETB ${amount.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`
}

export function formatOdd(
  odd: number | null | undefined
): string {
  if (odd == null) return '0.00'
  return odd.toFixed(2)
}

export function formatSlipId(
  id: string | null | undefined
): string {
  if (!id) return ''
  return id
}

export function maskSlipId(
  id: string | null | undefined
): string {
  if (!id) return ''
  if (id.startsWith('JP')) {
    return `JP...${id.slice(-4)}`
  }
  return `...${id.slice(-4)}`
}

export function formatDate(
  date: string | null | undefined
): string {
  if (!date) return ''
  try {
    return format(
      new Date(date),
      'dd MMM yyyy HH:mm'
    )
  } catch {
    return ''
  }
}

export function formatDateShort(
  date: string | null | undefined
): string {
  if (!date) return ''
  try {
    return format(
      new Date(date),
      'dd/MM/yy HH:mm'
    )
  } catch {
    return ''
  }
}

export function formatTimeAgo(
  date: string | null | undefined
): string {
  if (!date) return ''
  try {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor(
      (now.getTime() - then.getTime()) / 1000
    )
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60)
      return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24)
      return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

export function formatKickOff(
  date: string | null | undefined
): string {
  if (!date) return ''
  try {
    const d = new Date(date)
    const now = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const time = format(d, 'HH:mm')

    if (
      format(d, 'yyyy-MM-dd') ===
      format(now, 'yyyy-MM-dd')
    ) {
      return `Today ${time}`
    }
    if (
      format(d, 'yyyy-MM-dd') ===
      format(tomorrow, 'yyyy-MM-dd')
    ) {
      return `Tomorrow ${time}`
    }
    return format(d, 'EEE dd MMM HH:mm')
  } catch {
    return ''
  }
}

export function formatCountdown(
  expiresAt: string | null | undefined
): string {
  if (!expiresAt) return ''
  try {
    const diff =
      new Date(expiresAt).getTime() -
      Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(
      diff / 3600000
    )
    const mins = Math.floor(
      (diff % 3600000) / 60000
    )
    const secs = Math.floor(
      (diff % 60000) / 1000
    )
    if (hours > 0)
      return `${hours}h ${mins}m`
    if (mins > 0)
      return `${mins}m ${secs}s`
    return `${secs}s`
  } catch {
    return ''
  }
}