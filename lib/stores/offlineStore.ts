import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PendingBet {
  id: string
  timestamp: string
  selections: any[]
  stake: number
  bettorId: string
  placedById: string
  isAnonymous: boolean
}

interface OfflineStore {
  isOffline: boolean
  pendingBets: PendingBet[]
  lastSyncAt: string | null
  setOffline: (offline: boolean) => void
  addPendingBet: (
    bet: Omit<PendingBet, 'id' | 'timestamp'>
  ) => void
  removePendingBet: (id: string) => void
  clearPendingBets: () => void
  setLastSync: () => void
}

export const useOfflineStore =
  create<OfflineStore>()(
    persist(
      (set, get) => ({
        isOffline: false,
        pendingBets: [],
        lastSyncAt: null,

        setOffline: (offline) => {
          set({ isOffline: offline })
          if (!offline) {
            // Auto-sync when back online
            get().setLastSync()
          }
        },

        addPendingBet: (bet) => {
          const newBet: PendingBet = {
            ...bet,
            id: Date.now().toString(),
            timestamp:
              new Date().toISOString(),
          }
          set((state) => ({
            pendingBets: [
              ...state.pendingBets,
              newBet,
            ],
          }))
        },

        removePendingBet: (id) => {
          set((state) => ({
            pendingBets:
              state.pendingBets.filter(
                (b) => b.id !== id
              ),
          }))
        },

        clearPendingBets: () => {
          set({ pendingBets: [] })
        },

        setLastSync: () => {
          set({
            lastSyncAt:
              new Date().toISOString(),
          })
        },
      }),
      {
        name: 'nilebet-offline',
        partialize: (state) => ({
          pendingBets: state.pendingBets,
          lastSyncAt: state.lastSyncAt,
        }),
      }
    )
  )