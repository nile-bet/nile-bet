import Link from 'next/link'
import { Logo }
  from '@/components/shared/Logo'
import { Button }
  from '@/components/ui/button'
import { ShieldX } from 'lucide-react'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" showTagline />
        </div>
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-nile-danger/20 rounded-full">
            <ShieldX className="w-12 h-12 text-nile-danger" />
          </div>
        </div>
        <h1 className="text-2xl font-display font-bold text-white mb-3">
          Account Suspended
        </h1>
        <p className="text-white/60 text-sm mb-8 leading-relaxed">
          Your account has been suspended.
          Please contact your administrator
          for assistance.
        </p>
        <Link href="/login">
          <Button className="bg-gold text-charcoal hover:bg-gold-light font-semibold">
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  )
}