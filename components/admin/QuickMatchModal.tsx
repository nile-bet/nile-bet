'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createMatch } from '@/lib/actions/adminMatches'
import { getCountriesWithLeagues } from '@/lib/actions/matches'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AlertTriangle, Check, Sparkles, Pencil } from 'lucide-react'
import {
  parseQuickMatchText,
  type ParsedMatchResult,
  type CountryWithLeagues,
} from '@/lib/utils/quickMatchParser'
import {
  MATCH_PRESETS,
  resolvePresetTemplateIds,
  getDefaultOddsForTemplate,
  type MarketTemplateLite,
} from '@/lib/utils/matchPresets'
import { generateAIOdds } from '@/lib/actions/aiOdds'

interface QuickMatchModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function QuickMatchModal({ onClose, onSuccess }: QuickMatchModalProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const [countries, setCountries] = useState<CountryWithLeagues[]>([])
  const [templates, setTemplates] = useState<MarketTemplateLite[]>([])

  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [kickOff, setKickOff] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [presetKey, setPresetKey] = useState('standard')
  const [activeTab, setActiveTab] = useState<'paste' | 'manual'>('paste')

  const [aiOddsMap, setAiOddsMap] = useState<Record<string, Record<string, string>>>({})
  const [aiCoveredIds, setAiCoveredIds] = useState<string[]>([])
  const [generatingOdds, setGeneratingOdds] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const usedAIOdds = aiCoveredIds.length > 0

  const [pasteText, setPasteText] = useState('')
  const [parseResult, setParseResult] = useState<ParsedMatchResult | null>(null)

  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    getCountriesWithLeagues().then(setCountries)
    const supabase = createClient()
    supabase
      .from('market_templates')
      .select('*, market_categories(*)')
      .order('display_order')
      .then(({ data }) => {
        if (data) setTemplates(data)
      })
  }, [])

  const availableLeagues = useMemo(
    () => countries.find((c) => c.id === selectedCountry)?.leagues ?? [],
    [countries, selectedCountry]
  )

  const handleParse = () => {
    const result = parseQuickMatchText(pasteText, countries)
    setParseResult(result)
    if (result.homeTeam) setHomeTeam(result.homeTeam)
    if (result.awayTeam) setAwayTeam(result.awayTeam)
    if (result.countryId) setSelectedCountry(result.countryId)
    if (result.leagueId) setLeagueId(result.leagueId)
    if (result.kickOffTime) {
      setKickOff(result.kickOffTime.slice(0, 16))
    }
    setIsFeatured(result.isFeatured)
    setConfirmed(false)
  }

  const step1Valid =
    homeTeam.trim() &&
    awayTeam.trim() &&
    homeTeam.trim() !== awayTeam.trim() &&
    leagueId &&
    kickOff

  const selectedLeagueName =
    availableLeagues.find((l) => l.id === leagueId)?.name ?? 'Unknown League'

  const handleGenerateOdds = async () => {
    if (!step1Valid) return
    setGeneratingOdds(true)
    setAiError(null)

    const templateIds = resolvePresetTemplateIds(presetKey, templates)
    const marketsForAI = templateIds
      .map((id) => templates.find((t) => t.id === id))
      .filter((t): t is MarketTemplateLite => !!t && !t.is_dynamic && (t.selections?.length ?? 0) > 0)
      .map((t) => ({
        templateId: t.id,
        name: t.name,
        category: t.market_categories?.name ?? '',
        selections: t.selections ?? [],
      }))

    try {
      const result = await generateAIOdds({
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        leagueName: selectedLeagueName,
        markets: marketsForAI,
      })

      if (result.success && result.aiCoveredTemplateIds.length > 0) {
        setAiOddsMap(result.odds)
        setAiCoveredIds(result.aiCoveredTemplateIds)
        toast.success(`AI suggested odds for ${result.aiCoveredTemplateIds.length} market(s)`)
      } else {
        setAiOddsMap({})
        setAiCoveredIds([])
        setAiError(result.error ?? 'AI did not return usable odds — falling back to local defaults.')
        toast.error('AI odds unavailable — using local placeholder defaults instead')
      }
    } catch (err) {
      setAiOddsMap({})
      setAiCoveredIds([])
      setAiError(err instanceof Error ? err.message : 'AI odds request failed unexpectedly.')
      toast.error('AI odds request failed — using local placeholder defaults instead')
    } finally {
      setGeneratingOdds(false)
    }
  }

  const handlePublish = async (immediately: boolean) => {
    if (!user || !step1Valid) return
    if (immediately && usedAIOdds) return
    setSaving(true)

    const templateIds = resolvePresetTemplateIds(presetKey, templates)
    const oddsArray: { marketTemplateId: string; selection: string; oddValue: number }[] = []

    for (const templateId of templateIds) {
      const template = templates.find((t) => t.id === templateId)
      if (!template || template.is_dynamic) continue

      const aiDefaults = aiOddsMap[templateId]
      const defaults = aiDefaults && Object.keys(aiDefaults).length > 0
        ? aiDefaults
        : getDefaultOddsForTemplate(template)

      for (const [selection, valStr] of Object.entries(defaults)) {
        const val = parseFloat(valStr)
        if (val > 1.0) {
          oddsArray.push({ marketTemplateId: templateId, selection, oddValue: val })
        }
      }
    }

    const result = await createMatch({
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      leagueId,
      kickOffTime: kickOff,
      isFeatured,
      publishImmediately: immediately,
      selectedMarkets: templateIds,
      odds: oddsArray,
      players: [],
      manualMarketCount: null,
      createdBy: user.id,
    })

    if (result.success) {
      toast.success(`Match ${immediately ? 'published' : 'saved as draft'}!`)
      onSuccess()
    } else {
      toast.error(result.error ?? 'Failed to create match')
    }
    setSaving(false)
  }

  const selectedPreset = MATCH_PRESETS.find((p) => p.key === presetKey)!
  const resolvedCount = resolvePresetTemplateIds(presetKey, templates).length

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            Quick Match
          </DialogTitle>
        </DialogHeader>

        <div className="w-full">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                activeTab === 'paste'
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'border-nile-blue/30 text-white/50 hover:text-white'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" /> Paste & Parse
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                activeTab === 'manual'
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'border-nile-blue/30 text-white/50 hover:text-white'
              )}
            >
              <Pencil className="w-3.5 h-3.5" /> Manual Quick Entry
            </button>
          </div>

          {activeTab === 'paste' && (
            <div className="space-y-3 mb-4">
              <label className="text-xs text-white/60 block">
                Paste match info in plain text
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="e.g. Arsenal vs Chelsea, Premier League, Saturday 3pm, featured"
                rows={3}
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none resize-none"
              />
              <button
                onClick={handleParse}
                disabled={!pasteText.trim()}
                className="bg-gold/20 border border-gold text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold/30 disabled:opacity-30"
              >
                Parse ✨
              </button>

              {parseResult && parseResult.warnings.length > 0 && (
                <div className="bg-nile-orange/10 border border-nile-orange/30 rounded-lg p-3 space-y-1">
                  {parseResult.warnings.map((w, i) => (
                    <p key={i} className="text-nile-orange text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <p className="text-white/40 text-xs mb-4">
              Fill fields directly below — no parsing involved.
            </p>
          )}

          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Home Team *</label>
                <input
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="e.g. Arsenal"
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Away Team *</label>
                <input
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="e.g. Chelsea"
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Country *</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value)
                    setLeagueId('')
                  }}
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                >
                  <option value="">Select country...</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flag_emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">League *</label>
                <select
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                  disabled={!selectedCountry}
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-40"
                >
                  <option value="">Select league...</option>
                  {availableLeagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Kick-off *</label>
                <input
                  type="datetime-local"
                  value={kickOff}
                  onChange={(e) => setKickOff(e.target.value)}
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Featured</label>
                <button
                  onClick={() => setIsFeatured(!isFeatured)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm w-full',
                    isFeatured
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'border-nile-blue/30 text-white/50 hover:text-white'
                  )}
                >
                  <span>{isFeatured ? '⭐' : '☆'}</span>
                  {isFeatured ? 'Featured' : 'Not featured'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/60 block mb-2">Market Preset</label>
              <div className="flex gap-2 flex-wrap">
                {MATCH_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setPresetKey(p.key)
                      setAiOddsMap({})
                      setAiCoveredIds([])
                      setAiError(null)
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                      presetKey === p.key
                        ? 'bg-gold/20 border-gold text-gold'
                        : 'border-nile-blue/30 text-white/50 hover:text-white'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-1.5">
                {selectedPreset.description} · {resolvedCount} market
                {resolvedCount === 1 ? '' : 's'} will be added
              </p>
            </div>

            <div className="bg-charcoal/50 border border-nile-blue/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">Odds Source</span>
                <button
                  onClick={handleGenerateOdds}
                  disabled={!step1Valid || generatingOdds}
                  className="bg-gold/20 border border-gold text-gold px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gold/30 disabled:opacity-30 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingOdds ? 'Generating...' : 'Generate Odds with AI'}
                </button>
              </div>
              {usedAIOdds ? (
                <p className="text-gold text-xs">
                  ✨ AI-suggested odds applied to {aiCoveredIds.length} market(s). Remaining markets use local placeholder defaults.
                </p>
              ) : (
                <p className="text-white/40 text-xs">
                  Not generated yet — using local placeholder defaults for all markets.
                </p>
              )}
              {aiError && (
                <p className="text-nile-orange text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {aiError}
                </p>
              )}
            </div>

            <div className="bg-nile-orange/10 border border-nile-orange/30 rounded-lg p-3 text-xs text-nile-orange flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {usedAIOdds ? (
                <span>
                  <strong>AI-generated odds are not real pricing.</strong> This match can only be
                  saved as a Draft — publishing directly is disabled. Open it in the Odds screen
                  and confirm every number before it goes live.
                </span>
              ) : (
                <span>
                  Placeholder odds are pre-filled across all selected markets. None of this is real
                  pricing — review and correct every market before you rely on it for real bets.
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => handlePublish(false)}
                disabled={!step1Valid || saving}
                className="border border-gold/30 text-gold px-4 py-2.5 rounded-lg text-sm hover:bg-gold/10 disabled:opacity-30"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handlePublish(true)}
                disabled={!step1Valid || saving || usedAIOdds}
                title={usedAIOdds ? 'AI-suggested odds must be reviewed in the Odds screen first' : undefined}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5',
                  step1Valid && !saving && !usedAIOdds
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                {saving ? 'Publishing...' : (
                  <>
                    <Check className="w-4 h-4" /> Publish Match
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
