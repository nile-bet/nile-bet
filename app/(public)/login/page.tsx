'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, User, Lock, Shield, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { loginUser } from '@/lib/actions/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')
    const result = await loginUser(username.trim(), password)
    if (result.success) {
      toast.success('Welcome back!')
      const role = result.role
      const dest = role === 'admin' ? '/dashboard' : role === 'agent' ? '/agent-dashboard' : role === 'cashier' ? '/cashier-dashboard' : '/'
      window.location.href = dest
    } else {
      setError(result.error ?? 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: '#0D1526' }}
    >
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Betting
        </Link>

        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showTagline />
          </div>
          <div className="h-px w-24 mx-auto mb-4" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />
          <p className="text-white/40 text-sm">Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 relative" style={{
          background: '#1A1F4D',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome Back</h1>
          <p className="mb-7" style={{ color: '#A9B4D0', fontSize: '14px' }}>Enter your credentials to access your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#A9B4D0' }}>Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D4AF37', opacity: 0.6 }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                  style={{
                    background: '#141F36',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                  onFocus={e => e.target.style.borderColor = '#FFD700'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#A9B4D0' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D4AF37', opacity: 0.6 }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3.5 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                  style={{
                    background: '#141F36',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
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

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 mt-2"
              style={{
                background: loading || !username || !password
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #D4AF37, #FFD700)',
                color: loading || !username || !password ? 'rgba(255,255,255,0.2)' : '#0D1526',
                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                boxShadow: loading || !username || !password ? 'none' : '0 4px 15px rgba(212,175,55,0.3)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: '#A9B4D0' }}>New to NILE Bet?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <Link href="/register"
            className="block w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all"
            style={{ border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700' }}>
            Create Account
          </Link>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <Shield className="w-3.5 h-3.5" style={{ color: '#D4AF37', opacity: 0.6 }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Secure & Trusted Betting Platform</span>
          </div>

          <p className="text-center text-xs mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Cashiers contact <span style={{ color: 'rgba(212,175,55,0.7)' }}>AGENTS</span> or email{' '}
            <a href="mailto:nilebetting@gmail.com" style={{ color: 'rgba(212,175,55,0.7)' }}>nilebetting@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
