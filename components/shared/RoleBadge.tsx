import { cn } from '@/lib/utils'
import type { UserRole }
  from '@/types/database.types'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md'
  className?: string
}

const roleConfig = {
  admin: {
    label: '👑 admin',
    className:
      'bg-gradient-to-r from-gold/30 to-amber-500/20 text-gold border-gold/60 shadow-sm shadow-gold/20',
  },
  agent: {
    label: '🔷 agent',
    className:
      'bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-300 border-sky-400/50 shadow-sm shadow-sky-500/20',
  },
  cashier: {
    label: '💚 cashier',
    className:
      'bg-gradient-to-r from-emerald-500/20 to-green-600/10 text-emerald-300 border-emerald-400/50 shadow-sm shadow-emerald-500/20',
  },
  bettor: {
    label: '⚡ bettor',
    className:
      'bg-gradient-to-r from-violet-500/20 to-purple-600/10 text-violet-300 border-violet-400/50 shadow-sm shadow-violet-500/20',
  },
}

export function RoleBadge({
  role,
  size = 'sm',
  className,
}: RoleBadgeProps) {
  const config = roleConfig[role]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium uppercase tracking-wide',
        size === 'sm'
          ? 'text-[10px] px-2 py-0.5'
          : 'text-xs px-2.5 py-1',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}