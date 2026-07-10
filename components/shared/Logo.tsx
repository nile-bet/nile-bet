'use client'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const LOGO_URL =
  'https://i.postimg.cc/15mmFn80/nile-logo-cropped-removebg-preview-(1).png'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  className?: string
}

export function Logo({
  size = 'md',
  showTagline = false,
  className,
}: LogoProps) {
  const imgSizeClasses = {
    sm: 'w-7 h-7 md:w-8 md:h-8',
    md: 'w-8 h-8 md:w-9 md:h-9',
    lg: 'w-9 h-9 md:w-12 md:h-12',
  }[size]

  const nameSize = {
    sm: 'text-sm md:text-base',
    md: 'text-base md:text-xl',
    lg: 'text-lg md:text-2xl',
  }[size]

  return (
    <div className={cn('flex items-center gap-1.5 md:gap-2', className)}>
      <div className={cn('relative flex-shrink-0', imgSizeClasses)}>
        <Image
          src={LOGO_URL}
          alt="NILE Betting Logo"
          fill
          sizes="40px"
          className="object-contain"
          priority
        />
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display font-bold text-gold tracking-wide',
            nameSize
          )}
        >
          NILE Betting
        </span>
        {showTagline && (
          <span className="hidden md:block text-[9px] text-nile-blue-light tracking-[2px] uppercase font-body mt-0.5">
            Flow into Wins
          </span>
        )}
      </div>
    </div>
  )
}
