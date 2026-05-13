'use server'

import { createClient }
  from '@/lib/supabase/server'
import type {
  MatchWithLeague,
  MatchWithMarkets,
  CountryWithLeagues,
  League,
  PlatformSettings,
} from '@/types/database.types'

export type FilterType =
  | 'today'
  | 'tomorrow'
  | 'weekly'
  | '1hr'
  | '3hr'
  | '6hr'
  | '12hr'

function buildTimeFilter(
  filter: FilterType
): string {
  switch (filter) {
    case 'today':
      return `kick_off_time.gte.${new Date().toISOString().split('T')[0]}T00:00:00,kick_off_time.lte.${new Date().toISOString().split('T')[0]}T23:59:59`
    case 'tomorrow': {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      const ds = d.toISOString().split('T')[0]
      return `kick_off_time.gte.${ds}T00:00:00,kick_off_time.lte.${ds}T23:59:59`
    }
    case 'weekly': {
      const end = new Date()
      end.setDate(end.getDate() + 7)
      return `kick_off_time.lte.${end.toISOString()}`
    }
    case '1hr': {
      const end = new Date()
      end.setHours(end.getHours() + 1)
      return `kick_off_time.lte.${end.toISOString()}`
    }
    case '3hr': {
      const end = new Date()
      end.setHours(end.getHours() + 3)
      return `kick_off_time.lte.${end.toISOString()}`
    }
    case '6hr': {
      const end = new Date()
      end.setHours(end.getHours() + 6)
      return `kick_off_time.lte.${end.toISOString()}`
    }
    case '12hr': {
      const end = new Date()
      end.setHours(end.getHours() + 12)
      return `kick_off_time.lte.${end.toISOString()}`
    }
  }
}

export async function getUpcomingMatches(options: {
  leagueIds?: string[]
  isTopLeagues?: boolean
  filter?: FilterType | null
}): Promise<MatchWithLeague[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  let query = supabase
    .from('matches')
    .select(`
      *,
      leagues!inner (
        id,
        name,
        is_top_league,
        country_id,
        countries!inner (
          id,
          name,
          flag_emoji
        )
      ),
      match_markets (
        *,
        market_templates (
          id,
          name
        ),
        match_market_odds (*)
      )
    `)
    .eq('status', 'upcoming')
    .gte('kick_off_time', now)
    .order('is_featured', {
      ascending: false,
    })
    .order('kick_off_time', {
      ascending: true,
    })

  if (options.isTopLeagues) {
    query = query.eq(
      'leagues.is_top_league',
      true
    )
  } else if (
    options.leagueIds &&
    options.leagueIds.length > 0
  ) {
    query = query.in(
      'league_id',
      options.leagueIds
    )
  }

  if (options.filter) {
    const now2 = new Date()
    if (options.filter === 'today') {
      const start = new Date(now2)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now2)
      end.setHours(23, 59, 59, 999)
      query = query
        .gte('kick_off_time', start.toISOString())
        .lte('kick_off_time', end.toISOString())
    } else if (
      options.filter === 'tomorrow'
    ) {
      const start = new Date(now2)
      start.setDate(start.getDate() + 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now2)
      end.setDate(end.getDate() + 1)
      end.setHours(23, 59, 59, 999)
      query = query
        .gte('kick_off_time', start.toISOString())
        .lte('kick_off_time', end.toISOString())
    } else if (
      options.filter === 'weekly'
    ) {
      const end = new Date(now2)
      end.setDate(end.getDate() + 7)
      query = query.lte(
        'kick_off_time',
        end.toISOString()
      )
    } else if (
      options.filter === '1hr'
    ) {
      const end = new Date(now2)
      end.setHours(end.getHours() + 1)
      query = query.lte(
        'kick_off_time',
        end.toISOString()
      )
    } else if (
      options.filter === '3hr'
    ) {
      const end = new Date(now2)
      end.setHours(end.getHours() + 3)
      query = query.lte(
        'kick_off_time',
        end.toISOString()
      )
    } else if (
      options.filter === '6hr'
    ) {
      const end = new Date(now2)
      end.setHours(end.getHours() + 6)
      query = query.lte(
        'kick_off_time',
        end.toISOString()
      )
    } else if (
      options.filter === '12hr'
    ) {
      const end = new Date(now2)
      end.setHours(end.getHours() + 12)
      query = query.lte(
        'kick_off_time',
        end.toISOString()
      )
    }
  }

  const { data, error } = await query
    .limit(200)

  if (error) {
    console.error(
      'getUpcomingMatches error:',
      error
    )
    return []
  }

  return (data ?? []).map((m: any) => ({
    ...m,
    league_name: m.leagues?.name ?? '',
    country_name:
      m.leagues?.countries?.name ?? '',
    flag_emoji:
      m.leagues?.countries
        ?.flag_emoji ?? '🏳️',
    country_id:
      m.leagues?.country_id ?? '',
  })) as MatchWithLeague[]
}

