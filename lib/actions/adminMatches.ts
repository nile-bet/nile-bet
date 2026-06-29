'use server'

import { createClient }
  from '@/lib/supabase/server'

// ─── MATCH LIST ───────────────────────

export async function getMatchesForAdmin(
  filters: {
    status?: string
    search?: string
    leagueId?: string
    countryId?: string
    dateFrom?: string
    dateTo?: string
    isFeatured?: boolean
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  const {
    status,
    search,
    leagueId,
    countryId,
    dateFrom,
    dateTo,
    isFeatured,
    page = 1,
    limit = 20,
  } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from('matches')
    .select(
      `
      *,
      leagues (
        name,
        countries (name, flag_emoji)
      ),
      match_markets (
        id,
        is_enabled
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (
    status &&
    status !== 'all'
  ) {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(
      `home_team.ilike.%${search}%,away_team.ilike.%${search}%`
    )
  }

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }
  if (dateFrom) {
    query = query.gte('kick_off_time', dateFrom)
  }
  if (dateTo) {
    query = query.lte('kick_off_time', dateTo)
  }
  if (isFeatured !== undefined) {
    query = query.eq('is_featured', isFeatured)
  }
  if (countryId) {
    query = query.eq('leagues.countries.id', countryId)
  }
  if (dateFrom) {
    query = query.gte('kick_off_time', dateFrom)
  }
  if (dateTo) {
    query = query.lte('kick_off_time', dateTo)
  }
  if (isFeatured !== undefined) {
    query = query.eq('is_featured', isFeatured)
  }

  const { data, count } = await query

  return {
    matches: (data ?? []).map((m: any) => ({
      ...m,
      league_name: m.leagues?.name ?? '',
      country_name:
        m.leagues?.countries?.name ?? '',
      flag_emoji:
        m.leagues?.countries
          ?.flag_emoji ?? '🏳️',
      enabled_markets: (
        m.match_markets ?? []
      ).filter((mm: any) => mm.is_enabled)
        .length,
      total_markets:
        (m.match_markets ?? []).length,
    })),
    total: count ?? 0,
  }
}

// ─── CREATE MATCH ─────────────────────

export async function createMatch(data: {
  homeTeam: string
  awayTeam: string
  leagueId: string
  kickOffTime: string
  isFeatured: boolean
  publishImmediately: boolean
  selectedMarkets: string[]
  odds: {
    marketTemplateId: string
    selection: string
    oddValue: number
  }[]
  players?: {
    name: string
    team: 'home' | 'away'
  }[]
  createdBy: string
}): Promise<{
  success: boolean
  matchId?: string
  error?: string
}> {
  const supabase = await createClient()

  // Validate odds > 1.0
  const badOdd = data.odds.find(
    (o) => o.oddValue <= 1.0
  )
  if (badOdd) {
    return {
      success: false,
      error: 'All odds must be greater than 1.00',
    }
  }

  // Insert match
  const { data: match, error: matchError } =
    await supabase
      .from('matches')
      .insert({
        home_team: data.homeTeam,
        away_team: data.awayTeam,
        league_id: data.leagueId,
        kick_off_time: data.kickOffTime,
        is_featured: data.isFeatured,
        status: data.publishImmediately
          ? 'upcoming'
          : 'pending',
        created_by: data.createdBy,
      })
      .select('id')
      .single()

  if (matchError || !match) {
    return {
      success: false,
      error: 'Failed to create match',
    }
  }

  const matchId = match.id

  // Insert match markets
  if (data.selectedMarkets.length > 0) {
    const markets = data.selectedMarkets.map(
      (templateId) => ({
        match_id: matchId,
        market_template_id: templateId,
        is_enabled: true,
        status: 'open',
      })
    )

    const { data: insertedMarkets } =
      await supabase
        .from('match_markets')
        .insert(markets)
        .select('id, market_template_id')

    // Insert odds per market
    if (insertedMarkets && data.odds.length > 0) {
      const oddRows: any[] = []

      insertedMarkets.forEach((mm: any) => {
        const marketOdds = data.odds.filter(
          (o) =>
            o.marketTemplateId ===
            mm.market_template_id
        )
        marketOdds.forEach((o) => {
          oddRows.push({
            match_market_id: mm.id,
            selection: o.selection,
            odd_value: o.oddValue,
            original_odd: o.oddValue,
            last_updated_by: data.createdBy,
          })
        })
      })

      if (oddRows.length > 0) {
        await supabase
          .from('match_market_odds')
          .insert(oddRows)
      }
    }
  }

  // Insert players and their odds into scorer markets
  if (data.players && data.players.length > 0) {
    // Insert players
    await supabase.from('match_players').insert(
      data.players.map((p) => ({
        match_id: matchId,
        player_name: p.name,
        team: p.team,
        added_by: data.createdBy,
      }))
    )

    // Get scorer market IDs for this match
    const { data: scorerTemplates } = await supabase
      .from('market_templates')
      .select('id')
      .in('name', ['Anytime Scorer', 'First Scorer', 'Last Scorer'])

    const scorerTemplateIds = scorerTemplates?.map((t: any) => t.id) ?? []

    const { data: scorerMarkets } = await supabase
      .from('match_markets')
      .select('id')
      .eq('match_id', matchId)
      .in('market_template_id', scorerTemplateIds)

    if (scorerMarkets?.length) {
      const playerOdds: any[] = []
      for (const market of scorerMarkets) {
        for (const player of data.players) {
          playerOdds.push({
            match_market_id: market.id,
            selection: player.name,
            odd_value: 2.00,
            original_odd: 2.00,
            last_updated_by: data.createdBy,
          })
        }
      }
      if (playerOdds.length > 0) {
        await supabase.from('match_market_odds').insert(playerOdds)
      }
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: data.createdBy,
      action: 'match_created',
      details: {
        match_id: matchId,
        home_team: data.homeTeam,
        away_team: data.awayTeam,
        published: data.publishImmediately,
      },
    })

  return { success: true, matchId }
}

// ─── UPDATE MATCH ─────────────────────

export async function updateMatch(
  matchId: string,
  data: {
    homeTeam?: string
    awayTeam?: string
    kickOffTime?: string
    isFeatured?: boolean
    updatedBy: string
    oddsUpdates?: {
      matchMarketId: string
      selection: string
      newOdd: number
    }[]
  }
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const updateData: any = {}
  if (data.homeTeam !== undefined)
    updateData.home_team = data.homeTeam
  if (data.awayTeam !== undefined)
    updateData.away_team = data.awayTeam
  if (data.kickOffTime !== undefined)
    updateData.kick_off_time = data.kickOffTime
  if (data.isFeatured !== undefined)
    updateData.is_featured = data.isFeatured

  if (Object.keys(updateData).length > 0) {
    await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)
  }

  // Update odds (never update original_odd)
  if (
    data.oddsUpdates &&
    data.oddsUpdates.length > 0
  ) {
    for (const odd of data.oddsUpdates) {
      await supabase
        .from('match_market_odds')
        .update({
          odd_value: odd.newOdd,
          last_updated_by: data.updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('match_market_id', odd.matchMarketId)
        .eq('selection', odd.selection)
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: data.updatedBy,
      action: 'match_updated',
      details: {
        match_id: matchId,
        updates: data.oddsUpdates?.length
          ? `${data.oddsUpdates.length} odds updated`
          : 'match info updated',
      },
    })

  return { success: true }
}

// ─── PUBLISH ─────────────────────────

export async function publishMatch(
  matchId: string,
  adminId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  await supabase
    .from('matches')
    .update({ status: 'upcoming' })
    .eq('id', matchId)

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'match_published',
      details: { match_id: matchId },
    })

  return { success: true }
}

export async function publishMatches(
  matchIds: string[],
  adminId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  await supabase
    .from('matches')
    .update({ status: 'upcoming' })
    .in('id', matchIds)

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'matches_bulk_published',
      details: { count: matchIds.length },
    })

  return { success: true }
}

// ─── CANCEL ──────────────────────────

export async function cancelMatch(
  matchId: string,
  adminId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('id', matchId)

  // Void all selections for this match
  const { data: affectedSelections } =
    await supabase
      .from('slip_selections')
      .select('id, slip_id')
      .eq('match_id', matchId)
      .eq('result', 'pending')

  if (
    affectedSelections &&
    affectedSelections.length > 0
  ) {
    await supabase
      .from('slip_selections')
      .update({ result: 'void' })
      .eq('match_id', matchId)
      .eq('result', 'pending')

    // Try to settle affected slips
    const slipIds = [
      ...new Set(
        affectedSelections.map(
          (s) => s.slip_id
        )
      ),
    ]

    for (const slipId of slipIds) {
      await supabase.rpc(
        'settle_slip',
        { p_slip_id: slipId }
      )
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'match_cancelled',
      details: { match_id: matchId },
    })

  return { success: true }
}

// ─── TOGGLE FEATURED ─────────────────

export async function toggleFeatured(
  matchId: string,
  isFeatured: boolean,
  adminId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  await supabase
    .from('matches')
    .update({ is_featured: isFeatured })
    .eq('id', matchId)

  return { success: true }
}

// ─── CLONE MATCH ─────────────────────

export async function cloneMatch(
  matchId: string,
  adminId: string
): Promise<{
  success: boolean
  newMatchId?: string
}> {
  const supabase = await createClient()

  const { data: original } = await supabase
    .from('matches')
    .select(
      `
      *,
      match_markets (
        market_template_id,
        match_market_odds (
          selection,
          odd_value
        )
      )
    `
    )
    .eq('id', matchId)
    .single()

  if (!original) {
    return { success: false }
  }

  const { data: newMatch } = await supabase
    .from('matches')
    .insert({
      home_team: original.home_team + ' (copy)',
      away_team: original.away_team,
      league_id: original.league_id,
      kick_off_time: new Date(
        Date.now() + 86400000
      ).toISOString(),
      status: 'pending',
      is_featured: false,
      created_by: adminId,
    })
    .select('id')
    .single()

  if (!newMatch) {
    return { success: false }
  }

  const markets =
    (original as any).match_markets ?? []

  for (const market of markets) {
    const { data: mm } = await supabase
      .from('match_markets')
      .insert({
        match_id: newMatch.id,
        market_template_id:
          market.market_template_id,
        is_enabled: true,
        status: 'open',
      })
      .select('id')
      .single()

    if (mm && market.match_market_odds) {
      await supabase
        .from('match_market_odds')
        .insert(
          market.match_market_odds.map(
            (o: any) => ({
              match_market_id: mm.id,
              selection: o.selection,
              odd_value: o.odd_value,
              original_odd: o.odd_value,
              last_updated_by: adminId,
            })
          )
        )
    }
  }

  return {
    success: true,
    newMatchId: newMatch.id,
  }
}

// ─── APPLY GLOBAL MARGIN ─────────────

export async function applyGlobalMargin(
  matchId: string,
  marginPercent: number,
  adminId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const factor = 1 + marginPercent / 100

  const { data: markets } = await supabase
    .from('match_markets')
    .select('id')
    .eq('match_id', matchId)
    .eq('is_enabled', true)

  if (!markets || markets.length === 0) {
    return {
      success: false,
      error: 'No enabled markets found',
    }
  }

  const marketIds = markets.map((m) => m.id)

  const { data: odds } = await supabase
    .from('match_market_odds')
    .select('id, odd_value')
    .in('match_market_id', marketIds)

  if (!odds) {
    return { success: false }
  }

  for (const odd of odds) {
    const newOdd = parseFloat(
      (odd.odd_value * factor).toFixed(2)
    )
    if (newOdd <= 1.0) {
      return {
        success: false,
        error:
          'Cannot reduce odds below 1.01',
      }
    }
    await supabase
      .from('match_market_odds')
      .update({
        odd_value: newOdd,
        last_updated_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', odd.id)
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'margin_applied',
      details: {
        match_id: matchId,
        margin: marginPercent,
      },
    })

  return { success: true }
}

// ─── SETTLEMENT ENGINE ────────────────

function calculateSelectionResult(
  selection: string,
  marketName: string,
  result: {
    ht_home: number
    ht_away: number
    ft_home: number
    ft_away: number
    home_corners: number
    away_corners: number
    home_cards: number
    away_cards: number
    ht_home_corners: number
    ht_away_corners: number
    ht_home_cards: number
    ht_away_cards: number
    first_corner: string
    last_corner: string
    first_card: string
    minute_scores: Record<
      string,
      { home: number; away: number }
    >
    scorers: {
      firstScorer?: string
      lastScorer?: string
      goalscorers?: string[]
    }
    specials: Record<string, boolean | string>
  }
): 'won' | 'lost' | 'void' {
  const {
    ft_home,
    ft_away,
    ht_home,
    ht_away,
    home_corners,
    away_corners,
    home_cards,
    away_cards,
    ht_home_corners,
    ht_away_corners,
    ht_home_cards,
    ht_away_cards,
    first_corner,
    last_corner,
    first_card,
    minute_scores,
    scorers,
    specials,
  } = result

  const totalGoals = ft_home + ft_away
  const totalCorners =
    home_corners + away_corners
  const totalCards = home_cards + away_cards
  const homeWin = ft_home > ft_away
  const awayWin = ft_away > ft_home
  const draw = ft_home === ft_away
  const htHomeWin = ht_home > ht_away
  const htAwayWin = ht_away > ht_home
  const htDraw = ht_home === ht_away

  // Helper
  const won = 'won' as const
  const lost = 'lost' as const
  const voidResult = 'void' as const

  // ── MAIN ──
  if (marketName === '1X2 (Full Time Result)') {
    if (selection === 'Home') return homeWin ? won : lost
    if (selection === 'Draw') return draw ? won : lost
    if (selection === 'Away') return awayWin ? won : lost
  }

  if (marketName === 'Double Chance') {
    if (selection === '1X') return (homeWin || draw) ? won : lost
    if (selection === 'X2') return (awayWin || draw) ? won : lost
    if (selection === '12') return (homeWin || awayWin) ? won : lost
  }

  if (marketName === 'Draw No Bet') {
    if (draw) return voidResult
    if (selection === 'Home') return homeWin ? won : lost
    if (selection === 'Away') return awayWin ? won : lost
  }

  if (marketName === 'Both Teams to Score') {
    const btts = ft_home > 0 && ft_away > 0
    if (selection === 'Yes') return btts ? won : lost
    if (selection === 'No') return !btts ? won : lost
  }

  if (marketName === 'Win to Nil - Home') {
    const winNilHome = homeWin && ft_away === 0
    if (selection === 'Yes') return winNilHome ? won : lost
    if (selection === 'No') return !winNilHome ? won : lost
  }

  if (marketName === 'Win to Nil - Away') {
    const winNilAway = awayWin && ft_home === 0
    if (selection === 'Yes') return winNilAway ? won : lost
    if (selection === 'No') return !winNilAway ? won : lost
  }

  // ── GOALS ──
  const ouMatch = marketName.match(
    /Over\/Under (\d+(?:\.\d+)?)/
  )
  if (ouMatch) {
    const line = parseFloat(ouMatch[1])
    if (selection === 'Over')
      return totalGoals > line ? won : lost
    if (selection === 'Under')
      return totalGoals < line ? won : lost
  }

  if (marketName === 'Exact Total Goals') {
    if (selection === '5+')
      return totalGoals >= 5 ? won : lost
    return totalGoals === parseInt(selection)
      ? won
      : lost
  }

  if (marketName === 'Total Goals') {
    if (selection === '0-1')
      return totalGoals <= 1 ? won : lost
    if (selection === '2-3')
      return totalGoals >= 2 &&
        totalGoals <= 3
        ? won
        : lost
    if (selection === '4+')
      return totalGoals >= 4 ? won : lost
  }

  if (marketName === 'First Team to Score') {
    const fts = specials.firstTeamToScore as string
    if (selection === 'Home')
      return fts === 'home' ? won : lost
    if (selection === 'Away')
      return fts === 'away' ? won : lost
    if (selection === 'No Goal')
      return !fts || fts === 'no_goal'
        ? won
        : lost
  }

  if (marketName === 'Last Team to Score') {
    const lts = specials.lastTeamToScore as string
    if (selection === 'Home')
      return lts === 'home' ? won : lost
    if (selection === 'Away')
      return lts === 'away' ? won : lost
    if (selection === 'No Goal')
      return !lts || lts === 'no_goal'
        ? won
        : lost
  }

  if (marketName === 'Time of First Goal') {
    const tofg = specials.timeOfFirstGoal as string
    if (selection === 'No Goal')
      return !tofg || tofg === 'No Goal'
        ? won
        : lost
    return tofg === selection ? won : lost
  }

  // ── HALVES ──
  if (marketName === '1st Half Result') {
    if (selection === 'Home')
      return htHomeWin ? won : lost
    if (selection === 'Draw')
      return htDraw ? won : lost
    if (selection === 'Away')
      return htAwayWin ? won : lost
  }

  if (marketName === '2nd Half Result') {
    const sh_home = ft_home - ht_home
    const sh_away = ft_away - ht_away
    if (selection === 'Home')
      return sh_home > sh_away ? won : lost
    if (selection === 'Draw')
      return sh_home === sh_away ? won : lost
    if (selection === 'Away')
      return sh_away > sh_home ? won : lost
  }

  if (marketName === 'Half Time / Full Time') {
    const htResult = htHomeWin
      ? '1'
      : htAwayWin
      ? '2'
      : 'X'
    const ftResult = homeWin
      ? '1'
      : awayWin
      ? '2'
      : 'X'
    const combo = `${htResult}/${ftResult}`
    return combo === selection ? won : lost
  }

  const htOuMatch = marketName.match(
    /1st Half Over\/Under (\d+(?:\.\d+)?)/
  )
  if (htOuMatch) {
    const line = parseFloat(htOuMatch[1])
    const htTotal = ht_home + ht_away
    if (selection === 'Over')
      return htTotal > line ? won : lost
    if (selection === 'Under')
      return htTotal < line ? won : lost
  }

  if (marketName === '1st Half BTTS') {
    const btts = ht_home > 0 && ht_away > 0
    if (selection === 'Yes')
      return btts ? won : lost
    if (selection === 'No')
      return !btts ? won : lost
  }

  // ── CORNERS ──
  const cornerOuMatch = marketName.match(
    /Total Corners O\/U (\d+(?:\.\d+)?)/
  )
  if (cornerOuMatch) {
    const line = parseFloat(cornerOuMatch[1])
    if (selection === 'Over')
      return totalCorners > line ? won : lost
    if (selection === 'Under')
      return totalCorners < line ? won : lost
  }

  if (marketName === 'Corner Match Bet') {
    if (selection === 'Home')
      return home_corners > away_corners
        ? won
        : lost
    if (selection === 'Draw')
      return home_corners === away_corners
        ? won
        : lost
    if (selection === 'Away')
      return away_corners > home_corners
        ? won
        : lost
  }

  // ── CARDS ──
  const cardOuMatch = marketName.match(
    /Total Cards O\/U (\d+(?:\.\d+)?)/
  )
  if (cardOuMatch) {
    const line = parseFloat(cardOuMatch[1])
    if (selection === 'Over')
      return totalCards > line ? won : lost
    if (selection === 'Under')
      return totalCards < line ? won : lost
  }

  // ── CLEAN SHEET ──
  if (marketName === 'Home Clean Sheet') {
    const cs = ft_away === 0
    if (selection === 'Yes')
      return cs ? won : lost
    if (selection === 'No')
      return !cs ? won : lost
  }

  if (marketName === 'Away Clean Sheet') {
    const cs = ft_home === 0
    if (selection === 'Yes')
      return cs ? won : lost
    if (selection === 'No')
      return !cs ? won : lost
  }

  // ── GOALS ODD/EVEN ──
  if (
    marketName === 'Total Goals Odd/Even (FT)'
  ) {
    const isOdd = totalGoals % 2 !== 0
    if (selection === 'Odd')
      return isOdd ? won : lost
    if (selection === 'Even')
      return !isOdd ? won : lost
  }

  // ── TEAM GOALS ──
  const homeOuMatch = marketName.match(
    /Home Team O\/U (\d+(?:\.\d+)?)/
  )
  if (homeOuMatch) {
    const line = parseFloat(homeOuMatch[1])
    if (selection === 'Over')
      return ft_home > line ? won : lost
    if (selection === 'Under')
      return ft_home < line ? won : lost
  }

  const awayOuMatch = marketName.match(
    /Away Team O\/U (\d+(?:\.\d+)?)/
  )
  if (awayOuMatch) {
    const line = parseFloat(awayOuMatch[1])
    if (selection === 'Over')
      return ft_away > line ? won : lost
    if (selection === 'Under')
      return ft_away < line ? won : lost
  }

  // ── SCORERS ──
  if (marketName === 'Anytime Scorer') {
    const scored =
      scorers.goalscorers?.includes(
        selection
      ) ?? false
    return scored ? won : lost
  }

  if (marketName === 'First Scorer') {
    if (selection === 'No Goal')
      return !scorers.firstScorer ||
        scorers.firstScorer === 'no_goal'
        ? won
        : lost
    return scorers.firstScorer === selection
      ? won
      : lost
  }

  if (marketName === 'Last Scorer') {
    if (selection === 'No Goal')
      return !scorers.lastScorer ||
        scorers.lastScorer === 'no_goal'
        ? won
        : lost
    return scorers.lastScorer === selection
      ? won
      : lost
  }

  // ── CORRECT SCORE ──
  if (
    marketName ===
    'Correct Score (Full Time)'
  ) {
    if (selection === 'Any Other') {
      const commonScores = [
        '0-0','1-0','0-1','1-1',
        '2-0','0-2','2-1','1-2','2-2',
        '3-0','0-3','3-1','1-3','3-2',
        '2-3','3-3','4-0','0-4','4-1',
        '1-4','4-2','2-4',
      ]
      const actual = `${ft_home}-${ft_away}`
      return !commonScores.includes(actual)
        ? won
        : lost
    }
    const [h, a] = selection
      .split('-')
      .map(Number)
    return ft_home === h && ft_away === a
      ? won
      : lost
  }

  if (
    marketName ===
    'Correct Score (1st Half)'
  ) {
    if (selection === 'Any Other') {
      const commonHT = [
        '0-0','1-0','0-1','1-1',
        '2-0','0-2','2-1','1-2',
      ]
      const actual = `${ht_home}-${ht_away}`
      return !commonHT.includes(actual)
        ? won
        : lost
    }
    const [h, a] = selection
      .split('-')
      .map(Number)
    return ht_home === h && ht_away === a
      ? won
      : lost
  }

  // ── MINUTES (Result at X min) ──
  const minMatch = marketName.match(
    /Result at (\d+) Minutes/
  )
  if (minMatch) {
    const minute = minMatch[1]
    const score = minute_scores[minute]
    if (!score) return voidResult
    const mHome = score.home
    const mAway = score.away
    const mHomeWin = mHome > mAway
    const mDraw = mHome === mAway
    const mAwayWin = mAway > mHome
    if (selection === 'Home')
      return mHomeWin ? won : lost
    if (selection === 'Draw')
      return mDraw ? won : lost
    if (selection === 'Away')
      return mAwayWin ? won : lost
  }

  // ── MINUTES (Goal Before X min) ──
  const goalMinMatch = marketName.match(
    /Goal Before (\d+) Minutes/
  )
  if (goalMinMatch) {
    const minute = parseInt(goalMinMatch[1])
    let goalsAtMinute = 0
    for (const [min, score] of Object.entries(
      minute_scores
    )) {
      if (parseInt(min) <= minute) {
        goalsAtMinute =
          score.home + score.away
      }
    }
    if (selection === 'Yes')
      return goalsAtMinute > 0 ? won : lost
    if (selection === 'No')
      return goalsAtMinute === 0 ? won : lost
  }

  // ── SPECIALS ──
  const specialMap: Record<string, string> = {
    'Penalty Awarded': 'penaltyAwarded',
    'Penalty Scored': 'penaltyScored',
    'Home Penalty': 'homePenalty',
    'Away Penalty': 'awayPenalty',
    'Own Goal': 'ownGoal',
    'Match Goes to Penalties':
      'matchToPenalties',
    'Hat-trick Scored': 'hatTrick',
    'Goalkeeper to Score': 'goalkeeperScore',
    'Injury Time Over 4 Minutes':
      'injuryTimeOver4',
    'Injury Time Over 6 Minutes':
      'injuryTimeOver6',
    'Both Teams Penalty': 'bothTeamsPenalty',
    'Substitution Before 30 Min':
      'subBefore30',
    'Any Player Red Card': 'anyRedCard',
    'Home Player Red Card': 'homeRedCard',
    'Away Player Red Card': 'awayRedCard',
  }

  const specialKey = specialMap[marketName]
  if (specialKey) {
    const specialValue =
      specials[specialKey] as boolean
    if (selection === 'Yes')
      return specialValue ? won : lost
    if (selection === 'No')
      return !specialValue ? won : lost
  }

  // ── SCORE GROUP ──
  if (marketName === 'Score Group') {
    const margin = Math.abs(ft_home - ft_away)
    if (selection === 'Home Win 1')
      return homeWin && margin === 1
        ? won
        : lost
    if (selection === 'Home Win 2')
      return homeWin && margin === 2
        ? won
        : lost
    if (selection === 'Home Win 3+')
      return homeWin && margin >= 3
        ? won
        : lost
    if (selection === 'Draw')
      return draw ? won : lost
    if (selection === 'Away Win 1')
      return awayWin && margin === 1
        ? won
        : lost
    if (selection === 'Away Win 2')
      return awayWin && margin === 2
        ? won
        : lost
    if (selection === 'Away Win 3+')
      return awayWin && margin >= 3
        ? won
        : lost
  }

  // ── COMBO ──
  if (marketName === '1X2 + Over/Under 2.5') {
    const overUnder =
      totalGoals > 2.5 ? 'Over' : 'Under'
    const ftResult = homeWin
      ? 'Home'
      : awayWin
      ? 'Away'
      : 'Draw'
    const expected = `${ftResult} & ${overUnder}`
    return expected === selection ? won : lost
  }

  if (marketName === '1X2 + BTTS') {
    const btts =
      ft_home > 0 && ft_away > 0
        ? 'Yes'
        : 'No'
    const ftResult = homeWin
      ? 'Home'
      : awayWin
      ? 'Away'
      : 'Draw'
    const expected = `${ftResult} & ${btts}`
    return expected === selection ? won : lost
  }

  // Asian Handicap
  const ahMatch = marketName.match(
    /Asian Handicap ([+-]\d+(?:\.\d+)?)/
  )
  if (ahMatch) {
    const hc = parseFloat(ahMatch[1])
    const adjHome = ft_home + hc
    if (adjHome > ft_away) {
      return selection === 'Home' ? won : lost
    } else if (adjHome < ft_away) {
      return selection === 'Away' ? won : lost
    } else {
      return voidResult
    }
  }

  // ── MAIN EXTRAS ──
  if (marketName === 'Match Result & BTTS') {
    const btts = ft_home > 0 && ft_away > 0
    const ftResult = homeWin ? 'Home' : awayWin ? 'Away' : 'Draw'
    const expected = `${ftResult} & ${btts ? 'Yes' : 'No'}`
    return expected === selection ? won : lost
  }

  // ── HALVES EXTRAS ──
  if (marketName === '1st Half Double Chance') {
    if (selection === '1X') return (htHomeWin || htDraw) ? won : lost
    if (selection === 'X2') return (htAwayWin || htDraw) ? won : lost
    if (selection === '12') return (htHomeWin || htAwayWin) ? won : lost
  }

  if (marketName === '2nd Half Double Chance') {
    const sh_home = ft_home - ht_home
    const sh_away = ft_away - ht_away
    const shHomeWin = sh_home > sh_away
    const shAwayWin = sh_away > sh_home
    const shDraw = sh_home === sh_away
    if (selection === '1X') return (shHomeWin || shDraw) ? won : lost
    if (selection === 'X2') return (shAwayWin || shDraw) ? won : lost
    if (selection === '12') return (shHomeWin || shAwayWin) ? won : lost
  }

  const shOuMatch = marketName.match(/2nd Half Over\/Under (\d+(?:\.\d+)?)/)
  if (shOuMatch) {
    const line = parseFloat(shOuMatch[1])
    const sh_total = (ft_home - ht_home) + (ft_away - ht_away)
    if (selection === 'Over') return sh_total > line ? won : lost
    if (selection === 'Under') return sh_total < line ? won : lost
  }

  if (marketName === '2nd Half BTTS') {
    const sh_home = ft_home - ht_home
    const sh_away = ft_away - ht_away
    const btts = sh_home > 0 && sh_away > 0
    if (selection === 'Yes') return btts ? won : lost
    if (selection === 'No') return !btts ? won : lost
  }

  if (marketName === '1st Half Draw No Bet') {
    if (htDraw) return voidResult
    if (selection === 'Home') return htHomeWin ? won : lost
    if (selection === 'Away') return htAwayWin ? won : lost
  }

  if (marketName === '2nd Half Draw No Bet') {
    const sh_home = ft_home - ht_home
    const sh_away = ft_away - ht_away
    const shDraw = sh_home === sh_away
    if (shDraw) return voidResult
    if (selection === 'Home') return sh_home > sh_away ? won : lost
    if (selection === 'Away') return sh_away > sh_home ? won : lost
  }

  const htAhMatch = marketName.match(/1st Half AH ([+-]\d+(?:\.\d+)?)/)
  if (htAhMatch) {
    const hc = parseFloat(htAhMatch[1])
    const adjHome = ht_home + hc
    if (adjHome > ht_away) return selection === 'Home' ? won : lost
    if (adjHome < ht_away) return selection === 'Away' ? won : lost
    return voidResult
  }

  if (marketName === 'Highest Scoring Half') {
    const htTotal = ht_home + ht_away
    const shTotal = (ft_home - ht_home) + (ft_away - ht_away)
    if (selection === '1st Half') return htTotal > shTotal ? won : lost
    if (selection === '2nd Half') return shTotal > htTotal ? won : lost
    if (selection === 'Equal') return htTotal === shTotal ? won : lost
  }

  const bothHalvesOuMatch = marketName.match(/Both Halves Over (\d+(?:\.\d+)?)/)
  if (bothHalvesOuMatch) {
    const line = parseFloat(bothHalvesOuMatch[1])
    const htTotal = ht_home + ht_away
    const shTotal = (ft_home - ht_home) + (ft_away - ht_away)
    return htTotal > line && shTotal > line ? won : lost
  }

  if (marketName === 'Home Win Both Halves') {
    const shHomeWin = (ft_home - ht_home) > (ft_away - ht_away)
    return htHomeWin && shHomeWin ? won : lost
  }

  if (marketName === 'Away Win Both Halves') {
    const shAwayWin = (ft_away - ht_away) > (ft_home - ht_home)
    return htAwayWin && shAwayWin ? won : lost
  }

  if (marketName === '1st Half + 2nd Half Result') {
    const htResult = htHomeWin ? '1' : htAwayWin ? '2' : 'X'
    const sh_home = ft_home - ht_home
    const sh_away = ft_away - ht_away
    const shResult = sh_home > sh_away ? '1' : sh_away > sh_home ? '2' : 'X'
    return `${htResult}/${shResult}` === selection ? won : lost
  }

  // ── HANDICAP EXTRAS ──
  const euHcMatch = marketName.match(/European Handicap ([+-]\d+)/)
  if (euHcMatch) {
    const hc = parseInt(euHcMatch[1])
    const adjHome = ft_home + hc
    if (selection === 'Home') return adjHome > ft_away ? won : adjHome === ft_away ? voidResult : lost
    if (selection === 'Draw') return adjHome === ft_away ? won : lost
    if (selection === 'Away') return ft_away > adjHome ? won : adjHome === ft_away ? voidResult : lost
  }

  // ── GOALS EXTRAS ──
  if (marketName === 'BTTS & Over 2.5') {
    const btts = ft_home > 0 && ft_away > 0
    if (selection === 'Yes') return (btts && totalGoals > 2.5) ? won : lost
    if (selection === 'No') return (!btts || totalGoals <= 2.5) ? won : lost
  }

  if (marketName === 'BTTS & Under 2.5') {
    const btts = ft_home > 0 && ft_away > 0
    if (selection === 'Yes') return (btts && totalGoals < 2.5) ? won : lost
    if (selection === 'No') return (!btts || totalGoals >= 2.5) ? won : lost
  }

  // ── CORNERS EXTRAS ──
  const homeCornerOuMatch = marketName.match(/Home Corners O\/U (\d+(?:\.\d+)?)/)
  if (homeCornerOuMatch) {
    const line = parseFloat(homeCornerOuMatch[1])
    if (selection === 'Over') return home_corners > line ? won : lost
    if (selection === 'Under') return home_corners < line ? won : lost
  }

  const awayCornerOuMatch = marketName.match(/Away Corners O\/U (\d+(?:\.\d+)?)/)
  if (awayCornerOuMatch) {
    const line = parseFloat(awayCornerOuMatch[1])
    if (selection === 'Over') return away_corners > line ? won : lost
    if (selection === 'Under') return away_corners < line ? won : lost
  }

  if (marketName === 'Exact Corners') {
    if (selection === '12+') return totalCorners >= 12 ? won : lost
    const n = parseInt(selection)
    if (!isNaN(n)) return totalCorners === n ? won : lost
  }

  // ── CARDS EXTRAS ──
  const homeCardOuMatch = marketName.match(/Home Cards O\/U (\d+(?:\.\d+)?)/)
  if (homeCardOuMatch) {
    const line = parseFloat(homeCardOuMatch[1])
    if (selection === 'Over') return home_cards > line ? won : lost
    if (selection === 'Under') return home_cards < line ? won : lost
  }

  const awayCardOuMatch = marketName.match(/Away Cards O\/U (\d+(?:\.\d+)?)/)
  if (awayCardOuMatch) {
    const line = parseFloat(awayCardOuMatch[1])
    if (selection === 'Over') return away_cards > line ? won : lost
    if (selection === 'Under') return away_cards < line ? won : lost
  }

  // ── GOALS ODD/EVEN EXTRAS ──
  if (marketName === 'Total Goals Odd/Even (1st Half)') {
    const htTotal = ht_home + ht_away
    const isOdd = htTotal % 2 !== 0
    if (selection === 'Odd') return isOdd ? won : lost
    if (selection === 'Even') return !isOdd ? won : lost
  }

  if (marketName === 'Total Goals Odd/Even (2nd Half)') {
    const shTotal = (ft_home - ht_home) + (ft_away - ht_away)
    const isOdd = shTotal % 2 !== 0
    if (selection === 'Odd') return isOdd ? won : lost
    if (selection === 'Even') return !isOdd ? won : lost
  }

  if (marketName === 'Home Goals Odd/Even') {
    const isOdd = ft_home % 2 !== 0
    if (selection === 'Odd') return isOdd ? won : lost
    if (selection === 'Even') return !isOdd ? won : lost
  }

  if (marketName === 'Away Goals Odd/Even') {
    const isOdd = ft_away % 2 !== 0
    if (selection === 'Odd') return isOdd ? won : lost
    if (selection === 'Even') return !isOdd ? won : lost
  }

  if (marketName === 'Total Corners Odd/Even') {
    const isOdd = totalCorners % 2 !== 0
    if (selection === 'Odd') return isOdd ? won : lost
    if (selection === 'Even') return !isOdd ? won : lost
  }

  if (marketName === 'Total Cards Odd/Even') {
    const isOdd = totalCards % 2 !== 0
    if (selection === 'Odd') return isOdd ? won : lost
    if (selection === 'Even') return !isOdd ? won : lost
  }

  // ── CLEAN SHEET EXTRAS ──
  if (marketName === 'Either Team Clean Sheet') {
    const cs = ft_home === 0 || ft_away === 0
    if (selection === 'Yes') return cs ? won : lost
    if (selection === 'No') return !cs ? won : lost
  }

  if (marketName === '1st Half Home Clean Sheet') {
    const cs = ht_away === 0
    if (selection === 'Yes') return cs ? won : lost
    if (selection === 'No') return !cs ? won : lost
  }

  if (marketName === '1st Half Away Clean Sheet') {
    const cs = ht_home === 0
    if (selection === 'Yes') return cs ? won : lost
    if (selection === 'No') return !cs ? won : lost
  }

  if (marketName === 'Home Clean Sheet & Win') {
    const result = homeWin && ft_away === 0
    if (selection === 'Yes') return result ? won : lost
    if (selection === 'No') return !result ? won : lost
  }

  if (marketName === 'Away Clean Sheet & Win') {
    const result = awayWin && ft_home === 0
    if (selection === 'Yes') return result ? won : lost
    if (selection === 'No') return !result ? won : lost
  }

  // ── TEAM GOALS EXTRAS ──
  if (marketName === 'Home Exact Goals') {
    if (selection === '3+') return ft_home >= 3 ? won : lost
    return ft_home === parseInt(selection) ? won : lost
  }

  if (marketName === 'Away Exact Goals') {
    if (selection === '3+') return ft_away >= 3 ? won : lost
    return ft_away === parseInt(selection) ? won : lost
  }

  if (marketName === 'Home Score Both Halves') {
    const scoredBoth = ht_home > 0 && (ft_home - ht_home) > 0
    if (selection === 'Yes') return scoredBoth ? won : lost
    if (selection === 'No') return !scoredBoth ? won : lost
  }

  if (marketName === 'Away Score Both Halves') {
    const scoredBoth = ht_away > 0 && (ft_away - ht_away) > 0
    if (selection === 'Yes') return scoredBoth ? won : lost
    if (selection === 'No') return !scoredBoth ? won : lost
  }

  if (marketName === 'Home Team to Score') {
    if (selection === 'Yes') return ft_home > 0 ? won : lost
    if (selection === 'No') return ft_home === 0 ? won : lost
  }

  if (marketName === 'Away Team to Score') {
    if (selection === 'Yes') return ft_away > 0 ? won : lost
    if (selection === 'No') return ft_away === 0 ? won : lost
  }

  // ── SCORE EXTRAS ──
  if (marketName === 'Winning Margin') {
    const margin = Math.abs(ft_home - ft_away)
    if (selection === 'Draw') return draw ? won : lost
    if (selection === 'Home 1') return homeWin && margin === 1 ? won : lost
    if (selection === 'Home 2') return homeWin && margin === 2 ? won : lost
    if (selection === 'Home 3+') return homeWin && margin >= 3 ? won : lost
    if (selection === 'Away 1') return awayWin && margin === 1 ? won : lost
    if (selection === 'Away 2') return awayWin && margin === 2 ? won : lost
    if (selection === 'Away 3+') return awayWin && margin >= 3 ? won : lost
  }

  // ── COMBO EXTRAS ──
  if (marketName === '1X2 + Total Goal') {
    const ftResult = homeWin ? 'Home' : awayWin ? 'Away' : 'Draw'
    const [resPart, goalPart] = selection.split(' & ')
    if (!resPart || !goalPart) return voidResult
    const resMatch = ftResult === resPart
    let goalMatch = false
    if (goalPart === '0-1') goalMatch = totalGoals <= 1
    else if (goalPart === '2-3') goalMatch = totalGoals >= 2 && totalGoals <= 3
    else if (goalPart === '4+') goalMatch = totalGoals >= 4
    else goalMatch = totalGoals === parseInt(goalPart)
    return resMatch && goalMatch ? won : lost
  }

  if (marketName === '1X2 + O/U 1.5 (1st Half)') {
    const htTotal = ht_home + ht_away
    const ftResult = homeWin ? 'Home' : awayWin ? 'Away' : 'Draw'
    const ou = htTotal > 1.5 ? 'Over' : 'Under'
    return `${ftResult} & ${ou}` === selection ? won : lost
  }

  if (marketName === 'BTTS + Over/Under 2.5') {
    const btts = ft_home > 0 && ft_away > 0 ? 'Yes' : 'No'
    const ou = totalGoals > 2.5 ? 'Over' : 'Under'
    return `${btts} & ${ou}` === selection ? won : lost
  }

  if (marketName === 'BTTS + Over/Under 3.5') {
    const btts = ft_home > 0 && ft_away > 0 ? 'Yes' : 'No'
    const ou = totalGoals > 3.5 ? 'Over' : 'Under'
    return `${btts} & ${ou}` === selection ? won : lost
  }

  if (marketName === 'Double Chance + O/U 2.5') {
    const ou = totalGoals > 2.5 ? 'Over 2.5' : 'Under 2.5'
    const dcWins = homeWin ? ['1X', '12'] : awayWin ? ['X2', '12'] : ['1X', 'X2']
    const [dcPart, ouPart] = selection.split(' & ')
    return dcWins.includes(dcPart) && ouPart === ou ? won : lost
  }

  if (marketName === 'Double Chance + BTTS') {
    const btts = ft_home > 0 && ft_away > 0 ? 'Yes' : 'No'
    const dcWins = homeWin ? ['1X', '12'] : awayWin ? ['X2', '12'] : ['1X', 'X2']
    const [dcPart, bttsPart] = selection.split(' & ')
    return dcWins.includes(dcPart) && bttsPart === btts ? won : lost
  }

  if (marketName === 'Home Win + Over/Under 2.5') {
    const ou = totalGoals > 2.5 ? 'Over 2.5' : 'Under 2.5'
    const [resPart, ouPart] = selection.split(' & ')
    const resMatch = resPart === 'Home Win' ? homeWin : !homeWin
    return resMatch && ouPart === ou ? won : lost
  }

  if (marketName === 'Away Win + Over/Under 2.5') {
    const ou = totalGoals > 2.5 ? 'Over 2.5' : 'Under 2.5'
    const [resPart, ouPart] = selection.split(' & ')
    const resMatch = resPart === 'Away Win' ? awayWin : !awayWin
    return resMatch && ouPart === ou ? won : lost
  }

  if (marketName === 'Win & Over 2.5') {
    const winAndOver = (homeWin || awayWin) && totalGoals > 2.5
    if (selection === 'Yes') return winAndOver ? won : lost
    if (selection === 'No') return !winAndOver ? won : lost
  }

  if (marketName === 'Win & Under 2.5') {
    const winAndUnder = (homeWin || awayWin) && totalGoals < 2.5
    if (selection === 'Yes') return winAndUnder ? won : lost
    if (selection === 'No') return !winAndUnder ? won : lost
  }

  // ── 1ST HALF CORNERS O/U ──
  const htCornerOuMatch = marketName.match(/1st Half Corners O\/U (\d+(?:\.\d+)?)/)
  if (htCornerOuMatch) {
    const line = parseFloat(htCornerOuMatch[1])
    const htCorners = ht_home_corners + ht_away_corners
    if (selection === 'Over') return htCorners > line ? won : lost
    if (selection === 'Under') return htCorners < line ? won : lost
  }

  // ── 1ST HALF CARDS O/U ──
  const htCardOuMatch = marketName.match(/1st Half Cards O\/U (\d+(?:\.\d+)?)/)
  if (htCardOuMatch) {
    const line = parseFloat(htCardOuMatch[1])
    const htCards = ht_home_cards + ht_away_cards
    if (selection === 'Over') return htCards > line ? won : lost
    if (selection === 'Under') return htCards < line ? won : lost
  }

  // ── FIRST / LAST CORNER ──
  if (marketName === 'First Corner') {
    if (selection === 'Home') return first_corner === 'home' ? won : lost
    if (selection === 'Away') return first_corner === 'away' ? won : lost
    if (selection === 'No Corner') return first_corner === 'none' ? won : lost
  }

  if (marketName === 'Last Corner') {
    if (selection === 'Home') return last_corner === 'home' ? won : lost
    if (selection === 'Away') return last_corner === 'away' ? won : lost
    if (selection === 'No Corner') return last_corner === 'none' ? won : lost
  }

  // ── FIRST CARD ──
  if (marketName === 'First Card') {
    if (selection === 'Home') return first_card === 'home' ? won : lost
    if (selection === 'Away') return first_card === 'away' ? won : lost
    if (selection === 'No Card') return first_card === 'none' ? won : lost
  }

  // ── ASIAN HANDICAP CORNERS ──
  // Requires a handicap line stored per match — not in result entry; void safely
  if (marketName === 'Asian Handicap Corners') return voidResult

  // ── ASIAN HANDICAP CARDS ──
  // Requires a handicap line stored per match — not in result entry; void safely
  if (marketName === 'Asian Handicap Cards') return voidResult

  // ── NEXT GOAL MINUTE GROUP ──
  // Requires per-event goal timing — not in result entry; void safely
  if (marketName === 'Next Goal Minute Group') return voidResult

  // Default: void unknown markets
  return voidResult
}

// ─── SETTLEMENT PREVIEW ───────────────

export async function getSettlementPreview(
  matchId: string,
  resultData: {
    ft_home: number
    ft_away: number
    ht_home: number
    ht_away: number
    home_corners: number
    away_corners: number
    home_cards: number
    away_cards: number
    ht_home_corners?: number
    ht_away_corners?: number
    ht_home_cards?: number
    ht_away_cards?: number
    first_corner?: string
    last_corner?: string
    first_card?: string
    minute_scores: Record<string, any>
    scorers: any
    specials: any
  }
) {
  const supabase = await createClient()

  const { data: slipSelections } =
    await supabase
      .from('slip_selections')
      .select(
        `
      id,
      selection,
      odd_at_placement,
      slip_id,
      match_markets (
        market_templates (name)
      )
    `
      )
      .eq('match_id', matchId)
      .eq('result', 'pending')

  if (!slipSelections) {
    return {
      totalSelections: 0,
      wonCount: 0,
      lostCount: 0,
      voidCount: 0,
      totalSlipsAffected: 0,
    }
  }

  let wonCount = 0
  let lostCount = 0
  let voidCount = 0

  const fullResultData = {
    ...resultData,
    ht_home_corners: resultData.ht_home_corners ?? 0,
    ht_away_corners: resultData.ht_away_corners ?? 0,
    ht_home_cards: resultData.ht_home_cards ?? 0,
    ht_away_cards: resultData.ht_away_cards ?? 0,
    first_corner: resultData.first_corner ?? 'none',
    last_corner: resultData.last_corner ?? 'none',
    first_card: resultData.first_card ?? 'none',
  }

  for (const sel of slipSelections) {
    const marketName =
      (sel as any).match_markets
        ?.market_templates?.name ?? ''
    const result = calculateSelectionResult(
      sel.selection,
      marketName,
      fullResultData
    )
    if (result === 'won') wonCount++
    else if (result === 'lost') lostCount++
    else voidCount++
  }

  const slipIds = [
    ...new Set(
      slipSelections.map((s) => s.slip_id)
    ),
  ]

  return {
    totalSelections: slipSelections.length,
    wonCount,
    lostCount,
    voidCount,
    totalSlipsAffected: slipIds.length,
  }
}

// ─── ENTER RESULT & SETTLE ────────────

export async function enterMatchResult(data: {
  matchId: string
  htHome: number
  htAway: number
  ftHome: number
  ftAway: number
  homeCorners: number
  awayCorners: number
  homeCards: number
  awayCards: number
  htHomeCorners: number
  htAwayCorners: number
  htHomeCards: number
  htAwayCards: number
  firstCorner: 'home' | 'away' | 'none'
  lastCorner: 'home' | 'away' | 'none'
  firstCard: 'home' | 'away' | 'none'
  minuteScores: Record<
    string,
    { home: number; away: number }
  >
  scorers: {
    firstScorer?: string
    lastScorer?: string
    goalscorers?: string[]
  }
  specials: Record<string, boolean | string>
  settledBy: string
}): Promise<{
  success: boolean
  settledCount?: number
  failedCount?: number
  error?: string
}> {
  const supabase = await createClient()

  // ── Validate match exists and isn't already settled ──
  const { data: matchCheck } = await supabase
    .from('matches')
    .select('id, status, home_team, away_team')
    .eq('id', data.matchId)
    .single()

  if (!matchCheck) {
    return { success: false, error: 'Match not found' }
  }
  if (matchCheck.status === 'finished') {
    return {
      success: false,
      error: `Match "${matchCheck.home_team} vs ${matchCheck.away_team}" has already been settled. Re-settling is not allowed to prevent double-processing of payouts.`,
    }
  }

  // ── Validate score/stat values ──
  if (data.htHome > data.ftHome) {
    return {
      success: false,
      error:
        'HT home goals cannot exceed FT home goals',
    }
  }
  if (data.htAway > data.ftAway) {
    return {
      success: false,
      error:
        'HT away goals cannot exceed FT away goals',
    }
  }
  const negativeFields: [string, number][] = [
    ['HT home goals', data.htHome],
    ['HT away goals', data.htAway],
    ['FT home goals', data.ftHome],
    ['FT away goals', data.ftAway],
    ['Home corners', data.homeCorners],
    ['Away corners', data.awayCorners],
    ['Home cards', data.homeCards],
    ['Away cards', data.awayCards],
  ]
  for (const [label, value] of negativeFields) {
    if (value == null || value < 0 || !Number.isFinite(value)) {
      return { success: false, error: `${label} must be a valid non-negative number` }
    }
  }

  const resultData = {
    ft_home: data.ftHome,
    ft_away: data.ftAway,
    ht_home: data.htHome,
    ht_away: data.htAway,
    home_corners: data.homeCorners,
    away_corners: data.awayCorners,
    home_cards: data.homeCards,
    away_cards: data.awayCards,
    ht_home_corners: data.htHomeCorners,
    ht_away_corners: data.htAwayCorners,
    ht_home_cards: data.htHomeCards,
    ht_away_cards: data.htAwayCards,
    first_corner: data.firstCorner,
    last_corner: data.lastCorner,
    first_card: data.firstCard,
    minute_scores: data.minuteScores,
    scorers: data.scorers,
    specials: data.specials,
  }

  // Insert match result
  await supabase.from('match_results').upsert(
    {
      match_id: data.matchId,
      ...resultData,
      settled_at: new Date().toISOString(),
      settled_by: data.settledBy,
    },
    { onConflict: 'match_id' }
  )

  // Update match status to finished
  await supabase
    .from('matches')
    .update({ status: 'finished' })
    .eq('id', data.matchId)

  // Get all pending selections for this match
  const { data: selections } = await supabase
    .from('slip_selections')
    .select(
      `
      id,
      slip_id,
      selection,
      match_markets (
        market_templates (name)
      )
    `
    )
    .eq('match_id', data.matchId)
    .eq('result', 'pending')

  if (!selections || selections.length === 0) {
    await supabase
      .from('match_markets')
      .update({ status: 'settled' })
      .eq('match_id', data.matchId)

    return { success: true, settledCount: 0 }
  }

  // Calculate results for each selection
  const selectionUpdates = selections.map(
    (sel) => {
      const marketName =
        (sel as any).match_markets
          ?.market_templates?.name ?? ''
      const selResult =
        calculateSelectionResult(
          sel.selection,
          marketName,
          resultData
        )
      return {
        id: sel.id,
        slip_id: sel.slip_id,
        result: selResult,
      }
    }
  )

  // Update all selections
  for (const update of selectionUpdates) {
    await supabase
      .from('slip_selections')
      .update({ result: update.result })
      .eq('id', update.id)
  }

  // Settle all affected slips
  const affectedSlipIds = [
    ...new Set(
      selectionUpdates.map(
        (s) => s.slip_id
      )
    ),
  ]

  let settledCount = 0
  const failedSlipIds: string[] = []
  for (const slipId of affectedSlipIds) {
    const { error } = await supabase.rpc(
      'settle_slip',
      { p_slip_id: slipId }
    )
    if (!error) {
      settledCount++
    } else {
      failedSlipIds.push(slipId)
      console.error(`settle_slip failed for slip ${slipId}:`, error)
    }
  }
  if (failedSlipIds.length > 0) {
    // Surface failures in activity log so admins can find and manually resolve stuck slips
    // instead of them silently sitting in a half-settled state with no trace.
    await supabase.from('activity_logs').insert({
      user_id: data.settledBy,
      action: 'slip_settlement_failed',
      details: { match_id: data.matchId, failed_slip_ids: failedSlipIds },
    })
  }

  // Update market statuses
  await supabase
    .from('match_markets')
    .update({ status: 'settled' })
    .eq('match_id', data.matchId)

  // Notify affected bettors
  const { data: settledSlips } =
    await supabase
      .from('slips')
      .select('id, bettor_id, status, net_payout, insurance_payout')
      .in('id', affectedSlipIds)

  if (settledSlips) {
    const notifications = settledSlips
      .filter((s) => s.bettor_id)
      .map((slip) => ({
        to_user_id: slip.bettor_id,
        message:
          slip.status === 'won'
            ? `🎉 You won ETB ${slip.net_payout?.toFixed(2)}! Slip settled.`
            : slip.status === 'near_win'
            ? `🛡️ Insurance applied! ETB ${slip.insurance_payout?.toFixed(2)} credited.`
            : `Your slip has been settled: ${slip.status}`,
        type:
          slip.status === 'won'
            ? 'slip_won'
            : slip.status === 'near_win'
            ? 'slip_won'
            : 'slip_lost',
      }))

    if (notifications.length > 0) {
      for (
        let i = 0;
        i < notifications.length;
        i += 100
      ) {
        await supabase
          .from('notifications')
          .insert(notifications.slice(i, i + 100))
      }
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: data.settledBy,
      action: 'match_result_entered',
      details: {
        match_id: data.matchId,
        score: `${data.ftHome}-${data.ftAway}`,
        slips_settled: settledCount,
        slips_failed: failedSlipIds.length,
      },
    })

  return { success: true, settledCount, failedCount: failedSlipIds.length }
}

// ─── JACKPOT MANAGEMENT ───────────────


export async function updateJackpot(
  jackpotId: string,
  data: {
    name: string
    closesAt: string
    fixedStake: number
    winAllReward: number
    nearWinReward: number
    matches: {
      gameNumber: number
      homeTeam: string
      awayTeam: string
      kickOffTime: string
      homeOdd: number
      drawOdd: number
      awayOdd: number
      leagueId?: string
    }[]
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('jackpots')
    .update({
      name: data.name,
      // closes_at is the single source of truth: betting cutoff AND result-entry unlock time
      closes_at: data.closesAt,
      fixed_stake: data.fixedStake,
      win_all_reward: data.winAllReward,
      near_win_reward: data.nearWinReward,
    })
    .eq('id', jackpotId)
  if (error) return { success: false, error: error.message }
  for (const m of data.matches) {
    await supabase
      .from('jackpot_matches')
      .update({
        home_team: m.homeTeam,
        away_team: m.awayTeam,
        kick_off_time: m.kickOffTime,
        home_odd: m.homeOdd,
        draw_odd: m.drawOdd,
        away_odd: m.awayOdd,
        league_id: m.leagueId || null,
      })
      .eq('jackpot_id', jackpotId)
      .eq('game_number', m.gameNumber)
  }
  return { success: true }
}
export async function createJackpot(data: {
  name: string
  opensAt: string
  closesAt: string
  fixedStake: number
  winAllReward: number
  nearWinReward: number
  matches: {
    gameNumber: number
    homeTeam: string
    awayTeam: string
    kickOffTime: string
    homeOdd: number
    drawOdd: number
    awayOdd: number
    leagueId?: string
  }[]
  createdBy: string
}): Promise<{
  success: boolean
  jackpotId?: string
  error?: string
}> {
  const supabase = await createClient()

  if (data.matches.length !== 12) {
    return {
      success: false,
      error: 'Exactly 12 games required',
    }
  }

  const { data: jackpot, error } =
    await supabase
      .from('jackpots')
      .insert({
        name: data.name,
        status: 'draft',
        fixed_stake: data.fixedStake,
        win_all_reward: data.winAllReward,
        near_win_reward: data.nearWinReward,
        opens_at: data.opensAt,
        // closes_at is the single source of truth: betting cutoff AND result-entry unlock time
        closes_at: data.closesAt,
        created_by: data.createdBy,
      })
      .select('id')
      .single()

  if (error || !jackpot) {
    console.error('Jackpot insert error:', error)
    return {
      success: false,
      error: error?.message ?? 'Failed to create jackpot',
    }
  }

  await supabase
    .from('jackpot_matches')
    .insert(
      data.matches.map((m) => ({
        jackpot_id: jackpot.id,
        game_number: m.gameNumber,
        home_team: m.homeTeam,
        away_team: m.awayTeam,
        kick_off_time: m.kickOffTime,
        home_odd: m.homeOdd,
        draw_odd: m.drawOdd,
        away_odd: m.awayOdd,
        league_id: m.leagueId || null,
        result: 'pending',
      }))
    )

  await supabase.from('activity_logs').insert({
    user_id: data.createdBy,
    action: 'jackpot_created',
    details: { jackpot_id: jackpot.id, name: data.name, fixed_stake: data.fixedStake },
  })

  return { success: true, jackpotId: jackpot.id }
}

export async function publishJackpot(
  jackpotId: string,
  adminId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  await supabase
    .from('jackpots')
    .update({ status: 'open' })
    .eq('id', jackpotId)

  // Broadcast to all users
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('status', 'active')
    .in('role', ['bettor', 'cashier', 'agent'])

  if (users && users.length > 0) {
    const notifications = users.map((u) => ({
      to_user_id: u.id,
      message:
        '🏆 Weekend Jackpot is now OPEN! Pick 12 matches to win ETB 250,000! Entry: ETB 50',
      type: 'jackpot_open',
      priority: 'normal' as const,
    }))

    for (
      let i = 0;
      i < notifications.length;
      i += 100
    ) {
      await supabase
        .from('notifications')
        .insert(notifications.slice(i, i + 100))
    }
  }

  await supabase.from('activity_logs').insert({
    user_id: adminId,
    action: 'jackpot_published',
    details: { jackpot_id: jackpotId },
  })

  return { success: true }
}

export async function settleJackpot(
  jackpotId: string,
  results: {
    gameNumber: number
    result: 'home' | 'draw' | 'away'
  }[],
  adminId: string
): Promise<{
  success: boolean
  winners?: number
  nearWins?: number
}> {
  const supabase = await createClient()

  // Update match results
  for (const r of results) {
    await supabase
      .from('jackpot_matches')
      .update({ result: r.result })
      .eq('jackpot_id', jackpotId)
      .eq('game_number', r.gameNumber)
  }

  // Get all jackpot slips
  const { data: slips } = await supabase
    .from('jackpot_slips')
    .select(
      `
      id,
      bettor_id,
      placed_by,
      stake,
      jackpot_slip_selections (
        game_number,
        selection
      )
    `
    )
    .eq('jackpot_id', jackpotId)
    .eq('status', 'pending')

  if (!slips) {
    return { success: true, winners: 0, nearWins: 0 }
  }

  const resultMap = new Map(
    results.map((r) => [r.gameNumber, r.result])
  )

  let winners = 0
  let nearWins = 0

  const { data: jackpot } = await supabase
    .from('jackpots')
    .select('win_all_reward, near_win_reward')
    .eq('id', jackpotId)
    .single()

  // Tax % for insured (near-win) jackpot rewards — same setting used for regular slip wins
  const { data: taxSetting } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'winning_tax_percent')
    .single()
  const taxPct = parseFloat(taxSetting?.value ?? '15') || 15

  // Platform admin profile that receives the tax cut
  const { data: platformAdmin } = await supabase
    .from('profiles')
    .select('id, credit_balance')
    .eq('role', 'admin')
    .limit(1)
    .single()

  for (const slip of slips) {
    const selections =
      (slip as any).jackpot_slip_selections ?? []
    let correctCount = 0

    for (const sel of selections) {
      const expected = resultMap.get(
        sel.game_number
      )
      if (expected === sel.selection) {
        correctCount++
      }
    }

    // Update selection results
    for (const sel of selections) {
      const expected = resultMap.get(
        sel.game_number
      )
      await supabase
        .from('jackpot_slip_selections')
        .update({
          result:
            expected === sel.selection
              ? 'correct'
              : 'wrong',
        })
        .eq('jackpot_slip_id', slip.id)
        .eq('game_number', sel.game_number)
    }

    const isWin = correctCount === 12
    const isNearWin = correctCount === 11
    const grossReward = isWin
      ? (jackpot?.win_all_reward ?? 250000)
      : isNearWin
      ? (jackpot?.near_win_reward ?? 25000)
      : 0
    // Both full jackpot wins and insured (near-win) rewards are taxed.
    const rewardTax = (isWin || isNearWin)
      ? Math.round(grossReward * (taxPct / 100) * 100) / 100
      : 0
    const reward = grossReward - rewardTax
    const status = isWin
      ? 'won'
      : isNearWin
      ? 'near_win'
      : 'lost'

    if (isWin) winners++
    if (isNearWin) nearWins++

    await supabase
      .from('jackpot_slips')
      .update({
        status,
        correct_count: correctCount,
        reward_amount: reward,
        reward_tax: rewardTax,
        is_insured: isNearWin,
      })
      .eq('id', slip.id)

    // Credit reward — ONLY auto-credit when the bettor is a real registered
    // bettor placing their own bet online. For cashier/agent walk-in slips
    // (bettor_id === placed_by, role is cashier/agent), the payout happens
    // only when the customer redeems the slip via redeemJackpotWinningSlip,
    // which deducts from the cashier's own float instead.
    if (reward > 0 && slip.bettor_id) {
      const { data: bettor } = await supabase
        .from('profiles')
        .select('credit_balance, role')
        .eq('id', slip.bettor_id)
        .single()

      const isWalkInPlacement = slip.bettor_id === slip.placed_by && bettor?.role !== 'bettor'

      if (bettor && !isWalkInPlacement) {
        await supabase
          .from('profiles')
          .update({
            credit_balance:
              bettor.credit_balance + reward,
          })
          .eq('id', slip.bettor_id)
      }

      // Credit insured-tier tax to the platform admin
      if (rewardTax > 0 && platformAdmin) {
        await supabase
          .from('profiles')
          .update({
            credit_balance: platformAdmin.credit_balance + rewardTax,
          })
          .eq('id', platformAdmin.id)
        platformAdmin.credit_balance += rewardTax
      }

      if (bettor) {
        await supabase
          .from('notifications')
          .insert({
            to_user_id: slip.bettor_id,
            message: isWin
              ? `🏆🏆 JACKPOT WINNER! All 12 correct! ETB ${reward.toLocaleString()} credited (after ${taxPct}% tax)!`
              : `🥈 So close! 11/12 correct. ETB ${reward.toLocaleString()} credited (after ${taxPct}% tax)!`,
            type: isWin
              ? 'jackpot_won'
              : 'jackpot_won',
            priority: isWin
              ? 'urgent'
              : 'normal',
          })
      }
    } else if (slip.bettor_id) {
      await supabase
        .from('notifications')
        .insert({
          to_user_id: slip.bettor_id,
          message: `Jackpot results: ${correctCount}/12 correct. Better luck next weekend!`,
          type: 'broadcast',
        })
    }
  }

  // Close jackpot
  await supabase
    .from('jackpots')
    .update({ status: 'settled' })
    .eq('id', jackpotId)

  await supabase.from('activity_logs').insert({
    user_id: adminId,
    action: 'jackpot_settled',
    details: {
      jackpot_id: jackpotId,
      winners,
      near_wins: nearWins,
    },
  })

  return { success: true, winners, nearWins }
}

export async function getAllJackpots() {
  const supabase = await createClient()

  // Auto-close any 'open' jackpot whose betting window has passed.
  // This makes the close happen the moment closes_at is reached, without a cron job —
  // it self-heals on every admin page load. Result entry already unlocks by time check
  // alone, so this only updates the status field for accuracy/display purposes.
  await supabase
    .from('jackpots')
    .update({ status: 'closed' })
    .eq('status', 'open')
    .lt('closes_at', new Date().toISOString())

  const { data } = await supabase
    .from('jackpots')
    .select(
      `
      *,
      jackpot_matches (*)
    `
    )
    .order('created_at', { ascending: false })
    .limit(10)

  return data ?? []
}
export async function addPlayerToScorers(
  matchId: string,
  playerName: string,
  team: 'home' | 'away',
  odd: number,
  addedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Insert player
  // Ensure scorer markets exist for this match
  const { data: scorerTemplates } = await supabase
    .from('market_templates')
    .select('id, name')
    .in('name', ['Anytime Scorer', 'First Scorer', 'Last Scorer'])

  if (scorerTemplates?.length) {
    for (const tmpl of scorerTemplates) {
      const { data: existing } = await supabase
        .from('match_markets')
        .select('id')
        .eq('match_id', matchId)
        .eq('market_template_id', tmpl.id)
        .single()

      if (!existing) {
        await supabase.from('match_markets').insert({
          match_id: matchId,
          market_template_id: tmpl.id,
          is_enabled: true,
          status: 'open',
        })
      }
    }
  }

  const { error: playerError } = await supabase
    .from('match_players')
    .insert({ match_id: matchId, player_name: playerName, team, added_by: addedBy })

  if (playerError) return { success: false, error: playerError.message }

  // Get scorer market IDs
  const { data: markets } = await supabase
    .from('match_markets')
    .select('id, market_templates(name)')
    .eq('match_id', matchId)
    .in('market_template_id',
      (await supabase.from('market_templates')
        .select('id')
        .in('name', ['Anytime Scorer', 'First Scorer', 'Last Scorer'])
      ).data?.map((t: any) => t.id) ?? []
    )

  if (!markets?.length) return { success: false, error: 'No scorer markets found' }

  // Insert odds for each scorer market
  const oddsToInsert = markets.map((mm: any) => ({
    match_market_id: mm.id,
    selection: playerName,
    odd_value: odd,
    original_odd: odd,
    last_updated_by: addedBy,
  }))

  const { error: oddsError } = await supabase
    .from('match_market_odds')
    .insert(oddsToInsert)

  if (oddsError) return { success: false, error: oddsError.message }

  return { success: true }
}

export async function removePlayerFromScorers(
  matchId: string,
  playerId: string,
  playerName: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  await supabase.from('match_players').delete().eq('id', playerId)

  const { data: markets } = await supabase
    .from('match_markets')
    .select('id')
    .eq('match_id', matchId)
    .in('market_template_id',
      (await supabase.from('market_templates')
        .select('id')
        .in('name', ['Anytime Scorer', 'First Scorer', 'Last Scorer'])
      ).data?.map((t: any) => t.id) ?? []
    )

  if (markets?.length) {
    for (const mm of markets) {
      await supabase.from('match_market_odds')
        .delete()
        .eq('match_market_id', mm.id)
        .eq('selection', playerName)
    }
  }

  return { success: true }
}

export async function deleteMatches(
  matchIds: string[],
  deletedBy: string
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  const supabase = await createClient()

  if (!matchIds.length) return { success: false, error: 'No matches selected' }

  // Delete related data first
  for (const matchId of matchIds) {
    // Delete slip selections related to this match
    await supabase.from('slip_selections').delete().eq('match_id', matchId)
    // Delete match market odds
    const { data: markets } = await supabase.from('match_markets').select('id').eq('match_id', matchId)
    if (markets?.length) {
      for (const m of markets) {
        await supabase.from('match_market_odds').delete().eq('match_market_id', m.id)
      }
    }
    await supabase.from('match_markets').delete().eq('match_id', matchId)
    await supabase.from('match_players').delete().eq('match_id', matchId)
    await supabase.from('match_results').delete().eq('match_id', matchId)
  }

  const { error } = await supabase.from('matches').delete().in('id', matchIds)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs').insert({
    user_id: deletedBy,
    action: 'matches_deleted',
    details: { match_ids: matchIds, count: matchIds.length },
  })

  return { success: true, deleted: matchIds.length }
}

export async function deleteJackpot(
  jackpotId: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: jp } = await supabase
    .from('jackpots')
    .select('name')
    .eq('id', jackpotId)
    .single()

  // Delete related data first
  await supabase
    .from('jackpot_slip_selections')
    .delete()
    .in('jackpot_slip_id',
      (await supabase
        .from('jackpot_slips')
        .select('id')
        .eq('jackpot_id', jackpotId)
      ).data?.map((s: any) => s.id) ?? []
    )

  await supabase
    .from('jackpot_slips')
    .delete()
    .eq('jackpot_id', jackpotId)

  await supabase
    .from('jackpot_matches')
    .delete()
    .eq('jackpot_id', jackpotId)

  const { error } = await supabase
    .from('jackpots')
    .delete()
    .eq('id', jackpotId)

  if (error) return { success: false, error: error.message }
  if (adminId) {
    await supabase.from('activity_logs').insert({
      user_id: adminId,
      action: 'jackpot_deleted',
      details: { jackpot_id: jackpotId, name: jp?.name ?? null },
    })
  }

  return { success: true }
}
