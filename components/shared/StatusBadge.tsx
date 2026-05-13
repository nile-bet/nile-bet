import { cn } from '@/lib/utils'

type BadgeType =
  | 'slip'
  | 'user'
  | 'coupon'
  | 'match'
  | 'jackpot'
  | 'request'

interface StatusBadgeProps {
  status: string
  type?: BadgeType
  className?: string
}

function getConfig(
  status: string,
  type: BadgeType
): { label: string; className: string } {
  if (type === 'slip') {
    const map: Record<
      string,
      { label: string; className: string }
    > = {
      pending: {
        label: 'PENDING',
        className:
          'bg-nile-blue-light/20 text-nile-blue-light border-nile-blue-light/40',
      },
      won: {
        label: 'WON ✓',
        className:
          'bg-nile-success/20 text-nile-success border-nile-success/40',
      },
      lost: {
        label: 'LOST',
        className:
          'bg-nile-danger/20 text-nile-danger border-nile-danger/40',
      },
      cancelled: {
        label: 'CANCELLED',
        className:
          'bg-white/10 text-white/50 border-white/20',
      },
      near_win: {
        label: 'NEAR WIN 🛡️',
        className:
          'bg-gold/20 text-gold border-gold/40',
      },
    }
    return (
      map[status] ?? {
        label: status.toUpperCase(),
        className:
          'bg-white/10 text-white/50 border-white/20',
      }
    )
  }

  if (type === 'user') {
    const map: Record<
      string,
      { label: string; className: string }
    > = {
      active: {
        label: 'ACTIVE',
        className:
          'bg-nile-success/20 text-nile-success border-nile-success/40',
      },
      suspended: {
        label: 'SUSPENDED',
        className:
          'bg-nile-orange/20 text-nile-orange border-nile-orange/40',
      },
      deleted: {
        label: 'DELETED',
        className:
          'bg-nile-danger/20 text-nile-danger border-nile-danger/40',
      },
    }
    return (
      map[status] ?? {
        label: status.toUpperCase(),
        className:
          'bg-white/10 text-white/50 border-white/20',
      }
    )
  }

  if (type === 'match') {
    const map: Record<
      string,
      { label: string; className: string }
    > = {
      pending: {
        label: 'DRAFT',
        className:
          'bg-white/10 text-white/50 border-white/20',
      },
      upcoming: {
        label: 'UPCOMING',
        className:
          'bg-nile-blue-light/20 text-nile-blue-light border-nile-blue-light/40',
      },
      closed: {
        label: 'CLOSED',
        className:
          'bg-nile-orange/20 text-nile-orange border-nile-orange/40',
      },
      finished: {
        label: 'FINISHED',
        className:
          'bg-nile-success/20 text-nile-success border-nile-success/40',
      },
      cancelled: {
        label: 'CANCELLED',
        className:
          'bg-nile-danger/20 text-nile-danger border-nile-danger/40',
      },
      postponed: {
        label: 'POSTPONED',
        className:
          'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      },
    }
    return (
      map[status] ?? {
        label: status.toUpperCase(),
        className:
          'bg-white/10 text-white/50 border-white/20',
      }
    )
  }

  if (type === 'coupon') {
    const map: Record<
      string,
      { label: string; className: string }
    > = {
      pending: {
        label: 'PENDING',
        className:
          'bg-nile-blue-light/20 text-nile-blue-light border-nile-blue-light/40',
      },
      redeemed: {
        label: 'REDEEMED',
        className:
          'bg-nile-success/20 text-nile-success border-nile-success/40',
      },
      expired: {
        label: 'EXPIRED',
        className:
          'bg-nile-danger/20 text-nile-danger border-nile-danger/40',
      },
      cancelled: {
        label: 'CANCELLED',
        className:
          'bg-white/10 text-white/50 border-white/20',
      },
    }
    return (
      map[status] ?? {
        label: status.toUpperCase(),
        className:
          'bg-white/10 text-white/50 border-white/20',
      }
    )
  }

  if (type === 'jackpot') {
    const map: Record<
      string,
      { label: string; className: string }
    > = {
      draft: {
        label: 'DRAFT',
        className:
          'bg-white/10 text-white/50 border-white/20',
      },
      open: {
        label: 'OPEN',
        className:
          'bg-nile-success/20 text-nile-success border-nile-success/40',
      },
      closed: {
        label: 'CLOSED',
        className:
          'bg-nile-orange/20 text-nile-orange border-nile-orange/40',
      },
      settled: {
        label: 'SETTLED',
        className:
          'bg-nile-blue-light/20 text-nile-blue-light border-nile-blue-light/40',
      },
    }
    return (
      map[status] ?? {
        label: status.toUpperCase(),
        className:
          'bg-white/10 text-white/50 border-white/20',
      }
    )
  }

  if (type === 'request') {
    const map: Record<
      string,
      { label: string; className: string }
    > = {
      pending: {
        label: 'PENDING',
        className:
          'bg-gold/20 text-gold border-gold/40',
      },
      approved: {
        label: 'APPROVED',
        className:
          'bg-nile-success/20 text-nile-success border-nile-success/40',
      },
      declined: {
        label: 'DECLINED',
        className:
          'bg-nile-danger/20 text-nile-danger border-nile-danger/40',
      },
    }
    return (
      map[status] ?? {
        label: status.toUpperCase(),
        className:
          'bg-white/10 text-white/50 border-white/20',
      }
    )
  }

  return {
    label: status.toUpperCase(),
    className:
      'bg-white/10 text-white/50 border-white/20',
  }
}

export function StatusBadge({
  status,
  type = 'slip',
  className,
}: StatusBadgeProps) {
  const config = getConfig(status, type)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border text-[10px] font-semibold px-2 py-0.5 tracking-wide',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}