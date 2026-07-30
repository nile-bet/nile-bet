/**
 * quickMatchParser.ts
 *
 * Zero-cost, zero-dependency "smart paste" parser for the Quick Match flow.
 * No external AI / API calls — everything runs locally in the browser.
 *
 * Input example:
 *   "Arsenal vs Chelsea, Premier League, Saturday 3pm, featured"
 *   "Man United - Man City | EPL | 25/12 20:00"
 *   "Real Madrid vs Barcelona tomorrow 9pm"
 */

export interface LeagueLite {
  id: string
  name: string
}

export interface CountryWithLeagues {
  id: string
  name: string
  flag_emoji?: string
  leagues: LeagueLite[]
}

export interface ParsedMatchResult {
  homeTeam: string | null
  awayTeam: string | null
  countryId: string | null
  leagueId: string | null
  leagueMatchConfidence: 'high' | 'low' | 'none'
  kickOffTime: string | null // ISO string, local wall-clock converted to ISO
  isFeatured: boolean
  warnings: string[]
}

const WEEKDAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday',
]

/** Very small normalized string helper for fuzzy matching. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cheap similarity score: shared-word overlap + substring bonus. Good enough for league/country names. */
function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85

  const wordsA = new Set(na.split(' '))
  const wordsB = new Set(nb.split(' '))
  let shared = 0
  wordsA.forEach((w) => {
    if (wordsB.has(w)) shared++
  })
  const denom = Math.max(wordsA.size, wordsB.size)
  return denom === 0 ? 0 : shared / denom
}

/** Split "TeamA vs TeamB" / "TeamA v TeamB" / "TeamA - TeamB" into two team names. */
function extractTeams(text: string): { home: string | null; away: string | null; rest: string } {
  const patterns = [
    /^(.*?)\s+(?:vs\.?|versus)\s+(.*?)(?:[,|].*)?$/i,
    /^(.*?)\s+v\s+(.*?)(?:[,|].*)?$/i,
    /^(.*?)\s*-\s*(.*?)(?:[,|].*)?$/,
  ]

  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const home = m[1].trim()
      const away = m[2].trim()
      if (home && away) {
        return { home, away, rest: text.slice(m[0].length) }
      }
    }
  }
  return { home: null, away: null, rest: text }
}

/** Find best-matching league (and its parent country) across all countries. */
function matchLeague(
  fragment: string,
  countries: CountryWithLeagues[]
): { countryId: string | null; leagueId: string | null; confidence: 'high' | 'low' | 'none' } {
  let best: { countryId: string; leagueId: string; score: number } | null = null

  for (const country of countries) {
    for (const league of country.leagues) {
      const score = similarity(fragment, league.name)
      if (score > (best?.score ?? 0)) {
        best = { countryId: country.id, leagueId: league.id, score }
      }
    }
    const countryScore = similarity(fragment, country.name) * 0.6
    if (countryScore > (best?.score ?? 0) && country.leagues[0]) {
      best = { countryId: country.id, leagueId: country.leagues[0].id, score: countryScore }
    }
  }

  if (!best || best.score < 0.3) return { countryId: null, leagueId: null, confidence: 'none' }
  if (best.score < 0.6) return { countryId: best.countryId, leagueId: best.leagueId, confidence: 'low' }
  return { countryId: best.countryId, leagueId: best.leagueId, confidence: 'high' }
}

/** Parse a date/time fragment into a Date. Best-effort, defaults to null if nothing recognizable found. */
function extractKickOff(text: string): { date: Date | null; matchedText: string } {
  const lower = text.toLowerCase()
  const now = new Date()

  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  let hours: number | null = null
  let minutes = 0
  let matchedTimeText = ''

  const timeMatch = lower.match(timeRegex)
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10)
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
    const meridiem = timeMatch[3]
    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0
    matchedTimeText = timeMatch[0]
  }

  let baseDate: Date | null = null

  if (lower.includes('today')) {
    baseDate = new Date(now)
  } else if (lower.includes('tomorrow')) {
    baseDate = new Date(now)
    baseDate.setDate(baseDate.getDate() + 1)
  } else {
    for (let i = 0; i < WEEKDAYS.length; i++) {
      if (lower.includes(WEEKDAYS[i])) {
        const target = new Date(now)
        const currentDay = target.getDay()
        let diff = i - currentDay
        if (diff < 0) diff += 7
        if (diff === 0 && hours !== null && hours < now.getHours()) diff = 7
        target.setDate(target.getDate() + diff)
        baseDate = target
        break
      }
    }
  }

  if (!baseDate) {
    const dateMatch = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10)
      const month = parseInt(dateMatch[2], 10) - 1
      const year = dateMatch[3]
        ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10))
        : now.getFullYear()
      baseDate = new Date(year, month, day)
    }
  }

  if (!baseDate) return { date: null, matchedText: '' }

  baseDate.setHours(hours ?? 15, minutes, 0, 0)
  return { date: baseDate, matchedText: matchedTimeText }
}

export function parseQuickMatchText(
  input: string,
  countries: CountryWithLeagues[]
): ParsedMatchResult {
  const warnings: string[] = []
  const raw = input.trim()

  const segments = raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
  const teamSegment = segments[0] ?? ''
  const restSegments = segments.slice(1).join(' ')

  const { home, away } = extractTeams(teamSegment)
  if (!home || !away) {
    warnings.push('Could not detect two team names — check the "TeamA vs TeamB" part.')
  }

  const { countryId, leagueId, confidence } = matchLeague(restSegments || raw, countries)
  if (confidence === 'none') {
    warnings.push('No matching league found — please select manually.')
  } else if (confidence === 'low') {
    warnings.push('League match is uncertain — please double check.')
  }

  const { date } = extractKickOff(restSegments || raw)
  if (!date) {
    warnings.push('No kick-off date/time detected — please set it manually.')
  } else if (date.getTime() < Date.now()) {
    warnings.push('Detected kick-off time is in the past — please review.')
  }

  const isFeatured = /featured|feature|star/i.test(raw)

  return {
    homeTeam: home,
    awayTeam: away,
    countryId,
    leagueId,
    leagueMatchConfidence: confidence,
    kickOffTime: date ? date.toISOString() : null,
    isFeatured,
    warnings,
  }
}
