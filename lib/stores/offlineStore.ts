import { create } from 'zustand'

interface OfflineState {
  isOnline: boolean
  wasOffline: boolean
  setOnline: (v: boolean) => void
  setWasOffline: (v: boolean) => void
}

export const useOfflineStore =
  create<OfflineState>((set) => ({
    isOnline: true,
    wasOffline: false,
    setOnline: (v) => set({ isOnline: v }),
    setWasOffline: (v) =>
      set({ wasOffline: v }),
  }))