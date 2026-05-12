import Link from 'next/link'
import { Logo }
  from '@/components/shared/Logo'
import { Button }
  from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" showTagline />
        </div>
        <h1 className="text-6xl font-display font-bold text-gold mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-white mb-3">
          Page Not Found
        </h2>
        <p className="text-white/60 text-sm mb-8">
          The page you are looking for
          does not exist.
        </p>
        <Link href="/">
          <Button className="bg-gold text-charcoal hover:bg-gold-light font-semibold">
            Go to Homepage
          </Button>
        </Link>
      </div>
    </div>
  )
}