export async function getMatchWithAllMarkets(
  matchId: string
): Promise<MatchWithMarkets | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      leagues (
        *,
        countries (*)
      ),
      match_players (*),
      match_markets (
        *,
        market_templates (
          *,
          market_categories (*)
        ),
        match_market_odds (*)
      )
    `)
    .eq('id', matchId)
    .single()

  if (error || !data) return null

  return data as unknown as MatchWithMarkets
}

export async function getCountriesWithLeagues(): Promise<CountryWithLeagues[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('countries')
    .select(`
      *,
      leagues (
        id,
        name,
        is_top_league,
        display_order,
        country_id,
        created_by,
        created_at
      )
    `)
    .order('display_order', {
      ascending: true,
    })

  if (error) return []

  return (data ?? []).map((c: any) => ({
    ...c,
    leagues: (c.leagues ?? []).sort(
      (a: any, b: any) =>
        a.display_order - b.display_order
    ),
  })) as CountryWithLeagues[]
}

export async function getTopLeagues(): Promise<League[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('is_top_league', true)
    .order('display_order', {
      ascending: true,
    })

  if (error) return []
  return (data ?? []) as League[]
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')

  const rows = data ?? []

  const get = (
    k: string,
    def = '0'
  ) =>
    rows.find((r: any) => r.key === k)
      ?.value ?? def

  return {
    minStake: parseFloat(
      get('min_stake', '10')
    ),
    maxStakePerSlip: parseFloat(
      get('max_stake_per_slip', '50000')
    ),
    maxStakePerMarket: parseFloat(
      get('max_stake_per_market', '10000')
    ),
    maxOddPerSelection: parseFloat(
      get('max_odd_per_selection', '50')
    ),
    maxTotalOdds: parseFloat(
      get('max_total_odds', '5000')
    ),
    minSelections: parseInt(
      get('min_selections', '4')
    ),
    winningTaxPercent: parseFloat(
      get('winning_tax_percent', '15')
    ),
    maxPayout: parseFloat(
      get('max_payout', '500000')
    ),
    maxInstantRedemption: parseFloat(
      get(
        'max_instant_redemption',
        '150000'
      )
    ),
    cashierProfitPercent: parseFloat(
      get('cashier_profit_percent', '40')
    ),
    agentProfitPercent: parseFloat(
      get('agent_profit_percent', '60')
    ),
    topupExpiryHours: parseInt(
      get('topup_expiry_hours', '6')
    ),
    withdrawalExpiryHours: parseInt(
      get('withdrawal_expiry_hours', '6')
    ),
    loginAttemptLimit: parseInt(
      get('login_attempt_limit', '5')
    ),
    sessionTimeoutHours: parseInt(
      get('session_timeout_hours', '8')
    ),
    cancellationWindowMins: parseInt(
      get('cancellation_window_mins', '5')
    ),
    insuranceMinSelections: parseInt(
      get('insurance_min_selections', '10')
    ),
    insurance1LossPct: parseFloat(
      get('insurance_1_loss_pct', '2')
    ),
    insurance2LossPct: parseFloat(
      get('insurance_2_loss_pct', '1')
    ),
    insurance3LossRefund:
      get(
        'insurance_3_loss_refund',
        'true'
      ) === 'true',
    welcomeBonusEnabled:
      get(
        'welcome_bonus_enabled',
        'true'
      ) === 'true',
    welcomeBonusMinTopup: parseFloat(
      get('welcome_bonus_min_topup', '500')
    ),
    welcomeBonusAmount: parseFloat(
      get('welcome_bonus_amount', '50')
    ),
    jackpotFixedStake: parseFloat(
      get('jackpot_fixed_stake', '50')
    ),
    jackpotWinAllReward: parseFloat(
      get('jackpot_win_all_reward', '250000')
    ),
    jackpotNearWinReward: parseFloat(
      get('jackpot_near_win_reward', '25000')
    ),
  }
}

export async function searchBettorByUsername(
  username: string,
  _staffUserId: string
): Promise<{ id: string; username: string; credit_balance: number }[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, username, credit_balance')
    .eq('role', 'bettor')
    .eq('status', 'active')
    .ilike('username', `%${username}%`)
    .limit(10)

  return (data ?? []) as {
    id: string
    username: string
    credit_balance: number
  }[]
}