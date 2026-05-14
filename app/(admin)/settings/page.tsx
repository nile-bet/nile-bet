'use client'

import { useState, useEffect } from 'react'
import { createClient }
  from '@/lib/supabase/client'
import { updatePlatformSettings }
  from '@/lib/actions/admin'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [settings, setSettings] =
    useState<Record<string, string>>({})
  const [loading, setLoading] =
    useState(true)
  const [saving, setSaving] =
    useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('platform_settings')
      .select('key, value')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {}
          data.forEach((s: any) => {
            map[s.key] = s.value
          })
          setSettings(map)
        }
        setLoading(false)
      })
  }, [])

  const get = (k: string) =>
    settings[k] ?? ''
  const set = (k: string, v: string) =>
    setSettings((prev) => ({
      ...prev,
      [k]: v,
    }))

  const saveSection = async (
    sectionKey: string,
    keys: string[]
  ) => {
    if (!user) return
    setSaving(sectionKey)
    const subset = Object.fromEntries(
      keys.map((k) => [k, settings[k] ?? ''])
    )
    const result =
      await updatePlatformSettings(
        subset,
        user.id
      )
    if (result.success) {
      toast.success(
        'Settings saved successfully'
      )
    } else {
      toast.error('Failed to save settings')
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-nile-blue/20 rounded-xl"
            />
          ))}
        </div>
      </div>
    )
  }

  const inputClass =
    'w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 font-mono'
  const labelClass =
    'text-xs text-white/60 block mb-1'
  const sectionClass =
    'bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">
        Platform Settings
      </h1>

      {/* Betting Rules */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-white text-sm">
          ⚽ Betting Rules
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Min Stake (ETB)
            </label>
            <input
              type="number"
              value={get('min_stake')}
              onChange={(e) =>
                set('min_stake', e.target.value)
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Max Stake per Slip (ETB)
            </label>
            <input
              type="number"
              value={get('max_stake_per_slip')}
              onChange={(e) =>
                set(
                  'max_stake_per_slip',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Max Odd per Selection
            </label>
            <input
              type="number"
              value={get('max_odd_per_selection')}
              onChange={(e) =>
                set(
                  'max_odd_per_selection',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Max Total Odds
            </label>
            <input
              type="number"
              value={get('max_total_odds')}
              onChange={(e) =>
                set('max_total_odds', e.target.value)
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Min Selections
            </label>
            <input
              type="number"
              value={get('min_selections')}
              onChange={(e) =>
                set('min_selections', e.target.value)
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Winning Tax (%)
            </label>
            <input
              type="number"
              value={get('winning_tax_percent')}
              onChange={(e) =>
                set(
                  'winning_tax_percent',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Max Payout (ETB)
            </label>
            <input
              type="number"
              value={get('max_payout')}
              onChange={(e) =>
                set('max_payout', e.target.value)
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Cancellation Window (mins)
            </label>
            <input
              type="number"
              value={get('cancellation_window_mins')}
              onChange={(e) =>
                set(
                  'cancellation_window_mins',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={() =>
            saveSection('betting', [
              'min_stake',
              'max_stake_per_slip',
              'max_odd_per_selection',
              'max_total_odds',
              'min_selections',
              'winning_tax_percent',
              'max_payout',
              'cancellation_window_mins',
            ])
          }
          disabled={saving === 'betting'}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
        >
          {saving === 'betting'
            ? 'Saving...'
            : 'Save Betting Rules'}
        </button>
      </div>

      {/* Insurance */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-white text-sm">
          🛡️ Insurance Settings
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Min Selections for Insurance
            </label>
            <input
              type="number"
              value={get('insurance_min_selections')}
              onChange={(e) =>
                set(
                  'insurance_min_selections',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              1 Loss Consolation (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={get('insurance_1_loss_pct')}
              onChange={(e) =>
                set(
                  'insurance_1_loss_pct',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              2 Losses Consolation (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={get('insurance_2_loss_pct')}
              onChange={(e) =>
                set(
                  'insurance_2_loss_pct',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={() =>
            saveSection('insurance', [
              'insurance_min_selections',
              'insurance_1_loss_pct',
              'insurance_2_loss_pct',
            ])
          }
          disabled={saving === 'insurance'}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
        >
          {saving === 'insurance'
            ? 'Saving...'
            : 'Save Insurance Settings'}
        </button>
      </div>

      {/* Security */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-white text-sm">
          🔒 Security Settings
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Login Attempt Limit
            </label>
            <input
              type="number"
              value={get('login_attempt_limit')}
              onChange={(e) =>
                set(
                  'login_attempt_limit',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Session Timeout (hours)
            </label>
            <input
              type="number"
              value={get('session_timeout_hours')}
              onChange={(e) =>
                set(
                  'session_timeout_hours',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={() =>
            saveSection('security', [
              'login_attempt_limit',
              'session_timeout_hours',
            ])
          }
          disabled={saving === 'security'}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
        >
          {saving === 'security'
            ? 'Saving...'
            : 'Save Security Settings'}
        </button>
      </div>

      {/* Bonus */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-white text-sm">
          🎁 Welcome Bonus Settings
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Welcome Bonus Enabled
            </label>
            <select
              value={get('welcome_bonus_enabled')}
              onChange={(e) =>
                set(
                  'welcome_bonus_enabled',
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="true">
                Enabled
              </option>
              <option value="false">
                Disabled
              </option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Min Top-up to Qualify (ETB)
            </label>
            <input
              type="number"
              value={get('welcome_bonus_min_topup')}
              onChange={(e) =>
                set(
                  'welcome_bonus_min_topup',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Bonus Amount (ETB)
            </label>
            <input
              type="number"
              value={get('welcome_bonus_amount')}
              onChange={(e) =>
                set(
                  'welcome_bonus_amount',
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={() =>
            saveSection('bonus', [
              'welcome_bonus_enabled',
              'welcome_bonus_min_topup',
              'welcome_bonus_amount',
            ])
          }
          disabled={saving === 'bonus'}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
        >
          {saving === 'bonus'
            ? 'Saving...'
            : 'Save Bonus Settings'}
        </button>
      </div>

      {/* Platform */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-white text-sm">
          ⚙️ Platform Settings
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Cashier Profit Split (%)
            </label>
            <input
              type="number"
              value={get('cashier_profit_percent')}
              onChange={(e) => {
                set(
                  'cashier_profit_percent',
                  e.target.value
                )
                set(
                  'agent_profit_percent',
                  String(
                    100 -
                      (parseFloat(
                        e.target.value
                      ) || 0)
                  )
                )
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Agent Profit Split (%)
            </label>
            <input
              type="number"
              value={get('agent_profit_percent')}
              readOnly
              className={cn(
                inputClass,
                'opacity-50'
              )}
            />
            <p className="text-white/30 text-xs mt-0.5">
              Auto-calculated
            </p>
          </div>
          <div>
            <label className={labelClass}>
              Coupon Expiry (hours)
            </label>
            <input
              type="number"
              value={get('topup_expiry_hours')}
              onChange={(e) => {
                set(
                  'topup_expiry_hours',
                  e.target.value
                )
                set(
                  'withdrawal_expiry_hours',
                  e.target.value
                )
              }}
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={() =>
            saveSection('platform', [
              'cashier_profit_percent',
              'agent_profit_percent',
              'topup_expiry_hours',
              'withdrawal_expiry_hours',
            ])
          }
          disabled={saving === 'platform'}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
        >
          {saving === 'platform'
            ? 'Saving...'
            : 'Save Platform Settings'}
        </button>
      </div>
    </div>
  )
}