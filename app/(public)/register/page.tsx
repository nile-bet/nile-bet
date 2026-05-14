'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Check, X,
  Loader2 } from 'lucide-react'
import { Logo }
  from '@/components/shared/Logo'
import {
  registerBettor,
  checkUsernameAvailable,
} from '@/lib/actions/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const [username, setUsername] =
    useState('')
  const [password, setPassword] =
    useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] =
    useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)

  // Username availability
  const [checking, setChecking] =
    useState(false)
  const [available, setAvailable] = useState<
    boolean | null
  >(null)

  const router = useRouter()

  // Debounced username check
  useEffect(() => {
    if (username.length < 3) {
      setAvailable(null)
      return
    }
    const timer = setTimeout(async () => {
      setChecking(true)
      const ok =
        await checkUsernameAvailable(username)
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
  const strengthLabel = [
    '',
    'Weak',
    'Fair',
    'Good',
    'Strong',
  ][strength]
  const strengthColor = [
    '',
    'bg-nile-danger',
    'bg-nile-orange',
    'bg-yellow-400',
    'bg-nile-success',
  ][strength]

  const canSubmit =
    username.length >= 3 &&
    available === true &&
    password.length >= 8 &&
    password === confirm &&
    agreed &&
    !loading

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError('')

    const result = await registerBettor(
      username.trim(),
      password
    )

    if (result.success) {
      toast.success(
        '🌊 Welcome to NILE Bet! Top up to start betting.'
      )
      router.push('/')
      router.refresh()
    } else {
      setError(
        result.error ?? 'Registration failed'
      )
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" showTagline />
        </div>

        {/* Card */}
        <div className="bg-slate-dark border border-nile-blue/40 rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">
            Create Account
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Join NILE Bet today
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Username */}
            <div>
              <label className="text-sm text-white/70 block mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .toLowerCase()
                        .replace(
                          /[^a-z0-9_]/g,
                          ''
                        )
                    )
                  }
                  placeholder="e.g. john_bettor"
                  maxLength={20}
                  className={cn(
                    'w-full bg-charcoal border rounded-lg px-4 py-3 pr-10 text-white placeholder:text-white/30 focus:outline-none text-sm',
                    available === true
                      ? 'border-nile-success/50'
                      : available === false
                      ? 'border-nile-danger/50'
                      : 'border-gold/20 focus:border-gold/50'
                  )}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking ? (
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                  ) : available === true ? (
                    <Check className="w-4 h-4 text-nile-success" />
                  ) : available === false ? (
                    <X className="w-4 h-4 text-nile-danger" />
                  ) : null}
                </div>
              </div>
              {available === true && (
                <p className="text-nile-success text-xs mt-1">
                  ✓ Username available
                </p>
              )}
              {available === false && (
                <p className="text-nile-danger text-xs mt-1">
                  ✗ Username already taken
                </p>
              )}
              <p className="text-white/30 text-xs mt-1">
                Letters, numbers and underscores only (3-20 chars)
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-white/70 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={
                    showPw ? 'text' : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Min 8 characters"
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-4 py-3 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPw(!showPw)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i <= strength
                            ? strengthColor
                            : 'bg-white/10'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-sm text-white/70 block mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) =>
                  setConfirm(e.target.value)
                }
                placeholder="Repeat password"
                className={cn(
                  'w-full bg-charcoal border rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none text-sm',
                  confirm.length > 0
                    ? password === confirm
                      ? 'border-nile-success/50'
                      : 'border-nile-danger/50'
                    : 'border-gold/20 focus:border-gold/50'
                )}
                disabled={loading}
              />
              {confirm.length > 0 &&
                password !== confirm && (
                  <p className="text-nile-danger text-xs mt-1">
                    Passwords do not match
                  </p>
                )}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3">
              <div
                onClick={() =>
                  setAgreed(!agreed)
                }
                className={cn(
                  'w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center cursor-pointer mt-0.5 transition-colors',
                  agreed
                    ? 'bg-gold border-gold'
                    : 'border-gold/30 hover:border-gold/60'
                )}
              >
                {agreed && (
                  <Check className="w-3 h-3 text-charcoal" />
                )}
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                I agree to the{' '}
                <Link
                  href="/terms"
                  className="text-gold hover:text-gold-light"
                  target="_blank"
                >
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link
                  href="/rules"
                  className="text-gold hover:text-gold-light"
                  target="_blank"
                >
                  Rules & Regulations
                </Link>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg px-4 py-3">
                <p className="text-nile-danger text-sm">
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-full py-3 rounded-lg font-semibold text-sm transition-colors',
                canSubmit
                  ? 'bg-gold text-charcoal hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {loading
                ? 'Creating account...'
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-gold hover:text-gold-light"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}