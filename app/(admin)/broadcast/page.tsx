'use client'

import { useState, useEffect } from 'react'
import { sendBroadcast } from '@/lib/actions/admin'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatDate } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Megaphone, Trash2, CheckSquare, Square } from 'lucide-react'

async function deleteBroadcasts(ids: string[]) {
  const supabase = createClient()

  // Get messages to find their content for matching notifications
  const { data: messages } = await supabase
    .from('broadcast_messages')
    .select('message, sent_by')
    .in('id', ids)

  // Delete matching notifications for each message
  if (messages?.length) {
    for (const msg of messages) {
      await supabase
        .from('notifications')
        .delete()
        .eq('message', msg.message)
        .eq('type', 'broadcast')
    }
  }

  // Delete broadcast messages
  const { error } = await supabase
    .from('broadcast_messages')
    .delete()
    .in('id', ids)

  return { success: !error, error: error?.message }
}

export default function BroadcastPage() {
  const { user } = useAuthStore()
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [sendToBettors, setSendToBettors] = useState(true)
  const [sendToCashiers, setSendToCashiers] = useState(true)
  const [sendToAgents, setSendToAgents] = useState(true)
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  const loadHistory = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('broadcast_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setHistory(data)
  }

  useEffect(() => { loadHistory() }, [])

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
      message: message.trim(), priority,
      sendToBettors, sendToCashiers, sendToAgents,
      sentBy: user.id,
    })
    if (result.success) {
      toast.success(`Broadcast sent to: ${roles.join(', ')}`)
      setMessage('')
      loadHistory()
    } else {
      toast.error(result.error)
    }
    setSending(false)
  }

  const handleDeleteSingle = async (id: string) => {
    setDeleting(true)
    const result = await deleteBroadcasts([id])
    if (result.success) {
      toast.success('Message deleted')
      setHistory(prev => prev.filter(b => b.id !== id))
      setSelected(prev => prev.filter(s => s !== id))
    } else {
      toast.error(result.error ?? 'Failed to delete')
    }
    setDeleting(false)
  }

  const handleBulkDelete = async () => {
    if (!selected.length) return
    setDeleting(true)
    const result = await deleteBroadcasts(selected)
    if (result.success) {
      toast.success(`${selected.length} messages deleted`)
      setHistory(prev => prev.filter(b => !selected.includes(b.id)))
      setSelected([])
    } else {
      toast.error(result.error ?? 'Failed to delete')
    }
    setDeleting(false)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelected(prev =>
      prev.length === history.length ? [] : history.map(b => b.id)
    )
  }

  const previewStyle = priority === 'urgent'
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

          <div>
            <label className="text-xs text-white/60 block mb-2">Recipients</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All Bettors', state: sendToBettors, set: setSendToBettors },
                { label: 'All Cashiers', state: sendToCashiers, set: setSendToCashiers },
                { label: 'All Agents', state: sendToAgents, set: setSendToAgents },
              ].map((r) => (
                <button key={r.label} onClick={() => r.set(!r.state)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    r.state ? 'bg-gold/20 border-gold text-gold' : 'border-nile-blue/30 text-white/50 hover:text-white'
                  )}>
                  <span>{r.state ? '☑️' : '☐'}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 block mb-2">Priority</label>
            <div className="flex gap-2">
              {(['normal', 'urgent'] as const).map((p) => (
                <button key={p} onClick={() => setPriority(p)}
                  className={cn('flex-1 py-2 rounded-lg text-xs font-semibold capitalize border',
                    priority === p
                      ? p === 'urgent' ? 'bg-nile-danger border-nile-danger text-white' : 'bg-nile-blue border-nile-blue text-white'
                      : 'border-nile-blue/30 text-white/50 hover:text-white'
                  )}>
                  {p === 'urgent' ? '⚠️ Urgent' : '📢 Normal'}
                </button>
              ))}
            </div>
            {priority === 'urgent' && (
              <p className="text-nile-danger text-xs mt-1">⚠️ Urgent messages cannot be dismissed</p>
            )}
          </div>

          <div>
            <label className="text-xs text-white/60 block mb-2">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..." maxLength={500} rows={4}
              className="w-full bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 resize-none"
            />
            <p className="text-white/30 text-xs text-right mt-1">{message.length} / 500</p>
          </div>

          {message && (
            <div className={cn('rounded-lg p-3 border', previewStyle)}>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Preview</p>
              <p className="text-white/80 text-sm">{message}</p>
            </div>
          )}

          <button onClick={handleSend}
            disabled={sending || !message.trim() || (!sendToBettors && !sendToCashiers && !sendToAgents)}
            className={cn('w-full py-3 rounded-lg font-semibold text-sm transition-colors',
              !sending && message.trim() && (sendToBettors || sendToCashiers || sendToAgents)
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}>
            {sending ? 'Sending...' : '📢 Send Broadcast'}
          </button>
        </div>

        {/* History */}
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Broadcast History</h2>
            {history.length > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={toggleSelectAll}
                  className="text-xs text-white/50 hover:text-white flex items-center gap-1">
                  {selected.length === history.length
                    ? <CheckSquare className="w-3.5 h-3.5 text-gold" />
                    : <Square className="w-3.5 h-3.5" />}
                  {selected.length === history.length ? 'Deselect All' : 'Select All'}
                </button>
                {selected.length > 0 && (
                  <button onClick={handleBulkDelete} disabled={deleting}
                    className="flex items-center gap-1 bg-nile-danger text-white text-xs px-3 py-1.5 rounded-lg hover:bg-nile-danger/80 disabled:opacity-50">
                    <Trash2 className="w-3 h-3" />
                    Delete ({selected.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide">
            {history.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No broadcasts yet</p>
            ) : (
              history.map((b) => (
                <div key={b.id}
                  className={cn('rounded-lg p-3 border relative',
                    selected.includes(b.id) ? 'border-gold/50 bg-gold/5' :
                    b.priority === 'urgent' ? 'bg-nile-danger/10 border-nile-danger/30' : 'bg-nile-blue/20 border-nile-blue/30'
                  )}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleSelect(b.id)} className="text-white/40 hover:text-gold">
                        {selected.includes(b.id)
                          ? <CheckSquare className="w-3.5 h-3.5 text-gold" />
                          : <Square className="w-3.5 h-3.5" />}
                      </button>
                      <span className={cn('text-[10px] font-semibold uppercase',
                        b.priority === 'urgent' ? 'text-nile-danger' : 'text-nile-blue-light'
                      )}>
                        {b.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-[10px]">{formatDate(b.created_at)}</span>
                      <button onClick={() => handleDeleteSingle(b.id)} disabled={deleting}
                        className="text-white/30 hover:text-nile-danger transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm ml-5">{b.message}</p>
                  <div className="flex gap-1 mt-2 ml-5">
                    {b.send_to_bettors && <span className="text-[9px] bg-nile-purple/20 text-nile-purple px-1.5 py-0.5 rounded">Bettors</span>}
                    {b.send_to_cashiers && <span className="text-[9px] bg-nile-success/20 text-nile-success px-1.5 py-0.5 rounded">Cashiers</span>}
                    {b.send_to_agents && <span className="text-[9px] bg-nile-blue-light/20 text-nile-blue-light px-1.5 py-0.5 rounded">Agents</span>}
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
