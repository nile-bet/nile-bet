import { CashierFooter } from '@/components/shared/CashierFooter'
import { Logo } from '@/components/shared/Logo'

export default function CashierAboutPage() {
  return (
    <div className="py-4 max-w-3xl" style={{ paddingLeft: "8.75rem", paddingRight: "8.75rem" }}>
      <div className="flex justify-center mb-8">
        <Logo size="lg" showTagline />
      </div>
      <h1 className="font-display text-3xl font-bold text-white mb-4 text-center">About NILE Bet</h1>
      <div className="space-y-6 text-white/70 text-sm leading-relaxed">
        <p>NILE Bet is Ethiopia's premier sports betting platform, offering the most competitive odds across 100+ markets and 50+ leagues worldwide.</p>
        <p>We are committed to providing a safe, fair, and entertaining betting experience for all our users. Our platform is built with cutting-edge technology to ensure fast, reliable, and secure transactions.</p>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Our Mission</h2>
          <p>To provide Ethiopians with a world-class sports betting experience that is transparent, fair, and responsible.</p>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Contact</h2>
          <p>Email: <span className="text-gold">nilebetting@gmail.com</span></p>
          <p>Phone: <span className="text-gold">+44 7788 443322</span></p>
        </section>
      </div>
      <div className="mt-8">
        <CashierFooter />
      </div>
    </div>
  )
}
