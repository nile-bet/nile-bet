'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, User, Lock, Shield, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { loginUser } from '@/lib/actions/auth'
import { toast } from 'sonner'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuspended, setShowSuspended] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('suspended') === '1'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')
    const result = await loginUser(username.trim(), password)
    if (result.success) {
      toast.success('Welcome back!')
      const role = result.role
      const dest = role === 'admin' ? '/dashboard' : role === 'agent' ? '/agent-dashboard' : role === 'cashier' ? '/cashier-place-bet' : '/'
      window.location.href = dest
    } else {
      if (result.error === 'suspended') {
        setShowSuspended(true)
      } else {
        setError(result.error ?? 'Login failed')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 relative" style={{ background: '#0D1526' }}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-sm mb-4 transition-colors" style={{ color: '#FFD700' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to Betting
        </Link>
        <div className="rounded-2xl p-7 relative" style={{
          background: '#1A1F4D',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
          {/* Logo + subtitle inside card */}
          <div className="text-center mb-5">
            <div className="flex justify-center mb-2">
              <Logo size="sm" showTagline />
            </div>
            <div className="h-px w-24 mx-auto mb-2" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />
            <p className="text-white/40 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A9B4D0' }}>Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D4AF37', opacity: 0.6 }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                  style={{ background: '#141F36', border: '1px solid rgba(255,255,255,0.10)' }}
                  onFocus={e => e.target.style.borderColor = '#FFD700'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A9B4D0' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D4AF37', opacity: 0.6 }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-2.5 rounded-lg text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                  style={{ background: '#141F36', border: '1px solid rgba(255,255,255,0.10)' }}
                  onFocus={e => e.target.style.borderColor = '#FFD700'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
              style={{
                background: loading || !username || !password ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #D4AF37, #FFD700)',
                color: loading || !username || !password ? 'rgba(255,255,255,0.2)' : '#0D1526',
                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                boxShadow: loading || !username || !password ? 'none' : '0 4px 15px rgba(212,175,55,0.3)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: '#A9B4D0' }}>New to NILE Bet?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <Link href="/register"
            className="block w-full py-2.5 rounded-xl font-semibold text-sm text-center transition-all"
            style={{ border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700' }}>
            Create Account
          </Link>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Shield className="w-3.5 h-3.5" style={{ color: '#D4AF37', opacity: 0.6 }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Secure & Trusted Betting Platform</span>
          </div>

          <p className="text-center text-xs mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Cashiers contact <span style={{ color: 'rgba(212,175,55,0.7)' }}>AGENTS</span> or email{' '}
            <a href="mailto:nilebetting@gmail.com" style={{ color: 'rgba(212,175,55,0.7)' }}>nilebetting@gmail.com</a>
          </p>
        </div>
      </div>

      {showSuspended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: '#1A1F4D', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <span className="text-3xl">🚫</span>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Account Suspended</h2>
            <p className="text-sm mb-6" style={{ color: '#A9B4D0' }}>
              Your account has been suspended. Please contact your <span className="text-gold font-semibold">Agent</span> or the <span className="text-gold font-semibold">Admin</span> to resolve this issue.
            </p>
            <div className="rounded-xl px-4 py-3 mb-6 text-left" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs" style={{ color: '#A9B4D0' }}>For support, contact:</p>
              <p className="text-sm text-white font-medium mt-1">📧 nilebetting@gmail.com</p>
              <p className="text-xs mt-1" style={{ color: '#A9B4D0' }}>or visit your nearest Nile Betting Shop</p>
            </div>
            <button
              onClick={() => setShowSuspended(false)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
