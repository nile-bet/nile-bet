'use client'

import { useState } from 'react'
import { flagImageUrl } from '@/lib/utils/flagUrl'

interface FlagImageProps {
  emoji: string
  size?: 'sm' | 'md'
  className?: string
}

const SAFE_TEXT_EMOJI = new Set(['🌐', '🌍', '🌎', '🌏'])

export function FlagImage({ emoji, size = 'sm', className = '' }: FlagImageProps) {
  const [imgError, setImgError] = useState(false)

  if (SAFE_TEXT_EMOJI.has(emoji)) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ fontSize: size === 'sm' ? '15px' : '18px', lineHeight: 1 }}
      >
        {emoji}
      </span>
    )
  }

  const url = flagImageUrl(emoji) || '/icons/flag-placeholder.svg'
  if (imgError) {
    return <span className={className} aria-hidden="true" />
  }

  const dimensions = size === 'sm'
    ? { width: 20, height: 15 }
    : { width: 24, height: 18 }

  return (
    <img
      src={url}
      alt={emoji}
      width={dimensions.width}
      height={dimensions.height}
      className={`inline-block align-middle ${className}`}
      onError={() => setImgError(true)}
    />
  )
}
