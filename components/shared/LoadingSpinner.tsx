import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen'
  color?: 'gold' | 'white' | 'blue'
  text?: string
  className?: string
}

export function LoadingSpinner({
  size = 'md',
  color = 'gold',
  text,
  className,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    fullscreen: 'w-12 h-12 border-2',
  }

  const colorMap = {
    gold: 'border-gold/30 border-t-gold',
    white:
      'border-white/30 border-t-white',
    blue: 'border-nile-blue-light/30 border-t-nile-blue-light',
  }

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          'rounded-full animate-spin',
          sizeMap[size],
          colorMap[color]
        )}
      />
      {text && (
        <p className="text-sm text-white/60">
          {text}
        </p>
      )}
    </div>
  )

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        className
      )}
    >
      {spinner}
    </div>
  )
}