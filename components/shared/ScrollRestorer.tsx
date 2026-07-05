'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function ScrollRestorer() {
  const pathname = usePathname()
  const isMounted = useRef(false)

  useEffect(() => {
    const key = `nilebet_scroll_${pathname}`

    // Restore scroll on mount
    const saved = sessionStorage.getItem(key)
    if (saved) {
      const pos = parseInt(saved, 10)
      const tryRestore = (attempts: number) => {
        // Try all possible scrollable containers
        const containers = [
          document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement,
          document.querySelector('.flex-1.overflow-y-auto') as HTMLElement,
          document.querySelector('main') as HTMLElement,
          document.documentElement,
          document.body,
        ]
        let restored = false
        for (const el of containers) {
          if (!el) continue
          const scrollable = el.scrollHeight > el.clientHeight
          if (scrollable || el === document.documentElement || el === document.body) {
            el.scrollTop = pos
            window.scrollTo(0, pos)
            restored = true
            break
          }
        }
        // Retry if not restored yet and still have attempts
        if (!restored && attempts > 0) {
          setTimeout(() => tryRestore(attempts - 1), 100)
        }
      }
      setTimeout(() => tryRestore(5), 100)
    }

    isMounted.current = true

    // Save scroll before leaving
    const saveScroll = () => {
      const containers = [
        document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement,
        document.querySelector('.flex-1.overflow-y-auto') as HTMLElement,
        document.querySelector('main') as HTMLElement,
      ]
      let pos = window.scrollY || document.documentElement.scrollTop || 0
      for (const el of containers) {
        if (el && el.scrollTop > 0) {
          pos = el.scrollTop
          break
        }
      }
      if (pos > 0) {
        sessionStorage.setItem(key, pos.toString())
      }
    }

    // Save on scroll with debounce
    let scrollTimer: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(saveScroll, 150)
    }

    // Attach to all scrollable containers + window
    const containers = [
      window,
      document.querySelector('main.flex-1.overflow-y-auto'),
      document.querySelector('.flex-1.overflow-y-auto'),
      document.querySelector('main'),
    ].filter(Boolean)

    containers.forEach(el => el?.addEventListener('scroll', handleScroll, { passive: true }))
    window.addEventListener('beforeunload', saveScroll)

    return () => {
      clearTimeout(scrollTimer)
      saveScroll()
      containers.forEach(el => el?.removeEventListener('scroll', handleScroll))
      window.removeEventListener('beforeunload', saveScroll)
    }
  }, [pathname])

  return null
}
