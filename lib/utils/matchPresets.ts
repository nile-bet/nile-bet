/**
 * matchPresets.ts
 *
 * Market presets so admins don't have to hand-pick categories every time.
 * Also provides PLACEHOLDER default odds across ALL market categories so
 * Quick Match never leaves a selected market fully blank. These are not
 * real pricing — see the warning above getDefaultOddsForTemplate — and
 * must be reviewed by an admin before a match is published.
 */

export interface MarketTemplateLite {
  id: string
  name: string
  is_dynamic: boolean
  selections?: string[]
  market_categories?: { name: string }
}

export interface MatchPreset {
  key: string
  label: string
  description: string
  categories: string[]
}

export const MATCH_PRESETS: MatchPreset[] = [
  {
    key: 'minimal',
    label: 'Minimal',
    description: 'Just 1X2 (MAIN). Fastest to publish.',
    categories: ['MAIN'],
  },
  {
    key: 'standard',
    label: 'Standard',
    description: 'MAIN + GOALS + HANDICAP + HALVES — covers most regular matches.',
    categories: ['MAIN', 'GOALS', 'HANDICAP', 'HALVES'],
  },
  {
    key: 'full',
    label: 'Full Markets',
    description: 'Every available market category.',
    categories: [
      'MAIN', 'GOALS', 'HANDICAP', 'HALVES',
      'CORNERS', 'CARDS', 'TEAM GOALS',
      'CLEAN SHEET', 'GOALS ODD/EVEN',
      'SCORERS', 'SCORE', 'COMBO',
      'MIN 1X2', 'MIN GOALS', 'SPECIALS',
    ],
  },
]

/** Resolve a preset's category names to actual selectable template IDs from live template data. */
export function resolvePresetTemplateIds(
  presetKey: string,
  templates: MarketTemplateLite[]
): string[] {
  const preset = MATCH_PRESETS.find((p) => p.key === presetKey)
  if (!preset) return []
  return templates
    .filter((t) => preset.categories.includes(t.market_categories?.name ?? ''))
    .map((t) => t.id)
}

/**
 * ⚠️ PLACEHOLDER PRICING — NOT REAL ODDS.
 *
 * These values exist purely so a Quick Match doesn't start every market blank.
 * They are NOT derived from any real probability model, odds feed, or bookmaker
 * source. ALL pre-filled odds across ALL markets must be reviewed and corrected
 * by an admin before a match goes live — the Publish button remains a manual,
 * deliberate action; nothing here auto-publishes.
 *
 * Known selection labels (1X2, Over/Under, Yes/No, Odd/Even) get a recognizable
 * default. Anything else (correct score, combos, min-markets, specials, etc.)
 * falls back to an evenly spaced generic range so there's still a starting point.
 */
const KNOWN_SELECTION_ODDS: Record<string, number> = {
  '1': 1.9,
  home: 1.9,
  x: 3.4,
  draw: 3.4,
  '2': 4.2,
  away: 4.2,
  yes: 1.9,
  no: 1.9,
  over: 1.9,
  under: 1.9,
  odd: 1.9,
  even: 1.9,
}

const GENERIC_FALLBACK_BASE = 3.0
const GENERIC_FALLBACK_STEP = 1.5

/**
 * Returns a placeholder odds map for ANY non-dynamic template with known selections.
 * Recognized labels (1X2 / Over-Under / Yes-No / Odd-Even) get realistic-looking
 * defaults; unrecognized selection sets (correct score, combos, specials, etc.)
 * get an evenly spaced generic fallback so nothing is left with zero starting point.
 * Dynamic (scorer) markets are still skipped — there's no selection list without
 * a player roster, which Quick Match doesn't collect.
 */
export function getDefaultOddsForTemplate(
  template: MarketTemplateLite
): Record<string, string> {
  if (template.is_dynamic) return {}
  const sels = template.selections ?? []
  if (sels.length === 0) return {}

  const result: Record<string, string> = {}
  let matchedAnyKnownLabel = false

  for (const sel of sels) {
    const known = KNOWN_SELECTION_ODDS[sel.toLowerCase()]
    if (known !== undefined) {
      result[sel] = known.toFixed(2)
      matchedAnyKnownLabel = true
    }
  }

  if (matchedAnyKnownLabel) return result

  // Generic fallback for markets with unrecognized selection labels
  // (e.g. correct score "2-1", combos, specials). Purely a starting point.
  sels.forEach((sel, i) => {
    result[sel] = (GENERIC_FALLBACK_BASE + i * GENERIC_FALLBACK_STEP).toFixed(2)
  })
  return result
}
