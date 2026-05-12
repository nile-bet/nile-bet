import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  message: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  title,
  message,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <Icon
          className="w-12 h-12 text-gold/30 mb-4"
          strokeWidth={1.5}
        />
      )}
      <h3 className="text-white font-semibold text-lg mb-2">
        {title}
      </h3>
      <p className="text-white/50 text-sm max-w-xs">
        {message}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 bg-gold text-charcoal hover:bg-gold-light font-semibold"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}