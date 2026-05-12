'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

const LOGO_URL =
  'https://i.postimg.cc/GmNfPP1Z/nile-logo-cropped-removebg-preview.png'

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
  const imgSize = {
    sm: 32,
    md: 36,
    lg: 48,
  }[size]

  const nameSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size]

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        className
      )}
    >
      <Image
        src={LOGO_URL}
        alt="NILE Bet Logo"
        width={imgSize}
        height={imgSize}
        className="object-contain flex-shrink-0"
        priority
      />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display font-bold text-gold tracking-wide',
            nameSize
          )}
        >
          NILE Bet
        </span>
        {showTagline && (
          <span className="text-[9px] text-nile-blue-light tracking-[2px] uppercase font-body mt-0.5">
            Flow into Wins
          </span>
        )}
      </div>
    </div>
  )
}