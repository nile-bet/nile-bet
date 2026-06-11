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
    className: 'text-gold border-gold/60 shadow-sm shadow-gold/20',
    style: { background: 'linear-gradient(90deg, rgba(212,175,55,0.25) 0%, rgba(245,158,11,0.15) 100%)' },
  },
  agent: {
    label: '🔷 agent',
    className: 'text-sky-300 border-sky-400/50 shadow-sm shadow-sky-500/20',
    style: { background: 'linear-gradient(90deg, rgba(56,189,248,0.2) 0%, rgba(37,99,235,0.1) 100%)' },
  },
  cashier: {
    label: '🏦 cashier',
    className: 'text-emerald-300 border-emerald-400/50 shadow-sm shadow-emerald-500/20',
    style: { background: 'linear-gradient(90deg, rgba(52,211,153,0.2) 0%, rgba(22,163,74,0.1) 100%)' },
  },
  bettor: {
    label: '⚡ bettor',
    className: 'text-violet-300 border-violet-400/50 shadow-sm shadow-violet-500/20',
    style: { background: 'linear-gradient(90deg, rgba(167,139,250,0.2) 0%, rgba(124,58,237,0.1) 100%)' },
  },
}

export function RoleBadge({
  role,
  size = 'sm',
  className,
}: RoleBadgeProps) {
  const config = roleConfig[role] ?? roleConfig['bettor']

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
      style={config.style}
    >
      {config.label}
    </span>
  )
}