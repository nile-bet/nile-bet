'use client'

import { useAuth } from '@/lib/hooks/useAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth()
  return <>{children}</>
}
