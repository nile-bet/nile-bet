export type UserRole =
  | 'admin'
  | 'agent'
  | 'cashier'
  | 'bettor'

export type SlipStatus =
  | 'pending'
  | 'won'
  | 'lost'
  | 'cancelled'
  | 'near_win'
  | 'paid'

export type MatchStatus =
  | 'pending'
  | 'upcoming'
  | 'closed'
  | 'finished'
  | 'cancelled'
  | 'postponed'

export type CouponType =
  | 'topup'
  | 'withdrawal'

export type CouponStatus =
  | 'pending'
  | 'redeemed'
  | 'expired'
  | 'cancelled'

export type JackpotStatus =
  | 'draft'
  | 'open'
  | 'closed'
  | 'settled'

export type TransactionType =
  | 'credit_assign'
  | 'coupon_topup'
  | 'coupon_withdrawal'
  | 'bet_placed'
  | 'payout'
  | 'tax'
  | 'refund'
  | 'insurance'
  | 'welcome_bonus'
  | 'jackpot_win'
  | 'jackpot_near_win'

export type MarketResult =
  | 'pending'
  | 'won'
  | 'lost'
  | 'void'

export type NotificationPriority =
  | 'normal'
  | 'urgent'

export interface Profile {
  id: string
  username: string
  role: UserRole
  credit_balance: number
  reserved_balance: number
  status: 'active' | 'suspended' | 'deleted'
  created_by: string | null
  login_attempts: number
  locked_until: string | null
  last_login: string | null
  welcome_bonus_claimed: boolean
  created_at: string
  updated_at: string
}

export interface Country {
  id: string
  name: string
  flag_emoji: string
  display_order: number
  created_by: string | null
  created_at: string
}

export interface League {
  id: string
  name: string
  country_id: string
  is_top_league: boolean
  display_order: number
  created_by: string | null
  created_at: string
}

export interface Match {
  id: string
  home_team: string
  away_team: string
  league_id: string
  kick_off_time: string
  status: MatchStatus
  is_featured: boolean
  featured_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_name: string
  team: 'home' | 'away'
  added_by: string | null
  created_at: string
}

export interface MarketCategory {
  id: string
  name: string
  display_order: number
}

export interface MarketTemplate {
  id: string
  category_id: string
  name: string
  selections: string[]
  is_dynamic: boolean
  display_order: number
}

export interface MatchMarket {
  id: string
  match_id: string
  market_template_id: string
  is_enabled: boolean
  status: 'open' | 'closed' | 'settled' | 'void'
  created_at: string
}

export interface MatchMarketOdd {
  id: string
  match_market_id: string
  selection: string
  odd_value: number
  original_odd: number
  last_updated_by: string | null
  updated_at: string
}

export interface Slip {
  id: string
  slip_id: string
  bettor_id: string | null
  placed_by: string | null
  copied_from_slip_id: string | null
  stake: number
  total_odds: number
  max_payout: number
  winning_tax: number
  net_payout: number
  status: SlipStatus
  correct_count: number
  insurance_applied: boolean
  insurance_payout: number
  cancellation_deadline: string | null
  is_anonymous: boolean
  created_at: string
  updated_at: string
}

export interface SlipSelection {
  id: string
  slip_id: string
  match_id: string | null
  match_market_id: string | null
  selection: string
  odd_at_placement: number
  result: MarketResult
  created_at: string
}

export interface MatchResult {
  id: string
  match_id: string
  ht_home: number
  ht_away: number
  ft_home: number
  ft_away: number
  home_corners: number
  away_corners: number
  home_cards: number
  away_cards: number
  minute_scores: Record<string, {
    home: number
    away: number
  }>
  scorers: {
    firstScorer?: string
    lastScorer?: string
    goalscorers?: string[]
  }
  specials: Record<string, boolean | string>
  settled_at: string | null
  settled_by: string | null
}

