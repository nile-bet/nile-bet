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
    label: 'admin',
    className:
      'bg-gold/20 text-gold border-gold/40',
  },
  agent: {
    label: 'agent',
    className:
      'bg-nile-blue-light/20 text-nile-blue-light border-nile-blue-light/40',
  },
  cashier: {
    label: 'cashier',
    className:
      'bg-nile-success/20 text-nile-success border-nile-success/40',
  },
  bettor: {
    label: 'bettor',
    className:
      'bg-nile-purple/20 text-nile-purple border-nile-purple/40',
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