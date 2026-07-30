'use server'

/**
 * aiOdds.ts
 *
 * Calls Gemini (free tier: gemini-3.6-flash) SERVER-SIDE ONLY to suggest
 * placeholder odds across all selected markets for Quick Match.
 *
 * ⚠️ IMPORTANT — READ BEFORE RELYING ON THIS ANYWHERE ELSE:
 * These are LLM-generated guesses, not real pricing. Gemini has no live odds
 * feed, no access to actual bookmaker lines, and no real probability model —
 * it is pattern-matching on team/league names and typical market structures
 * from its training data. Treat every number as a starting point only.
 *
 * Enforcement: the caller (QuickMatchModal) MUST disable direct publishing
 * whenever these odds are used — draft-only until a human reviews them in
 * the real odds screen. Do not remove that guardrail when reusing this action.
 *
 * Setup required: add GEMINI_API_KEY to .env.local (get a free key at
 * https://aistudio.google.com/apikey — no credit card needed for the free tier).
 *
 * Batching: large presets (e.g. "Full Markets" ~180 templates) are split into
 * smaller batches per Gemini call. This reduces the chance of a single huge
 * request hitting model overload (503) or truncated output, and means one
 * failed batch doesn't wipe out odds from the batches that succeeded.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const BATCH_SIZE = 20
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 1000

export interface AIOddsMarketInput {
  templateId: string
  name: string
  category: string
  selections: string[]
}

export interface AIOddsRequest {
  homeTeam: string
  awayTeam: string
  leagueName: string
  markets: AIOddsMarketInput[]
}

export interface AIOddsResult {
  success: boolean
  odds: Record<string, Record<string, string>>
  aiCoveredTemplateIds: string[]
  error?: string
}

const MIN_ODD = 1.01
const MAX_ODD = 1000

function isValidOdd(n: unknown): n is number {
  return typeof n === 'number' && isFinite(n) && n >= MIN_ODD && n <= MAX_ODD
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildPrompt(
  homeTeam: string,
  awayTeam: string,
  leagueName: string,
  markets: AIOddsMarketInput[]
): string {
  const marketList = markets
    .map(
      (m) =>
        `- id: "${m.templateId}", market: "${m.name}" (category: ${m.category}), selections: [${m.selections
          .map((s) => `"${s}"`)
          .join(', ')}]`
    )
    .join('\n')

  return `You are helping generate PLACEHOLDER starting odds for a sports betting admin tool. These are NOT real odds — no live feed is available. Just give plausible, internally-consistent bookmaker-style numbers based on typical odds structures for each market type, using generic knowledge of the two teams and league where relevant (do not fabricate specific real results or news).

Match: ${homeTeam} vs ${awayTeam}, league: ${leagueName}

Markets needing odds:
${marketList}

Respond with ONLY a JSON object, no markdown, no explanation, in this exact shape:
{
  "<templateId>": { "<selection>": <number>, ... },
  ...
}

Rules:
- Every odd value must be a number greater than 1.00 (output as JSON numbers, not strings).
- Keep 1X2-style markets roughly consistent with each other (e.g. favorite/underdog spread makes sense together).
- Do not include any market or selection not listed above.
- Do not include any text outside the JSON object.`
}

interface BatchCallResult {
  odds: Record<string, Record<string, string>>
  coveredIds: string[]
  error?: string
}

async function callGeminiBatch(
  apiKey: string,
  homeTeam: string,
  awayTeam: string,
  leagueName: string,
  batchMarkets: AIOddsMarketInput[]
): Promise<BatchCallResult> {
  let lastError = ''

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * attempt)
    }

    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(homeTeam, awayTeam, leagueName, batchMarkets) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        lastError = `Gemini API error (${res.status}): ${errText.slice(0, 200)}`
        if (res.status === 503 || res.status === 429) continue
        return { odds: {}, coveredIds: [], error: lastError }
      }

      const data = await res.json()
      const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) {
        lastError = 'Gemini returned an empty response.'
        continue
      }

      let parsed: unknown
      try {
        const cleaned = rawText.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        lastError = 'Could not parse Gemini response as JSON for this batch.'
        continue
      }

      const validatedOdds: Record<string, Record<string, string>> = {}
      const coveredIds: string[] = []
      const knownTemplateIds = new Set(batchMarkets.map((m) => m.templateId))

      if (parsed && typeof parsed === 'object') {
        for (const [templateId, selectionsObj] of Object.entries(parsed as Record<string, unknown>)) {
          if (!knownTemplateIds.has(templateId)) continue
          if (!selectionsObj || typeof selectionsObj !== 'object') continue

          const market = batchMarkets.find((m) => m.templateId === templateId)!
          const validSelections = new Set(market.selections)
          const cleanedSelections: Record<string, string> = {}

          for (const [selection, value] of Object.entries(selectionsObj as Record<string, unknown>)) {
            if (!validSelections.has(selection)) continue
            if (isValidOdd(value)) {
              cleanedSelections[selection] = (value as number).toFixed(2)
            }
          }

          if (Object.keys(cleanedSelections).length > 0) {
            validatedOdds[templateId] = cleanedSelections
            coveredIds.push(templateId)
          }
        }
      }

      return { odds: validatedOdds, coveredIds }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error calling Gemini.'
      continue
    }
  }

  return { odds: {}, coveredIds: [], error: lastError || 'Batch failed after retries.' }
}

export async function generateAIOdds(input: AIOddsRequest): Promise<AIOddsResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return {
      success: false,
      odds: {},
      aiCoveredTemplateIds: [],
      error: 'GEMINI_API_KEY is not set on the server. Add it to .env.local to enable AI odds.',
    }
  }

  if (input.markets.length === 0) {
    return { success: true, odds: {}, aiCoveredTemplateIds: [] }
  }

  const batches = chunk(input.markets, BATCH_SIZE)
  const allOdds: Record<string, Record<string, string>> = {}
  const allCoveredIds: string[] = []
  const batchErrors: string[] = []

  for (let i = 0; i < batches.length; i++) {
    const result = await callGeminiBatch(
      apiKey,
      input.homeTeam,
      input.awayTeam,
      input.leagueName,
      batches[i]
    )

    Object.assign(allOdds, result.odds)
    allCoveredIds.push(...result.coveredIds)
    if (result.error) {
      batchErrors.push(`Batch ${i + 1}/${batches.length}: ${result.error}`)
    }

    if (i < batches.length - 1) await sleep(200)
  }

  const success = allCoveredIds.length > 0
  const error =
    batchErrors.length > 0
      ? success
        ? `${batchErrors.length} of ${batches.length} batch(es) failed and fell back to local defaults for those markets. First issue: ${batchErrors[0]}`
        : batchErrors.join(' | ')
      : undefined

  return { success, odds: allOdds, aiCoveredTemplateIds: allCoveredIds, error }
}
