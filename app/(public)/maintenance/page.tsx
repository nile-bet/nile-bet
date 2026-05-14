import { Logo } from '@/components/shared/Logo'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-6"><Logo size="lg" showTagline /></div>
        <h1 className="text-3xl font-display font-bold text-white mb-3">🔧 Under Maintenance</h1>
        <p className="text-white/60">We will be back shortly. Please check back later.</p>
      </div>
    </div>
  )
}