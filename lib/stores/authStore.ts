import { create } from 'zustand'
import type {
  Profile,
  UserRole,
  PlatformSettings,
} from '@/types/database.types'

interface AuthState {
  user: Profile | null
  role: UserRole | null
  isLoading: boolean
  isAuthenticated: boolean
  settings: PlatformSettings | null
  setUser: (user: Profile) => void
  setRole: (role: UserRole) => void
  setSettings: (
    settings: PlatformSettings
  ) => void
  updateBalance: (amount: number) => void
  updateReservedBalance: (
    amount: number
  ) => void
  logout: () => void
  clearAll: () => void
}

export const useAuthStore =
  create<AuthState>((set) => ({
    user: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
    settings: null,

    setUser: (user) =>
      set({
        user,
        role: user.role,
        isAuthenticated: true,
        isLoading: false,
      }),

    setRole: (role) => set({ role }),

    setSettings: (settings) =>
      set({ settings }),

    updateBalance: (amount) =>
      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              credit_balance: amount,
            }
          : null,
      })),

    updateReservedBalance: (amount) =>
      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              reserved_balance: amount,
            }
          : null,
      })),

    logout: () =>
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        settings: null,
      }),

    clearAll: () =>
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        settings: null,
      }),
  }))