'use client'

import { useState, useEffect } from 'react'
import {
  getAllUsers,
  updateUserStatus,
  addCreditsToUser,
  forceLogout,
  getHierarchyTree,
  createUser,
} from '@/lib/actions/admin'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { SkeletonTableRow }
  from '@/components/shared/SkeletonCard'
import { formatETB, formatDate }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Plus, Search, ChevronRight,
  ChevronDown, Eye, EyeOff,
  RefreshCw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const TABS = [
  { key: 'agent', label: 'Agents' },
  { key: 'cashier', label: 'Cashiers' },
  { key: 'bettor', label: 'Bettors' },
]

function generatePassword() {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  let pw = 'Nile'
  for (let i = 0; i < 8; i++) {
    pw += chars[
      Math.floor(Math.random() * chars.length)
    ]
  }
  return pw
}

// ─── Hierarchy Tree Node ─────────────

function TreeNode({
  agent,
  onUserClick,
}: {
  agent: any
  onUserClick: (u: any) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2 py-1.5">
        <button
          onClick={() => setOpen(!open)}
          className="text-white/40 hover:text-white"
        >
          {open ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-gold"
          onClick={() => onUserClick(agent)}
        >
          <div className="w-6 h-6 rounded-full bg-nile-blue-light/30 border border-nile-blue-light/50 flex items-center justify-center text-nile-blue-light text-xs font-bold">
            {agent.username
              ?.charAt(0)
              .toUpperCase()}
          </div>
          <span className="text-white text-sm">
            @{agent.username}
          </span>
          <span className="text-nile-blue-light text-xs bg-nile-blue-light/20 px-1.5 py-0.5 rounded">
            agent
          </span>
          <span className="text-gold font-mono text-xs">
            {formatETB(
              agent.credit_balance ?? 0
            )}
          </span>
        </div>
      </div>

      {open && (
        <div className="ml-6 border-l border-nile-blue/30 pl-4">
          {agent.cashiers?.length === 0 ? (
            <p className="text-white/30 text-xs py-1">
              No cashiers yet
            </p>
          ) : (
            agent.cashiers?.map(
              (cashier: any) => (
                <div
                  key={cashier.id}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-gold"
                  onClick={() =>
                    onUserClick(cashier)
                  }
                >
                  <div className="w-5 h-5 rounded-full bg-nile-success/30 border border-nile-success/50 flex items-center justify-center text-nile-success text-xs font-bold">
                    {cashier.username
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>
                  <span className="text-white/80 text-sm">
                    @{cashier.username}
                  </span>
                  <span className="text-nile-success text-xs bg-nile-success/20 px-1.5 py-0.5 rounded">
                    cashier
                  </span>
                  <span className="text-gold font-mono text-xs">
                    {formatETB(
                      cashier.credit_balance ?? 0
                    )}
                  </span>
                  <span className="text-white/30 text-xs">
                    {cashier.bettorsCount ?? 0}{' '}
                    bettors
                  </span>
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] =
    useState('agent')
  const [users, setUsers] = useState<any[]>(
    []
  )
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] =
    useState(true)
  const [page, setPage] = useState(1)

  const [showTree, setShowTree] =
    useState(false)
  const [tree, setTree] = useState<any[]>([])

  const [showCreate, setShowCreate] =
    useState(false)
  const [showConfirm, setShowConfirm] =
    useState(false)
  const [confirmData, setConfirmData] =
    useState<any>(null)
  const [showAddCredits, setShowAddCredits] =
    useState(false)
  const [selectedUser, setSelectedUser] =
    useState<any>(null)

  // Create form state
  const [newUsername, setNewUsername] =
    useState('')
  const [newPassword, setNewPassword] =
    useState('')
  const [newRole, setNewRole] =
    useState('agent')
  const [newBalance, setNewBalance] =
    useState('')
  const [newAgentId, setNewAgentId] =
    useState('')
  const [showPw, setShowPw] = useState(false)
  const [creating, setCreating] =
    useState(false)
  const [agents, setAgents] = useState<any[]>(
    []
  )

  // Credits form
  const [creditAmount, setCreditAmount] =
    useState('')
  const [creditNote, setCreditNote] =
    useState('')
  const [addingCredits, setAddingCredits] =
    useState(false)

  useEffect(() => {
    loadUsers()
  }, [activeTab, search, page])

  useEffect(() => {
    if (showTree) loadTree()
  }, [showTree])

  useEffect(() => {
    if (showCreate) loadAgents()
  }, [showCreate])

  const loadUsers = async () => {
    setLoading(true)
    const { users: data, total: t } =
      await getAllUsers(activeTab, {
        search: search || undefined,
        page,
        limit: 20,
      })
    setUsers(data)
    setTotal(t)
    setLoading(false)
  }

  const loadTree = async () => {
    const data = await getHierarchyTree()
    setTree(data)
  }

  const loadAgents = async () => {
    const { users: data } =
      await getAllUsers('agent', {
        status: 'active',
        limit: 100,
      })
    setAgents(data)
  }

  const handleStatusChange = async (
    targetUser: any,
    status: 'active' | 'suspended'
  ) => {
    if (!user) return
    const result = await updateUserStatus(
      targetUser.id,
      status,
      user.id
    )
    if (result.success) {
      toast.success(
        `@${targetUser.username} ${status === 'suspended' ? 'suspended' : 'activated'}`
      )
      loadUsers()
    } else {
      toast.error(result.error)
    }
    setShowConfirm(false)
  }

  const handleForceLogout = async (
    targetUser: any
  ) => {
    if (!user) return
    const result = await forceLogout(
      targetUser.id,
      user.id
    )
    if (result.success) {
      toast.success(
        `@${targetUser.username} logged out`
      )
    } else {
      toast.error('Failed to logout user')
    }
  }

  const handleCreateUser = async () => {
    if (!user) return
    setCreating(true)

    const result = await createUser({
      username: newUsername.trim(),
      password: newPassword,
      role: newRole,
      initialBalance:
        parseFloat(newBalance) || 0,
      assignedAgentId:
        newRole === 'cashier'
          ? newAgentId
          : undefined,
      createdBy: user.id,
    })

    if (result.success) {
      toast.success(
        `@${newUsername} created!`
      )
      setShowCreate(false)
      setNewUsername('')
      setNewPassword('')
      setNewBalance('')
      setNewAgentId('')
      loadUsers()
    } else {
      toast.error(result.error)
    }
    setCreating(false)
  }

  const handleAddCredits = async () => {
    if (!user || !selectedUser) return
    setAddingCredits(true)

    const result = await addCreditsToUser(
      user.id,
      selectedUser.id,
      parseFloat(creditAmount) || 0,
      creditNote
    )

    if (result.success) {
      toast.success(
        `ETB ${creditAmount} added to @${selectedUser.username}`
      )
      setShowAddCredits(false)
      setCreditAmount('')
      setCreditNote('')
      loadUsers()
    } else {
      toast.error(result.error)
    }
    setAddingCredits(false)
  }

  const columns = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (v: any) => (
        <span className="text-gold font-medium">
          @{v}
        </span>
      ),
    },
    {
      key: 'credit_balance',
      label: 'Balance',
      sortable: true,
      render: (v: any) => (
        <span className="font-mono text-gold">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: any) => (
        <StatusBadge status={v} type="user" />
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (v: any) => (
        <span className="text-white/50 text-xs">
          {formatDate(v)}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedUser(row)
              setShowAddCredits(true)
            }}
            className="text-xs border border-gold/30 text-gold px-2 py-1 rounded hover:bg-gold/10"
          >
            💰
          </button>
          <button
            onClick={() => {
              setSelectedUser(row)
              setConfirmData({
                action:
                  row.status === 'active'
                    ? 'suspend'
                    : 'activate',
                user: row,
              })
              setShowConfirm(true)
            }}
            className={cn(
              'text-xs border px-2 py-1 rounded',
              row.status === 'active'
                ? 'border-nile-orange/30 text-nile-orange hover:bg-nile-orange/10'
                : 'border-nile-success/30 text-nile-success hover:bg-nile-success/10'
            )}
          >
            {row.status === 'active'
              ? '⏸'
              : '▶'}
          </button>
          <button
            onClick={() =>
              handleForceLogout(row)
            }
            className="text-xs border border-nile-danger/30 text-nile-danger px-2 py-1 rounded hover:bg-nile-danger/10"
          >
            🚪
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">
          User Management
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gold-light"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key)
              setPage(1)
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              activeTab === t.key
                ? 'bg-gold text-charcoal'
                : 'bg-slate-dark border border-nile-blue/30 text-white/60 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}

        {/* Hierarchy toggle */}
        <button
          onClick={() =>
            setShowTree(!showTree)
          }
          className="ml-auto text-xs border border-nile-blue/30 text-white/60 px-3 py-2 rounded-lg hover:text-white"
        >
          {showTree ? '▲ Hide' : '▼ Show'}{' '}
          Hierarchy
        </button>
      </div>

      {/* Hierarchy tree */}
      {showTree && (
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">
            Platform Hierarchy
          </h3>
          {tree.length === 0 ? (
            <p className="text-white/30 text-sm">
              No agents yet
            </p>
          ) : (
            tree.map((agent) => (
              <TreeNode
                key={agent.id}
                agent={agent}
                onUserClick={(u) => {
                  setSelectedUser(u)
                  setShowAddCredits(true)
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search by username..."
          className="w-full bg-slate-dark border border-nile-blue/30 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/40"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={loading}
        emptyMessage={`No ${activeTab}s found`}
      />

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() =>
              setPage((p) => Math.max(1, p - 1))
            }
            disabled={page === 1}
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-white/50 text-sm py-2">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={
              page >= Math.ceil(total / 20)
            }
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            Next &#8594;
          </button>
        </div>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          if (!confirmData) return
          handleStatusChange(
            confirmData.user,
            confirmData.action === 'suspend'
              ? 'suspended'
              : 'active'
          )
        }}
        title={
          confirmData?.action === 'suspend'
            ? 'Suspend User?'
            : 'Activate User?'
        }
        message={
          confirmData?.action === 'suspend'
            ? `Suspend @${confirmData?.user?.username}? They will be logged out.`
            : `Reactivate @${confirmData?.user?.username}?`
        }
        confirmText={
          confirmData?.action === 'suspend'
            ? 'Yes, Suspend'
            : 'Yes, Activate'
        }
        variant={
          confirmData?.action === 'suspend'
            ? 'danger'
            : 'warning'
        }
      />

      {/* Create User Modal */}
      <Dialog
        open={showCreate}
        onOpenChange={setShowCreate}
      >
        <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Create New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Role selector */}
            <div className="flex gap-2">
              {['agent', 'cashier', 'bettor'].map(
                (r) => (
                  <button
                    key={r}
                    onClick={() => setNewRole(r)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-semibold capitalize border',
                      newRole === r
                        ? 'bg-gold border-gold text-charcoal'
                        : 'border-nile-blue/30 text-white/60 hover:text-white'
                    )}
                  >
                    {r}
                  </button>
                )
              )}
            </div>

            {/* Username */}
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Username
              </label>
              <input
                value={newUsername}
                onChange={(e) =>
                  setNewUsername(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, '')
                  )
                }
                placeholder="username"
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={
                      showPw ? 'text' : 'password'
                    }
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="password"
                    className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none pr-8 font-mono"
                  />
                  <button
                    onClick={() =>
                      setShowPw(!showPw)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => {
                    const pw = generatePassword()
                    setNewPassword(pw)
                    setShowPw(true)
                  }}
                  className="p-2 border border-nile-blue/30 text-white/60 rounded-lg hover:text-white"
                  title="Generate password"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Initial balance */}
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Initial Balance (ETB)
              </label>
              <input
                type="number"
                value={newBalance}
                onChange={(e) =>
                  setNewBalance(e.target.value)
                }
                placeholder="0"
                min="0"
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none font-mono"
              />
              {user && (
                <p className="text-xs text-white/30 mt-1">
                  Your balance after:{' '}
                  {formatETB(
                    (user.credit_balance ?? 0) -
                      (parseFloat(newBalance) || 0)
                  )}
                </p>
              )}
            </div>

            {/* Agent selector for cashier */}
            {newRole === 'cashier' && (
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Assign to Agent
                </label>
                <select
                  value={newAgentId}
                  onChange={(e) =>
                    setNewAgentId(e.target.value)
                  }
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
                >
                  <option value="">
                    Select agent...
                  </option>
                  {agents.map((a) => (
                    <option
                      key={a.id}
                      value={a.id}
                    >
                      @{a.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() =>
                  setShowCreate(false)
                }
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={
                  creating ||
                  !newUsername ||
                  !newPassword
                }
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-semibold',
                  !creating &&
                    newUsername &&
                    newPassword
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                {creating
                  ? 'Creating...'
                  : 'Create User'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Credits Modal */}
      <Dialog
        open={showAddCredits}
        onOpenChange={setShowAddCredits}
      >
        <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              Add Credits to @
              {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">
                Admin balance:
              </span>
              <span className="text-gold font-mono">
                {formatETB(
                  user?.credit_balance ?? 0
                )}
              </span>
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Amount (ETB)
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) =>
                  setCreditAmount(e.target.value)
                }
                placeholder="0.00"
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Note (optional)
              </label>
              <input
                value={creditNote}
                onChange={(e) =>
                  setCreditNote(e.target.value)
                }
                placeholder="Reason for credit..."
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>
            {creditAmount && (
              <div className="bg-charcoal/50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/50">
                    @{selectedUser?.username}{' '}
                    after:
                  </span>
                  <span className="text-nile-success font-mono">
                    {formatETB(
                      (selectedUser?.credit_balance ?? 0) +
                        (parseFloat(creditAmount) || 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">
                    Admin after:
                  </span>
                  <span className="text-nile-danger font-mono">
                    {formatETB(
                      (user?.credit_balance ?? 0) -
                        (parseFloat(creditAmount) || 0)
                    )}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setShowAddCredits(false)
                }
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                disabled={
                  addingCredits || !creditAmount
                }
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-semibold',
                  !addingCredits && creditAmount
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                {addingCredits
                  ? 'Adding...'
                  : 'Add Credits'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}