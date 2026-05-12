import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  variant?:
    | 'default'
    | 'gold'
    | 'danger'
    | 'success'
    | 'warning'
  className?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}: StatsCardProps) {
  const valueColor = {
    default: 'text-nile-white',
    gold: 'text-gold',
    danger: 'text-nile-danger',
    success: 'text-nile-success',
    warning: 'text-nile-orange',
  }[variant]

  return (
    <div
      className={cn(
        'bg-slate-dark border border-nile-blue/40 rounded-xl p-5 relative overflow-hidden',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-white/60 font-medium">
          {title}
        </p>
        {Icon && (
          <div className="p-2 bg-gold/10 rounded-lg">
            <Icon className="w-5 h-5 text-gold" />
          </div>
        )}
      </div>

      <p
        className={cn(
          'text-2xl font-mono font-bold mt-2',
          valueColor
        )}
      >
        {value}
      </p>

      {subtitle && (
        <p className="text-xs text-white/40 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  )
}