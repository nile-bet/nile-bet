'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Check, X, Loader2, User, Lock, Shield, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { registerBettor, checkUsernameAvailable } from '@/lib/actions/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (username.length < 3) { setAvailable(null); return }
    const timer = setTimeout(async () => {
      setChecking(true)
      const ok = await checkUsernameAvailable(username)
      setAvailable(ok)
      setChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [username])

  const pwStrength = () => {
    let score = 0
    if (password.length >= 8) score++
    if (/[0-9]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (password.length >= 12) score++
    return score
  }
  const strength = pwStrength()
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][strength]

  const canSubmit = username.length >= 3 && available === true && password.length >= 8 && password === confirm && agreed && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const result = await registerBettor(username.trim(), password)
    if (result.success) {
      toast.success('🌊 Welcome to NILE Bet!')
      window.location.href = '/'
    } else {
      setError(result.error ?? 'Registration failed')
    }
    setLoading(false)
  }

  const inputStyle = {
    background: '#141F36',
    border: '1px solid rgba(255,255,255,0.10)',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: '#0D1526' }}
    >
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Betting
        </Link>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showTagline />
          </div>
          <div className="h-px w-24 mx-auto mb-4" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />
          <p className="text-white/40 text-sm">Create your account and start winning</p>
        </div>

        <div className="rounded-2xl p-8" style={{
          background: '#1A1F4D',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Create Account</h1>
          <p className="mb-7 text-sm" style={{ color: '#A9B4D0' }}>Join thousands of winners on NILE Bet</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#A9B4D0' }}>Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D4AF37', opacity: 0.6 }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. john_bettor"
                  maxLength={20}
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-3.5 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                  style={{
                    ...inputStyle,
                    borderColor: available === true ? 'rgba(34,197,94,0.5)' : available === false ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'
                  }}
                  onFocus={e => { if (available === null) e.target.style.borderColor = '#FFD700' }}
                  onBlur={e => { if (available === null) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {checking ? <Loader2 className="w-4 h-4 text-white/30 animate-spin" /> :
                   available === true ? <Check className="w-4 h-4" style={{ color: '#22c55e' }} /> :
                   available === false ? <X className="w-4 h-4" style={{ color: '#ef4444' }} /> : null}
                </div>
              </div>
              {available === true && <p className="text-xs mt-1" style={{ color: '#22c55e' }}>✓ Username available</p>}
              {available === false && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>✗ Username already taken</p>}
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Letters, numbers and underscores (3-20 chars)</p>
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
                  placeholder="Min 8 characters"
                  disabled={loading}
                  className="w-full pl-10 pr-12 py-3.5 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#FFD700'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: i <= strength ? strengthColor : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#A9B4D0' }}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D4AF37', opacity: 0.6 }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none transition-all"
                  style={{
                    ...inputStyle,
                    borderColor: confirm.length > 0 ? (password === confirm ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') : 'rgba(255,255,255,0.08)'
                  }}
                  onFocus={e => { if (!confirm.length) e.target.style.borderColor = '#FFD700' }}
                  onBlur={e => { if (!confirm.length) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }}
                />
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Passwords do not match</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => setAgreed(!agreed)}
                className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center mt-0.5 transition-all"
                style={{
                  background: agreed ? 'linear-gradient(135deg, #D4AF37, #FFD700)' : 'transparent',
                  border: agreed ? '1px solid #D4AF37' : '1px solid rgba(212,175,55,0.3)'
                }}>
                {agreed && <Check className="w-3 h-3" style={{ color: '#0D1526' }} />}
              </button>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                I agree to the{' '}
                <Link href="/terms" target="_blank" style={{ color: '#D4AF37' }}>Terms & Conditions</Link>
                {' '}and{' '}
                <Link href="/rules" target="_blank" style={{ color: '#D4AF37' }}>Rules & Regulations</Link>
              </p>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200"
              style={{
                background: canSubmit ? 'linear-gradient(135deg, #D4AF37, #FFD700)' : 'rgba(255,255,255,0.06)',
                color: canSubmit ? '#0D1526' : 'rgba(255,255,255,0.2)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit ? '0 4px 15px rgba(212,175,55,0.3)' : 'none',
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: '#A9B4D0' }}>Already have an account?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <Link href="/login"
            className="block w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all"
            style={{ border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700' }}>
            Sign In
          </Link>

          <div className="flex items-center justify-center gap-2 mt-6">
            <Shield className="w-3.5 h-3.5" style={{ color: '#D4AF37', opacity: 0.6 }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Secure & Trusted Betting Platform</span>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Cashiers contact <span style={{ color: 'rgba(212,175,55,0.7)' }}>AGENTS</span> or email{' '}
            <a href="mailto:nilebetting@gmail.com" style={{ color: 'rgba(212,175,55,0.7)' }}>nilebetting@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
