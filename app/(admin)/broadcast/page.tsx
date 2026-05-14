'use client'

import { useState, useEffect } from 'react'
import { sendBroadcast }
  from '@/lib/actions/admin'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { formatDate }
  from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Megaphone } from 'lucide-react'

export default function BroadcastPage() {
  const { user } = useAuthStore()
  const [message, setMessage] = useState('')
  const [priority, setPriority] =
    useState<'normal' | 'urgent'>('normal')
  const [sendToBettors, setSendToBettors] =
    useState(true)
  const [sendToCashiers, setSendToCashiers] =
    useState(true)
  const [sendToAgents, setSendToAgents] =
    useState(true)
  const [sending, setSending] = useState(false)
  const [history, setHistory] =
    useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('broadcast_messages')
      .select('*')
      .order('created_at', {
        ascending: false,
      })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data)
      })
  }, [])

  const handleSend = async () => {
    if (!user || !message.trim()) return

    const roles = []
    if (sendToBettors) roles.push('Bettors')
    if (sendToCashiers) roles.push('Cashiers')
    if (sendToAgents) roles.push('Agents')

    if (roles.length === 0) {
      toast.error('Select at least one recipient group')
      return
    }

    setSending(true)
    const result = await sendBroadcast({
      message: message.trim(),
      priority,
      sendToBettors,
      sendToCashiers,
      sendToAgents,
      sentBy: user.id,
    })

    if (result.success) {
      toast.success(
        `Broadcast sent to: ${roles.join(', ')}`
      )
      setMessage('')
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          message: message.trim(),
          priority,
          send_to_bettors: sendToBettors,
          send_to_cashiers: sendToCashiers,
          send_to_agents: sendToAgents,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
    } else {
      toast.error(result.error)
    }
    setSending(false)
  }

  const previewStyle =
    priority === 'urgent'
      ? 'bg-nile-danger/10 border-nile-danger/40'
      : 'bg-nile-blue/20 border-gold/20'

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        Broadcast Messages
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-gold" />
            Compose Message
          </h2>

          {/* Recipients */}
          <div>
            <label className="text-xs text-white/60 block mb-2">
              Recipients
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: 'All Bettors',
                  state: sendToBettors,
                  set: setSendToBettors,
                },
                {
                  label: 'All Cashiers',
                  state: sendToCashiers,
                  set: setSendToCashiers,
                },
                {
                  label: 'All Agents',
                  state: sendToAgents,
                  set: setSendToAgents,
                },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={() =>
                    r.set(!r.state)
                  }
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    r.state
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'border-nile-blue/30 text-white/50 hover:text-white'
                  )}
                >
                  <span>
                    {r.state ? '☑️' : '☐'}
                  </span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-white/60 block mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(
                ['normal', 'urgent'] as const
              ).map((p) => (
                <button
                  key={p}
                  onClick={() =>
                    setPriority(p)
                  }
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-semibold capitalize border',
                    priority === p
                      ? p === 'urgent'
                        ? 'bg-nile-danger border-nile-danger text-white'
                        : 'bg-nile-blue border-nile-blue text-white'
                      : 'border-nile-blue/30 text-white/50 hover:text-white'
                  )}
                >
                  {p === 'urgent'
                    ? '⚠️ Urgent'
                    : '📢 Normal'}
                </button>
              ))}
            </div>
            {priority === 'urgent' && (
              <p className="text-nile-danger text-xs mt-1">
                ⚠️ Urgent messages cannot be dismissed and appear on every page load
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-white/60 block mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Type your message..."
              maxLength={500}
              rows={4}
              className="w-full bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 resize-none"
            />
            <p className="text-white/30 text-xs text-right mt-1">
              {message.length} / 500
            </p>
          </div>

          {/* Preview */}
          {message && (
            <div
              className={cn(
                'rounded-lg p-3 border',
                previewStyle
              )}
            >
              <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">
                Preview
              </p>
              <p className="text-white/80 text-sm">
                {message}
              </p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={
              sending ||
              !message.trim() ||
              (!sendToBettors &&
                !sendToCashiers &&
                !sendToAgents)
            }
            className={cn(
              'w-full py-3 rounded-lg font-semibold text-sm transition-colors',
              !sending &&
                message.trim() &&
                (sendToBettors ||
                  sendToCashiers ||
                  sendToAgents)
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            {sending
              ? 'Sending...'
              : '📢 Send Broadcast'}
          </button>
        </div>

        {/* History */}
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">
            Broadcast History
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide">
            {history.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">
                No broadcasts yet
              </p>
            ) : (
              history.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    'rounded-lg p-3 border',
                    b.priority === 'urgent'
                      ? 'bg-nile-danger/10 border-nile-danger/30'
                      : 'bg-nile-blue/20 border-nile-blue/30'
                  )}
                >
                  <div className="flex justify-between mb-1">
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase',
                        b.priority === 'urgent'
                          ? 'text-nile-danger'
                          : 'text-nile-blue-light'
                      )}
                    >
                      {b.priority}
                    </span>
                    <span className="text-white/30 text-[10px]">
                      {formatDate(b.created_at)}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm">
                    {b.message}
                  </p>
                  <div className="flex gap-1 mt-2">
                    {b.send_to_bettors && (
                      <span className="text-[9px] bg-nile-purple/20 text-nile-purple px-1.5 py-0.5 rounded">
                        Bettors
                      </span>
                    )}
                    {b.send_to_cashiers && (
                      <span className="text-[9px] bg-nile-success/20 text-nile-success px-1.5 py-0.5 rounded">
                        Cashiers
                      </span>
                    )}
                    {b.send_to_agents && (
                      <span className="text-[9px] bg-nile-blue-light/20 text-nile-blue-light px-1.5 py-0.5 rounded">
                        Agents
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}