export interface Coupon {
  id: string
  code: string
  bettor_id: string
  amount: number
  type: CouponType
  status: CouponStatus
  redeemed_by: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

export interface CreditAssignment {
  id: string
  from_user_id: string | null
  to_user_id: string | null
  amount: number
  note: string | null
  created_at: string
}

export interface CreditRequest {
  id: string
  requester_id: string
  to_user_id: string | null
  amount: number
  note: string | null
  status: 'pending' | 'approved' | 'declined'
  admin_note: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  from_user_id: string | null
  to_user_id: string | null
  amount: number
  type: TransactionType
  reference_id: string | null
  note: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface Notification {
  id: string
  to_user_id: string
  from_user_id: string | null
  message: string
  type: string
  priority: NotificationPriority
  is_read: boolean
  created_at: string
}

export interface PlatformSetting {
  id: string
  key: string
  value: string
  updated_by: string | null
  updated_at: string
}

export interface Jackpot {
  id: string
  name: string
  status: JackpotStatus
  fixed_stake: number
  win_all_reward: number
  near_win_reward: number
  opens_at: string | null
  closes_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface JackpotMatch {
  id: string
  jackpot_id: string
  game_number: number
  home_team: string
  away_team: string
  kick_off_time: string
  home_odd: number
  draw_odd: number
  away_odd: number
  result: 'home' | 'draw' | 'away' | 'pending'
  league_id?: string | null
  leagues?: { name: string; countries?: { name: string; flag_emoji: string } } | null
  created_at: string
}

export interface JackpotSlip {
  id: string
  slip_id: string
  jackpot_id: string | null
  bettor_id: string | null
  placed_by: string | null
  stake: number
  status: 'pending' | 'won' | 'near_win' | 'lost'
  correct_count: number
  reward_amount: number
  is_anonymous: boolean
  created_at: string
  updated_at: string
}

export interface JackpotSlipSelection {
  id: string
  jackpot_slip_id: string
  jackpot_match_id: string | null
  game_number: number
  selection: 'home' | 'draw' | 'away'
  result: 'pending' | 'correct' | 'wrong'
}

export interface BroadcastMessage {
  id: string
  message: string
  priority: NotificationPriority
  send_to_bettors: boolean
  send_to_cashiers: boolean
  send_to_agents: boolean
  sent_by: string | null
  created_at: string
}

// ─── Composite types ───────────────────

export interface BetSlipSelection {
  matchId: string
  matchMarketId: string
  homeTeam: string
  awayTeam: string
  leagueName: string
  countryFlag: string
  marketName: string
  categoryName: string
  selection: string
  odd: number
  kickOffTime: string
  matchStatus: MatchStatus
}

export interface SlipCalculation {
  stake: number
  totalOdds: number
  maxPayout: number
  winningTax: number
  netPayout: number
}

export interface PlatformSettings {
  minStake: number
  maxStakePerSlip: number
  maxStakePerMarket: number
  maxOddPerSelection: number
  maxTotalOdds: number
  minSelections: number
  winningTaxPercent: number
  maxPayout: number
  maxInstantRedemption: number
  cashierProfitPercent: number
  agentProfitPercent: number
  topupExpiryHours: number
  withdrawalExpiryHours: number
  loginAttemptLimit: number
  sessionTimeoutHours: number
  cancellationWindowMins: number
  insuranceMinSelections: number
  insurance1LossPct: number
  insurance2LossPct: number
  insurance3LossRefund: boolean
  welcomeBonusEnabled: boolean
  welcomeBonusMinTopup: number
  welcomeBonusAmount: number
  jackpotFixedStake: number
  jackpotWinAllReward: number
  jackpotNearWinReward: number
}

export interface MatchWithLeague extends Match {
  league_name: string
  country_name: string
  flag_emoji: string
  country_id: string
}

export interface CountryWithLeagues
  extends Country {
  leagues: League[]
}

export interface LeagueWithCountry
  extends League {
  countries: Country
}

export interface SlipWithSelections
  extends Slip {
  slip_selections: (SlipSelection & {
    matches?: {
      home_team: string
      away_team: string
      status: MatchStatus
    }
    match_markets?: {
      market_templates?: {
        name: string
        market_categories?: {
          name: string
        }
      }
    }
  })[]
}

export interface MatchWithMarkets
  extends Match {
  leagues: League & {
    countries: Country
  }
  match_markets: (MatchMarket & {
    market_templates: MarketTemplate & {
      market_categories: MarketCategory
    }
    match_market_odds: MatchMarketOdd[]
  })[]
  match_players: MatchPlayer[]
}

export interface JackpotWithMatches
  extends Jackpot {
  jackpot_matches: JackpotMatch[]
}

export interface ProfileWithStats
  extends Profile {
  cashiers_count?: number
  bettors_count?: number
  total_revenue?: number
  active_slips?: number
  agent_name?: string
  cashier_name?: string
}