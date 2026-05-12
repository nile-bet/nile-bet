import { create } from 'zustand'
import {
  calculateSlip,
  getValidationErrors,
} from '@/lib/utils/calculateSlip'
import type {
  BetSlipSelection,
  SlipCalculation,
  PlatformSettings,
} from '@/types/database.types'

interface BetSlipState {
  selections: BetSlipSelection[]
  stake: number
  calculation: SlipCalculation
  copiedFromSlipId: string | null
  selectedBettorId: string | null
  selectedBettorName: string | null
  isAnonymous: boolean
  isJackpot: boolean
  addSelection: (
    s: BetSlipSelection
  ) => void
  removeSelection: (
    matchMarketId: string,
    selection: string
  ) => void
  setStake: (amount: number) => void
  clearSlip: () => void
  setSelectedBettor: (
    id: string,
    name: string
  ) => void
  setAnonymous: (v: boolean) => void
  setCopiedFrom: (
    slipId: string | null
  ) => void
  calculateSlipTotals: () => void
  isSelectionAdded: (
    matchMarketId: string,
    selection: string
  ) => boolean
  hasStartedMatches: () => boolean
  getValidationErrors: (
    settings: PlatformSettings
  ) => string[]
}

const emptyCalc: SlipCalculation = {
  stake: 0,
  totalOdds: 0,
  maxPayout: 0,
  winningTax: 0,
  netPayout: 0,
}

export const useBetSlipStore =
  create<BetSlipState>((set, get) => ({
    selections: [],
    stake: 0,
    calculation: emptyCalc,
    copiedFromSlipId: null,
    selectedBettorId: null,
    selectedBettorName: null,
    isAnonymous: false,
    isJackpot: false,

    addSelection: (s) => {
      const existing = get().selections
      // Remove if same market different pick
      const filtered = existing.filter(
        (sel) =>
          sel.matchMarketId !==
          s.matchMarketId
      )
      const newSelections = [...filtered, s]
      const calc = calculateSlip(
        get().stake,
        newSelections.map((sel) => sel.odd)
      )
      set({
        selections: newSelections,
        calculation: calc,
      })
    },

    removeSelection: (
      matchMarketId,
      selection
    ) => {
      const newSelections =
        get().selections.filter(
          (s) =>
            !(
              s.matchMarketId ===
                matchMarketId &&
              s.selection === selection
            )
        )
      const calc = calculateSlip(
        get().stake,
        newSelections.map((s) => s.odd)
      )
      set({
        selections: newSelections,
        calculation: calc,
      })
    },

    setStake: (amount) => {
      const calc = calculateSlip(
        amount,
        get().selections.map((s) => s.odd)
      )
      set({ stake: amount, calculation: calc })
    },

    clearSlip: () =>
      set({
        selections: [],
        stake: 0,
        calculation: emptyCalc,
        copiedFromSlipId: null,
        selectedBettorId: null,
        selectedBettorName: null,
        isAnonymous: false,
        isJackpot: false,
      }),

    setSelectedBettor: (id, name) =>
      set({
        selectedBettorId: id,
        selectedBettorName: name,
        isAnonymous: false,
      }),

    setAnonymous: (v) =>
      set({
        isAnonymous: v,
        selectedBettorId: v ? null :
          get().selectedBettorId,
        selectedBettorName: v ? null :
          get().selectedBettorName,
      }),

    setCopiedFrom: (slipId) =>
      set({ copiedFromSlipId: slipId }),

    calculateSlipTotals: () => {
      const calc = calculateSlip(
        get().stake,
        get().selections.map((s) => s.odd)
      )
      set({ calculation: calc })
    },

    isSelectionAdded: (
      matchMarketId,
      selection
    ) =>
      get().selections.some(
        (s) =>
          s.matchMarketId ===
            matchMarketId &&
          s.selection === selection
      ),

    hasStartedMatches: () =>
      get().selections.some(
        (s) =>
          s.matchStatus === 'closed' ||
          s.matchStatus === 'finished'
      ),

    getValidationErrors: (settings) =>
      getValidationErrors(
        get().stake,
        get().selections,
        settings
      ),
  }))