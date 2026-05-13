import type { SlipCalculation }
  from '@/types/database.types'

export function calculateSlip(
  stake: number,
  odds: number[]
): SlipCalculation {
  if (!odds.length || stake <= 0) {
    return {
      stake,
      totalOdds: 0,
      maxPayout: 0,
      winningTax: 0,
      netPayout: 0,
    }
  }

  const totalOdds = odds.reduce(
    (acc, odd) => acc * odd, 1
  )
  const maxPayout = stake * totalOdds
  const winningTax = maxPayout * 0.15
  const netPayout = maxPayout - winningTax

  return {
    stake,
    totalOdds:
      parseFloat(totalOdds.toFixed(2)),
    maxPayout:
      parseFloat(maxPayout.toFixed(2)),
    winningTax:
      parseFloat(winningTax.toFixed(2)),
    netPayout:
      parseFloat(netPayout.toFixed(2)),
  }
}

export function getValidationErrors(
  stake: number,
  selections: { odd: number }[],
  settings: {
    minStake: number
    maxStakePerSlip: number
    minSelections: number
    maxOddPerSelection: number
    maxTotalOdds: number
    maxPayout: number
  }
): string[] {
  const errors: string[] = []

  if (selections.length <
    settings.minSelections) {
    errors.push(
      `Minimum ${settings.minSelections} selections required (${selections.length} selected)`
    )
  }

  if (stake < settings.minStake) {
    errors.push(
      `Minimum stake is ETB ${settings.minStake}`
    )
  }

  if (stake > settings.maxStakePerSlip) {
    errors.push(
      `Maximum stake is ETB ${settings.maxStakePerSlip.toLocaleString()}`
    )
  }

  const highOdd = selections.find(
    s => s.odd > settings.maxOddPerSelection
  )
  if (highOdd) {
    errors.push(
      `Maximum odd per selection is ${settings.maxOddPerSelection}`
    )
  }

  if (selections.length > 0 && stake > 0) {
    const totalOdds = selections.reduce(
      (acc, s) => acc * s.odd, 1
    )
    if (totalOdds > settings.maxTotalOdds) {
      errors.push(
        `Total odds exceed maximum (${settings.maxTotalOdds.toLocaleString()})`
      )
    }

    const netPayout =
      stake * totalOdds * 0.85
    if (netPayout > settings.maxPayout) {
      errors.push(
        `Net payout exceeds maximum (ETB ${settings.maxPayout.toLocaleString()})`
      )
    }
  }

  return errors
}