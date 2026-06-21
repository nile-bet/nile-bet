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

// Add at end of lib/utils/formatCurrency.ts if not present

// Platform timezone — pinned explicitly so server (UTC) and client (browser-local)
// always compute the identical wall-clock string. Without this, toLocaleTimeString/
// toLocaleDateString silently use the runtime's local timezone, which differs between
// SSR (server, usually UTC) and the browser (Africa/Addis_Ababa, UTC+3) — causing
// React hydration mismatches on every match list page (public/bettor/agent/cashier).
const PLATFORM_TIMEZONE = 'Africa/Addis_Ababa'

export function formatKickOff(
  dateStr: string
): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)

  // Compare calendar dates in the platform timezone, not the runtime's local timezone
  const dateInTz = (date: Date) =>
    date.toLocaleDateString('en-CA', { timeZone: PLATFORM_TIMEZONE })

  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86400000)

  const isToday = dateInTz(d) === dateInTz(today)
  const isTomorrow = dateInTz(d) === dateInTz(tomorrow)

  const time = d.toLocaleTimeString('en-ET', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PLATFORM_TIMEZONE,
  })

  if (isToday) return `Today ${time}`
  if (isTomorrow) return `Tomorrow ${time}`

  return d.toLocaleDateString('en-ET', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PLATFORM_TIMEZONE,
  })
}

export function formatCountdown(
  dateStr: string
): string {
  if (!dateStr) return '—'
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = target - now

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(
    diff / 3600000
  )
  const minutes = Math.floor(
    (diff % 3600000) / 60000
  )
  const seconds = Math.floor(
    (diff % 60000) / 1000
  )

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

export function formatTimeAgo(
  dateStr: string
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}h ago`
  }
  return `${Math.floor(diff / 86400000)}d ago`
}
