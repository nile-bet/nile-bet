'use client'

import { useState, useEffect } from 'react'
import {
  getCashierDashboardStats,
  getCashierPayoutsReport,
  getRecentSlipsCashier,
  generateCashierReportData,
} from '@/lib/actions/cashier'
import { StatsCard }
  from '@/components/shared/StatsCard'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import {
  SkeletonStatCard,
} from '@/components/shared/SkeletonCard'
import {
  formatETB,
  formatDate,
} from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Ticket,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter'

export default function CashierDashboard() {
  const { user } = useAuthStore()
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'lifetime' })
  const [stats, setStats] =
    useState<any>(null)
  const [payouts, setPayouts] =
    useState<any>(null)
  const [recentSlips, setRecentSlips] =
    useState<any[]>([])
  const [slipStatus, setSlipStatus] =
    useState('all')
  const [slipCategory, setSlipCategory] =
    useState<'all' | 'regular' | 'jackpot'>('all')
  const [loading, setLoading] =
    useState(true)
  const [jackpotExpanded, setJackpotExpanded] = useState(false)

  useEffect(() => {
    if (user) loadData()
  }, [user, dateFilter])

  useEffect(() => {
    if (user) loadRecentSlips()
  }, [user, slipStatus])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    const filter = dateFilter

    const [statsData, payoutsData] =
      await Promise.all([
        getCashierDashboardStats(
          user.id,
          filter
        ),
        getCashierPayoutsReport(
          user.id,
          filter
        ),
      ])

    setStats(statsData)
    setPayouts(payoutsData)
    setLoading(false)
  }

  const loadRecentSlips = async () => {
    if (!user) return
    const data = await getRecentSlipsCashier(
      user.id,
      slipStatus === 'all'
        ? undefined
        : slipStatus
    )
    setRecentSlips(data)
  }

  const handleExportExcel = async () => {
    if (!user) return

    const reportData =
      await generateCashierReportData(user.id, dateFilter)

    const wb = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      {
        Metric: 'Wallet Balance',
        Value: reportData.stats.walletBalance,
      },
      {
        Metric: 'Total Collected',
        Value: reportData.stats.totalCollected,
      },
      {
        Metric: 'Total Paid Out',
        Value: reportData.stats.totalWon,
      },
      {
        Metric: 'Gross Profit/Loss',
        Value:
          reportData.stats.grossProfitLoss,
      },
      {
        Metric: 'Cashier Share (40%)',
        Value: reportData.stats.cashierProfit,
      },
      {
        Metric: 'Agent Payable (60%)',
        Value: reportData.stats.agentPayable,
      },
      {
        Metric: 'Total Slips',
        Value: reportData.stats.totalSlips,
      },
      {
        Metric: 'Won Slips',
        Value: reportData.stats.wonSlips,
      },
      {
        Metric: 'Lost Slips',
        Value: reportData.stats.lostSlips,
      },
    ]

    const summarySheet =
      XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(
      wb,
      summarySheet,
      'Summary'
    )

    // Payouts sheet
    const payoutsRows = (
      reportData.payouts.slips ?? []
    ).map((s: any) => ({
      'Slip ID': s.slip_id,
      Bettor: s.is_anonymous
        ? 'Anonymous'
        : s.bettor?.username ?? '—',
      Stake: s.stake,
      Odds: s.total_odds,
      'Gross Win': s.max_payout,
      'Tax (15%)': s.winning_tax,
      'Net Payout': s.net_payout,
      Status: s.status,
      Date: formatDate(s.created_at),
    }))

    const payoutsSheet =
      XLSX.utils.json_to_sheet(payoutsRows)
    XLSX.utils.book_append_sheet(
      wb,
      payoutsSheet,
      'Payouts'
    )

    XLSX.writeFile(
      wb,
      `cashier-report-${dateFilter.type}.xlsx`
    )
  }

  const isLowBalance =
    (user?.credit_balance ?? 0) < 1000


  const recentSlipsColumns = [
    {
      key: 'slip_id',
      label: 'Slip ID',
      render: (v: any, row: any) => (
        <div>
          <span className="text-gold font-mono text-xs">
            {row.is_jackpot && '🏆 '}#{v}
          </span>
          {row.is_jackpot && row.jackpot_name && (
            <span className="text-gold/50 text-[9px] block">{row.jackpot_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'bettor',
      label: 'Bettor',
      render: (v: any, row: any) => (
        <span className="text-white/60 text-xs">
          {row.is_anonymous
            ? 'Anonymous'
            : `@${v?.username ?? '—'}`}
        </span>
      ),
    },
    {
      key: 'stake',
      label: 'Stake',
      render: (v: any) => formatETB(v),
    },
    {
      key: 'total_odds',
      label: 'Odds',
      render: (v: any, row: any) => (
        <span className="text-white/60 font-mono text-xs">
          {row.is_jackpot ? '—' : v?.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'net_payout',
      label: 'Potential Win',
      render: (v: any) => (
        <span className="text-gold font-mono text-xs">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: any, row: any) => {
        if (row.payout_status) {
          // won/near_win/paid slips → show redeemed/pending + insured badge
          return row.payout_status === 'redeemed' ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-nile-blue-light border-nile-blue-light/25 bg-nile-blue-light/15">
              {row.is_insured ? '🛡️ PAID' : '✓ PAID'}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-nile-orange border-nile-orange/25 bg-nile-orange/12">
              {row.is_insured ? '🛡️ PENDING' : '⏳ PENDING'}
            </span>
          )
        }
        return <StatusBadge status={v} type="slip" />
      },
    },
    {
      key: 'redeemed_at',
      label: 'Redeemed At',
      render: (v: any) => (
        v ? (
          <span className="text-nile-success/80 text-[10px] font-medium">
            {new Date(v).toLocaleString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-white/20 text-[10px]">—</span>
        )
      ),
    },
    {
      key: 'created_at',
      label: 'Time',
      render: (v: any) => (
        <span className="text-white/40 text-xs">
          {formatDate(v)}
        </span>
      ),
    },
  ]

  return (
    <div className="px-35 py-3 space-y-2">
      {/* Low balance banner */}
      {!loading && isLowBalance && (
        <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-nile-danger font-semibold text-sm">
              ⚠️ Low Balance:{' '}
              {formatETB(
                user?.credit_balance ?? 0
              )}
            </p>
            <p className="text-white/60 text-xs">
              Request credits from your agent
            </p>
          </div>
          <a
            href="/cashier-credits"
            className="bg-gold text-charcoal text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gold-light"
          >
            Request Credits
          </a>
        </div>
      )}

      {/* Header + Date filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <DateRangeFilter
          value={dateFilter}
          onChange={setDateFilter}
          onExport={handleExportExcel}
          exportLoading={loading}
        />
      </div>

      {/* Data banner */}
      {!loading && stats && (
        <div className="border border-gold/10 rounded-lg px-3 py-1.5 text-[11px] text-white/40 flex items-center gap-2" style={{background:'rgba(37,46,109,0.15)'}}>
          <span>📅</span>
          <span>{dateFilter.type === 'custom' ? `${dateFilter.startDate?.slice(0,10)} → ${dateFilter.endDate?.slice(0,10)}` : dateFilter.type}</span>
          <span className="text-white/20">·</span>
          <span>{stats.totalSlips} slips</span>
        </div>
      )}

      {/* ── ROW 1: 4 Main Stats ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-slate-dark border border-gold/30 rounded-xl p-2.5">
            <div className="flex justify-between items-start mb-1">
              <p className="text-white/60 text-sm">
                Wallet Balance
              </p>
              <div className="p-2 bg-gold/10 rounded-lg">
                <Wallet className="w-5 h-5 text-gold" />
              </div>
            </div>
            <p className="text-gold font-mono text-xl font-bold">
              {formatETB(
                stats?.walletBalance ?? 0
              )}
            </p>
            <p className="text-white/40 text-xs mt-1">
              Current balance
            </p>
          </div>

          <StatsCard
            title="Total Collected"
            value={formatETB(
              stats?.totalCollected ?? 0
            )}
            subtitle="Staked by bettors"
            icon={DollarSign}
            variant="gold"
          />

          <StatsCard
            title="Gross Profit/Loss"
            value={formatETB(
              stats?.grossProfitLoss ?? 0
            )}
            subtitle="Collected - Paid Out"
            icon={TrendingUp}
            variant={
              (stats?.grossProfitLoss ?? 0) >=
              0
                ? 'success'
                : 'danger'
            }
          />

          <StatsCard
            title="Pending Liability"
            value={formatETB(
              stats?.pendingLiability ?? 0
            )}
            subtitle="If all pending win"
            icon={Clock}
            variant={
              (stats?.pendingLiability ?? 0) >
              0
                ? 'danger'
                : 'default'
            }
          />
        </div>
      )}
      {/* ── ROW 2: 6 Slip Status Mini Cards ── */}
      {!loading && stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {/* Total */}
          <div className="bg-slate-dark border border-nile-blue/40 rounded-lg p-1.5 text-center">
            <Ticket className="w-4 h-4 text-white/50 mx-auto mb-0.5" />
            <p className="text-lg font-bold text-white font-mono">{stats.totalSlips}</p>
            <p className="text-white/50 text-xs">Total</p>
            <p className="text-white/25 text-[10px]">{stats.regularSlips ?? 0} reg · {stats.jackpotSlipsCount ?? 0} jp</p>
          </div>
          {/* Won */}
          <div className="bg-nile-success/10 border border-nile-success/30 rounded-lg p-1.5 text-center">
            <CheckCircle className="w-4 h-4 text-nile-success mx-auto mb-0.5" />
            <p className="text-lg font-bold text-nile-success font-mono">{stats.wonSlips}</p>
            <p className="text-white/50 text-xs">Won</p>
            <div className="mt-1 space-y-0.5">
              <p className="text-nile-blue-light text-[10px] font-medium">✓ {stats.wonRedeemed ?? 0} redeemed</p>
              <p className="text-nile-orange text-[10px] font-medium">⏳ {stats.wonPending ?? 0} pending</p>
            </div>
          </div>
          {/* Insured */}
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-1.5 text-center">
            <span className="text-base block mb-0.5">🛡️</span>
            <p className="text-lg font-bold text-gold font-mono">{stats.insuredSlips}</p>
            <p className="text-white/50 text-xs">Insured</p>
            <div className="mt-1 space-y-0.5">
              <p className="text-nile-blue-light text-[10px] font-medium">✓ {stats.insuredRedeemed ?? 0} redeemed</p>
              <p className="text-nile-orange text-[10px] font-medium">⏳ {stats.insuredPending ?? 0} pending</p>
            </div>
          </div>
          {/* Lost */}
          <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-1.5 text-center">
            <XCircle className="w-4 h-4 text-nile-danger mx-auto mb-0.5" />
            <p className="text-lg font-bold text-nile-danger font-mono">{stats.lostSlips}</p>
            <p className="text-white/50 text-xs">Lost</p>
            <p className="text-white/25 text-[10px]">{stats.lostRegular ?? 0} reg · {stats.lostJackpot ?? 0} jp</p>
          </div>
          {/* Pending */}
          <div className="bg-nile-blue/20 border border-nile-blue/30 rounded-lg p-1.5 text-center">
            <Clock className="w-4 h-4 text-gold mx-auto mb-0.5" />
            <p className="text-lg font-bold text-gold font-mono">{stats.pendingSlips}</p>
            <p className="text-white/50 text-xs">Pending</p>
            <p className="text-white/25 text-[10px]">{stats.pendingRegular ?? 0} reg · {stats.pendingJackpot ?? 0} jp</p>
          </div>
          {/* Cancelled */}
          <div className="bg-nile-blue/10 border border-nile-blue/20 rounded-lg p-1.5 text-center">
            <RefreshCw className="w-4 h-4 text-nile-blue-light mx-auto mb-0.5" />
            <p className="text-lg font-bold text-nile-blue-light font-mono">{stats.cancelledSlips}</p>
            <p className="text-white/50 text-xs">Cancelled</p>
            <p className="text-white/25 text-[10px]">voided slips</p>
          </div>
        </div>
      )}

      {/* ── ROW 3: User Top-ups ── */}
      {!loading && stats && (
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-3 flex items-center gap-3">
          <div className="p-3 bg-nile-blue/20 rounded-lg">
            <ArrowUpRight className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-white/60 text-sm">
              User Top-ups Processed
            </p>
            <p className="text-gold font-mono text-xl font-bold">
              {formatETB(stats.userTopups)}
            </p>
            <p className="text-white/40 text-xs">
              {stats.topupTransactions}{' '}
              transactions
            </p>
          </div>
        </div>
      )}

      {/* ── ROW 3b: Jackpot Status (collapsible) ── */}
      {!loading && stats && (
        <div className="bg-slate-dark border border-gold/20 rounded-xl overflow-hidden">
          <button
            onClick={() => setJackpotExpanded(!jackpotExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-gold/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gold/10 rounded-lg">
                🏆
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Jackpot Status</p>
                <p className="text-white/40 text-xs">
                  {stats.jackpot?.total ?? 0} jackpot {stats.jackpot?.total === 1 ? 'slip' : 'slips'} placed
                </p>
              </div>
            </div>
            <span className="text-gold text-sm">{jackpotExpanded ? '▲ Hide' : '▼ Expand'}</span>
          </button>
          {jackpotExpanded && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 pt-0">
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-white font-mono text-lg font-bold">{stats.jackpot?.total ?? 0}</p>
                <p className="text-white/50 text-xs">Total</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-success font-mono text-lg font-bold">{stats.jackpot?.won ?? 0}</p>
                <p className="text-white/50 text-xs">Won</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-orange font-mono text-lg font-bold">{stats.jackpot?.pending ?? 0}</p>
                <p className="text-white/50 text-xs">Pending</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-gold font-mono text-lg font-bold">{stats.jackpot?.insured ?? 0}</p>
                <p className="text-white/50 text-xs">Insured (Near Win)</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-danger font-mono text-lg font-bold">{stats.jackpot?.lost ?? 0}</p>
                <p className="text-white/50 text-xs">Lost</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-white/60 font-mono text-lg font-bold">{stats.jackpot?.inProgress ?? 0}</p>
                <p className="text-white/50 text-xs">In Progress</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-success font-mono text-lg font-bold">{formatETB(stats.jackpot?.wonTotal ?? 0)}</p>
                <p className="text-white/50 text-xs">Won Total</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ROW 4: Account + Net Balance ── */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-nile-blue to-charcoal border border-gold/30 rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">
                  Account (Staked + Wallet)
                </p>
                <p className="text-white font-mono text-xl font-bold mt-1">
                  {formatETB(
                    stats.accountTotal
                  )}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Wallet:{' '}
                  {formatETB(
                    stats.walletBalance
                  )}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-gold/40" />
            </div>
          </div>

          <div
            className={cn(
              'border rounded-xl p-3',
              (stats.grossProfitLoss ?? 0) >= 0
                ? 'bg-nile-success/10 border-nile-success/30'
                : 'bg-nile-danger/10 border-nile-danger/30'
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">
                  Net Balance
                </p>
                <p
                  className={cn(
                    'font-mono text-xl font-bold mt-1',
                    (stats.grossProfitLoss ?? 0) >= 0
                      ? 'text-nile-success'
                      : 'text-nile-danger'
                  )}
                >
                  {(stats.grossProfitLoss ?? 0) >= 0 ? '+' : ''}
                  {formatETB(stats.grossProfitLoss)}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Paid out:{' '}
                  {formatETB(stats.totalWon)}
                </p>
              </div>
              <TrendingUp
                className={cn(
                  'w-8 h-8',
                  (stats.grossProfitLoss ?? 0) >= 0
                    ? 'text-nile-success/40'
                    : 'text-nile-danger/40'
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 5: Profit Split ── */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={cn(
              'border rounded-xl p-3',
              (stats.cashierProfit ?? 0) >= 0
                ? 'bg-nile-success/10 border-nile-success/20'
                : 'bg-nile-danger/10 border-nile-danger/20'
            )}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">
                  Cashier Profit (40%)
                </p>
                <p
                  className={cn(
                    'font-mono text-xl font-bold mt-1',
                    (stats.cashierProfit ?? 0) >= 0
                      ? 'text-nile-success'
                      : 'text-nile-danger'
                  )}
                >
                  {(stats.cashierProfit ?? 0) >= 0 ? '+' : ''}
                  {formatETB(stats.cashierProfit)}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Your share of profit
                </p>
              </div>
              <Wallet className={cn('w-6 h-6', (stats.cashierProfit ?? 0) >= 0 ? 'text-nile-success/40' : 'text-nile-danger/40')} />
            </div>
          </div>

          <div className={cn(
              'border rounded-xl p-3',
              (stats.agentPayable ?? 0) >= 0
                ? 'bg-nile-danger/10 border-nile-danger/20'
                : 'bg-nile-success/10 border-nile-success/20'
            )}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">
                  Agent Payable (60%)
                </p>
                <p
                  className={cn(
                    'font-mono text-xl font-bold mt-1',
                    (stats.agentPayable ?? 0) >= 0
                      ? 'text-nile-danger'
                      : 'text-nile-success'
                  )}
                >
                  {formatETB(stats.agentPayable)}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {(stats.agentPayable ?? 0) >= 0 ? 'To pay your agent' : 'Agent owes you'}
                </p>
              </div>
              <ArrowUpRight className={cn('w-6 h-6', (stats.agentPayable ?? 0) >= 0 ? 'text-nile-danger/40' : 'text-nile-success/40')} />
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 6: Payouts Report ── */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-nile-blue/20 flex items-center gap-2.5">
          <div className="p-1.5 bg-gold/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-gold" />
          </div>
          <h3 className="font-semibold text-white text-sm tracking-wide">Payouts Report</h3>
          {payouts && <span className="ml-auto text-white/30 text-xs">{payouts.slips?.length ?? 0} entries</span>}
        </div>

        {/* 4 summary cards */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 border-b border-nile-blue/20">
            {/* Total Won */}
            <div className="rounded-xl p-2.5" style={{background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.18)'}}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Total Won</span>
                <div className="p-1 rounded-md" style={{background:'rgba(34,197,94,0.15)'}}>
                  <CheckCircle className="w-3.5 h-3.5 text-nile-success" />
                </div>
              </div>
              <p className="text-nile-success font-mono text-xl font-bold leading-none">{formatETB(payouts?.totals?.totalWonNet ?? stats.totalWon ?? 0)}</p>
              <div className="mt-1.5 pt-1.5 border-t border-nile-success/10">
                <p className="text-white/35 text-[10px]">{payouts?.totals?.totalWonCount ?? 0} winning slips · net after 15% tax</p>
              </div>
            </div>

            {/* Won Redeemed */}
            <div className="rounded-xl p-2.5" style={{background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.18)'}}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Redeemed</span>
                <div className="p-1 rounded-md" style={{background:'rgba(59,130,246,0.15)'}}>
                  <CheckCircle className="w-3.5 h-3.5 text-nile-blue-light" />
                </div>
              </div>
              <p className="text-nile-blue-light font-mono text-xl font-bold leading-none">{formatETB(payouts?.totals?.wonRedeemedNet ?? 0)}</p>
              <div className="mt-1.5 pt-1.5 border-t border-nile-blue-light/10 flex items-center justify-between">
                <span className="text-white/35 text-[10px]">{payouts?.totals?.wonRedeemedCount ?? 0} slips paid out</span>
                {(payouts?.totals?.pendingPayoutNet ?? 0) > 0 && (
                  <span className="text-nile-orange/70 text-[10px] font-medium">{formatETB(payouts?.totals?.pendingPayoutNet ?? 0)} due</span>
                )}
              </div>
            </div>

            {/* Insured */}
            <div className="rounded-xl p-2.5" style={{background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.18)'}}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">🛡️ Insured</span>
                <div className="p-1 rounded-md" style={{background:'rgba(201,168,76,0.15)'}}>
                  <CheckCircle className="w-3.5 h-3.5 text-gold" />
                </div>
              </div>
              <p className="text-gold font-mono text-xl font-bold leading-none">{formatETB(payouts?.totals?.insuredRedeemedNet ?? 0)}</p>
              <div className="mt-1.5 pt-1.5 border-t border-gold/10 flex items-center justify-between">
                  <span className="text-white/35 text-[10px]">✓ {payouts?.totals?.insuredRedeemedCount ?? 0} paid</span>
                {(payouts?.totals?.insuredPendingCount ?? 0) > 0
                  ? <span className="text-nile-orange/70 text-[10px] font-medium">⏳ {payouts?.totals?.insuredPendingCount ?? 0} pending</span>
                  : <span className="text-white/25 text-[10px]">all settled</span>
                }
              </div>
            </div>

            {/* Pending Payout */}
            <div className="rounded-xl p-2.5" style={{
              background: (payouts?.totals?.pendingPayoutNet ?? 0) > 0 ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
              border: (payouts?.totals?.pendingPayoutNet ?? 0) > 0 ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(255,255,255,0.06)'
            }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Pending Payout</span>
                <div className="p-1 rounded-md" style={{background:'rgba(249,115,22,0.12)'}}>
                  <Clock className="w-3.5 h-3.5 text-nile-orange" />
                </div>
              </div>
              <p className={cn('font-mono text-xl font-bold leading-none', (payouts?.totals?.pendingPayoutNet ?? 0) > 0 ? 'text-nile-orange' : 'text-white/30')}>
                {formatETB(payouts?.totals?.pendingPayoutNet ?? 0)}
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-nile-orange/10">
                <p className="text-white/35 text-[10px]">{payouts?.totals?.pendingCount ?? 0} slips awaiting payment</p>
              </div>
            </div>
          </div>
        )}

        {/* Payouts table */}
        {payouts && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-nile-blue/20">
                  <th className="text-left px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Slip ID</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Bettor</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Stake</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Odds</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Gross Win</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Tax</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Net Payout</th>
                  <th className="text-center px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Redeemed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nile-blue/10">
                {(payouts.slips ?? []).length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-white/30 text-sm">No winning slips yet</td></tr>
                ) : (payouts.slips ?? []).map((row: any, i: number) => (
                  <tr key={row.slip_id ?? i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-white/40 text-[11px] flex items-center gap-1">
                        {row.is_jackpot ? <span className="text-gold">🏆</span> : null}
                        ···{String(row.slip_id ?? '').slice(-6)}
                      </span>
                      {row.is_jackpot && row.jackpot_name && (
                        <span className="text-gold/50 text-[9px] block mt-0.5">{row.jackpot_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-white/80 font-medium">
                        {row.is_anonymous ? <span className="text-white/30 italic">Anonymous</span> : `@${row.bettor?.username ?? '—'}`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-white/70 font-mono">{formatETB(row.stake)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-gold/80 font-mono font-semibold">
                        {row.is_jackpot ? <span className="text-white/20">—</span> : (row.total_odds ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-white font-mono font-semibold">{formatETB(row.max_payout)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {(row.winning_tax ?? 0) > 0
                        ? <span className="text-nile-danger/80 font-mono">-{formatETB(row.winning_tax)}</span>
                        : <span className="text-white/20 font-mono text-[10px]">exempt</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-nile-success font-mono font-bold">{formatETB(row.net_payout)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.payout_status === 'redeemed' ? (
                        row.is_insured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-nile-blue-light/15 text-nile-blue-light border border-nile-blue-light/25">
                            🛡️ INSURED · PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-nile-blue-light/15 text-nile-blue-light border border-nile-blue-light/25">
                            ✓ PAID
                          </span>
                        )
                      ) : row.is_insured ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold/12 text-gold border border-gold/25">
                          🛡️ INSURED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-nile-success/12 text-nile-success border border-nile-success/25">
                          ⏳ WON
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.redeemed_at ? (
                        <span className="text-nile-success/80 text-[10px] font-medium">
                          {new Date(row.redeemed_at).toLocaleString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-nile-orange/60 text-[10px]">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals row */}
            {(payouts.slips ?? []).length > 0 && (
              <div className="border-t border-gold/20 bg-gold/5 px-4 py-3 flex items-center justify-between flex-wrap gap-x-6 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gold font-bold text-[10px] uppercase tracking-widest">TOTALS</span>
                  <span className="text-white/25 text-[10px]">· {payouts.slips?.length} slips</span>
                </div>
                <div className="flex items-center gap-6 ml-auto">
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">Stake</p>
                    <p className="text-white font-mono text-xs font-bold">{formatETB(payouts.totals.stakeTotal ?? 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">Gross Win</p>
                    <p className="text-white font-mono text-xs font-bold">{formatETB(payouts.totals.grossWinTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">Tax (15%)</p>
                    <p className="text-nile-danger font-mono text-xs font-bold">-{formatETB(payouts.totals.taxTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">Net Payout</p>
                    <p className="text-nile-success font-mono text-sm font-bold">{formatETB(payouts.totals.netPayoutTotal)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ROW 7: Recent Slips ── */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">
            🔀 Recent Slips
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={slipCategory}
              onChange={(e) =>
                setSlipCategory(e.target.value as 'all' | 'regular' | 'jackpot')
              }
              className="bg-charcoal border border-nile-blue/30 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
            >
              <option value="all">⚽🏆 All Types</option>
              <option value="regular">⚽ Regular Only</option>
              <option value="jackpot">🏆 Jackpot Only</option>
            </select>
            <select
              value={slipStatus}
              onChange={(e) =>
                setSlipStatus(e.target.value)
              }
              className="bg-charcoal border border-nile-blue/30 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
            >
              <option value="all">
                All Status
              </option>
              <option value="pending">
                Pending
              </option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="near_win">
                Near Win
              </option>
              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </div>
        </div>
        <DataTable
          columns={recentSlipsColumns}
          data={recentSlips.filter((s: any) =>
            slipCategory === 'all' ? true :
            slipCategory === 'jackpot' ? s.is_jackpot :
            !s.is_jackpot
          )}
          isLoading={loading}
          emptyMessage="No slips placed yet"
        />
      </div>
    </div>
  )
}