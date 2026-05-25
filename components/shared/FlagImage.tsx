'use client'

import { useState } from 'react'
import { flagImageUrl } from '@/lib/utils/flagUrl'

interface FlagImageProps {
  emoji: string
  size?: 'sm' | 'md'
  className?: string
}

export function FlagImage({ emoji, size = 'sm', className = '' }: FlagImageProps) {
  const [imgError, setImgError] = useState(false)
  const url = flagImageUrl(emoji)

  if (!url || imgError) {
    return <span className={className}>{emoji}</span>
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
