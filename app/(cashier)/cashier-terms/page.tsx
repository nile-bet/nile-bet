import { CashierFooter } from '@/components/shared/CashierFooter'

export default function CashierTermsPage() {
  return (
    <div className="py-4 max-w-3xl" style={{ paddingLeft: "8.75rem", paddingRight: "8.75rem" }}>
      <h1 className="font-display text-3xl font-bold text-white mb-2">Terms & Conditions</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: January 2026</p>
      <div className="space-y-8 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using the NILE Bet platform, you agree to be bound by these Terms and Conditions. NILE Bet reserves the right to modify these terms at any time.</p>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">2. Eligibility</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Must be at least 18 years of age</li>
            <li>Must be legally permitted to participate in sports betting</li>
            <li>Must register with accurate personal information</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">3. Betting Rules</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All bets are subject to minimum and maximum stake limits</li>
            <li>Bets placed on closed markets will be voided</li>
            <li>Winnings are subject to 15% withholding tax</li>
            <li>Bets cannot be cancelled after the cancellation window</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">4. Responsible Gambling</h2>
          <p>NILE Bet is committed to promoting responsible gambling. If you feel you have a gambling problem, please seek professional help.</p>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">5. Contact Us</h2>
          <p>For questions, contact us at <span className="text-gold">nilebetting@gmail.com</span> or call <span className="text-gold">+44 7788 443322</span>.</p>
        </section>
      </div>
      <CashierFooter />
    </div>
  )
}
