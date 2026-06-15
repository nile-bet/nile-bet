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
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'daily' })
  const [stats, setStats] =
    useState<any>(null)
  const [payouts, setPayouts] =
    useState<any>(null)
  const [recentSlips, setRecentSlips] =
    useState<any[]>([])
  const [slipStatus, setSlipStatus] =
    useState('all')
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

  const payoutsColumns = [
    {
      key: 'slip_id',
      label: 'Slip ID',
      render: (v: any, row: any) => (
        <span className="text-gold font-mono text-xs">
          {row.is_jackpot && '🏆 '}#{v}
        </span>
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
      render: (v: any) => (
        <span className="text-white/70 font-mono text-xs">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'max_payout',
      label: 'Gross Win',
      render: (v: any) => (
        <span className="text-white/60 font-mono text-xs">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'winning_tax',
      label: 'Tax (15%)',
      render: (v: any) => (
        <span className="text-nile-danger font-mono text-xs">
          -{formatETB(v)}
        </span>
      ),
    },
    {
      key: 'net_payout',
      label: 'Net Payout',
      render: (v: any) => (
        <span className="text-nile-success font-mono text-xs font-bold">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: any) => (
        <StatusBadge status={v} type="slip" />
      ),
    },
  ]

  const recentSlipsColumns = [
    {
      key: 'slip_id',
      label: 'Slip ID',
      render: (v: any, row: any) => (
        <span className="text-gold font-mono text-xs">
          {row.is_jackpot && '🏆 '}#{v}
        </span>
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
      render: (v: any) => (
        <StatusBadge status={v} type="slip" />
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
    <div className="p-6 space-y-6">
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
        <div className="bg-nile-blue/20 border border-gold/20 rounded-lg px-4 py-2 text-xs text-white/50">
          📅 Showing:{' '}
          {dateFilter.type === 'custom' ? `${dateFilter.startDate?.slice(0,10)} → ${dateFilter.endDate?.slice(0,10)}` : dateFilter.type}{' '}
          data • {stats.totalSlips} total slips
        </div>
      )}

      {/* ── ROW 1: 4 Main Stats ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-dark border border-gold/30 rounded-xl p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-white/60 text-sm">
                Wallet Balance
              </p>
              <div className="p-2 bg-gold/10 rounded-lg">
                <Wallet className="w-5 h-5 text-gold" />
              </div>
            </div>
            <p className="text-gold font-mono text-2xl font-bold">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total */}
          <div className="bg-slate-dark border border-nile-blue/40 rounded-xl p-3 text-center">
            <Ticket className="w-5 h-5 text-white/50 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white font-mono">
              {stats.totalSlips}
            </p>
            <p className="text-white/50 text-xs">
              Total
            </p>
          </div>

          {/* Won */}
          <div className="bg-nile-success/10 border border-nile-success/30 rounded-xl p-3 text-center">
            <CheckCircle className="w-5 h-5 text-nile-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-success font-mono">
              {stats.wonSlips}
            </p>
            <p className="text-white/50 text-xs">
              Won
            </p>
            <p className="text-white/30 text-[10px]">
              Pending: {stats.wonPending}
            </p>
          </div>

          {/* Near Win */}
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 text-center">
            <span className="text-xl block mb-1">
              🛡️
            </span>
            <p className="text-2xl font-bold text-gold font-mono">
              {stats.insuredSlips}
            </p>
            <p className="text-white/50 text-xs">
              Insured
            </p>
            <p className="text-white/30 text-[10px]">
              Pending: {stats.insuredPending}
            </p>
          </div>

          {/* Lost */}
          <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-3 text-center">
            <XCircle className="w-5 h-5 text-nile-danger mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-danger font-mono">
              {stats.lostSlips}
            </p>
            <p className="text-white/50 text-xs">
              Lost
            </p>
          </div>

          {/* Pending */}
          <div className="bg-nile-blue/20 border border-nile-blue/30 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-gold mx-auto mb-1" />
            <p className="text-2xl font-bold text-gold font-mono">
              {stats.pendingSlips}
            </p>
            <p className="text-white/50 text-xs">
              Pending
            </p>
          </div>

          {/* In Progress */}
          <div className="bg-nile-blue/10 border border-nile-blue/20 rounded-xl p-3 text-center">
            <RefreshCw className="w-5 h-5 text-nile-blue-light mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-blue-light font-mono">
              {stats.inProgressSlips}
            </p>
            <p className="text-white/50 text-xs">
              In Progress
            </p>
          </div>
        </div>
      )}

      {/* ── ROW 3: User Top-ups ── */}
      {!loading && stats && (
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4 flex items-center gap-4">
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
            className="w-full flex items-center justify-between p-4 hover:bg-gold/5 transition-colors"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 pt-0">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-nile-blue to-charcoal border border-gold/30 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">
                  Account (Staked + Wallet)
                </p>
                <p className="text-white font-mono text-2xl font-bold mt-2">
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
              'border rounded-xl p-5',
              (stats.netBalance ?? 0) >= 0
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
                    'font-mono text-2xl font-bold mt-2',
                    (stats.netBalance ?? 0) >= 0
                      ? 'text-nile-success'
                      : 'text-nile-danger'
                  )}
                >
                  {(stats.netBalance ?? 0) >= 0
                    ? '+'
                    : ''}
                  {formatETB(stats.netBalance)}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Paid out:{' '}
                  {formatETB(stats.totalWon)}
                </p>
              </div>
              <TrendingUp
                className={cn(
                  'w-8 h-8',
                  (stats.netBalance ?? 0) >= 0
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-nile-success/10 border border-nile-success/20 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">
                  Cashier Profit (40%)
                </p>
                <p
                  className={cn(
                    'font-mono text-xl font-bold mt-1',
                    (stats.cashierProfit ??
                      0) >= 0
                      ? 'text-nile-success'
                      : 'text-nile-danger'
                  )}
                >
                  {(stats.cashierProfit ?? 0) >=
                  0
                    ? '+'
                    : ''}
                  {formatETB(
                    stats.cashierProfit
                  )}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Your share of profit
                </p>
              </div>
              <Wallet className="w-6 h-6 text-nile-success/40" />
            </div>
          </div>

          <div className="bg-nile-danger/10 border border-nile-danger/20 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">
                  Agent Payable (60%)
                </p>
                <p
                  className={cn(
                    'font-mono text-xl font-bold mt-1',
                    (stats.agentPayable ?? 0) >=
                    0
                      ? 'text-nile-danger'
                      : 'text-nile-success'
                  )}
                >
                  {formatETB(
                    stats.agentPayable
                  )}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  To pay your agent
                </p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-nile-danger/40" />
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 6: Payouts Report ── */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          🏆 Payouts Report
        </h3>

        {/* 4 mini cards */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-charcoal/50 rounded-lg p-3 text-center">
              <p className="text-nile-success font-mono text-lg font-bold">
                {formatETB(stats.totalWon)}
              </p>
              <p className="text-white/50 text-xs">
                Total Won
              </p>
            </div>
            <div className="bg-charcoal/50 rounded-lg p-3 text-center">
              <p className="text-white/60 font-mono text-lg font-bold">
                {formatETB(
                  stats.wonRedeemedAmount
                )}
              </p>
              <p className="text-white/50 text-xs">
                Won-Redeemed
              </p>
            </div>
            <div className="bg-charcoal/50 rounded-lg p-3 text-center">
              <p className="text-gold font-mono text-lg font-bold">
                {formatETB(
                  stats.insuredTotal
                )}
              </p>
              <p className="text-white/50 text-xs">
                Insured
              </p>
            </div>
            <div className="bg-charcoal/50 rounded-lg p-3 text-center">
              <p
                className={cn(
                  'font-mono text-lg font-bold',
                  (stats.pendingPayout ?? 0) >
                  0
                    ? 'text-nile-orange'
                    : 'text-white/60'
                )}
              >
                {formatETB(
                  stats.pendingPayout
                )}
              </p>
              <p className="text-white/50 text-xs">
                Pending Payout
              </p>
            </div>
          </div>
        )}

        {/* Payouts table */}
        {payouts && (
          <>
            <DataTable
              columns={payoutsColumns}
              data={payouts.slips ?? []}
              isLoading={loading}
              emptyMessage="No winning slips yet"
            />
            {/* Totals row */}
            {(payouts.slips ?? []).length >
              0 && (
              <div className="mt-3 bg-gold/10 border border-gold/20 rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <span className="text-gold font-semibold text-sm">
                  TOTALS
                </span>
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-white/50 text-xs">
                      Gross
                    </p>
                    <p className="text-white font-mono">
                      {formatETB(
                        payouts.totals
                          .grossWinTotal
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">
                      Tax
                    </p>
                    <p className="text-nile-danger font-mono">
                      -{' '}
                      {formatETB(
                        payouts.totals.taxTotal
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">
                      Net Total
                    </p>
                    <p className="text-nile-success font-mono font-bold">
                      {formatETB(
                        payouts.totals
                          .netPayoutTotal
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ROW 7: Recent Slips ── */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">
            🔀 Recent Slips
          </h3>
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
        <DataTable
          columns={recentSlipsColumns}
          data={recentSlips}
          isLoading={loading}
          emptyMessage="No slips placed yet"
        />
      </div>
    </div>
  )
}