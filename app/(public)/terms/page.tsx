import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { Footer } from '@/components/shared/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Terms & Conditions</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: January 2026</p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the NILE Bet platform, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. NILE Bet reserves the right to modify these terms at any time, and continued use of the platform constitutes acceptance of any changes.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Eligibility</h2>
            <p className="mb-2">To use NILE Bet services, you must:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Be at least 18 years of age</li>
              <li>Be legally permitted to participate in online sports betting in your jurisdiction</li>
              <li>Not be a resident of a jurisdiction where online betting is prohibited</li>
              <li>Register with accurate and truthful personal information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. Account Registration</h2>
            <p className="mb-2">Each user may only maintain one account. You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account. NILE Bet reserves the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Betting Rules</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All bets are subject to the minimum and maximum stake limits set by the platform</li>
              <li>Bets placed on closed or suspended markets will be voided</li>
              <li>NILE Bet reserves the right to void bets placed in error or due to technical issues</li>
              <li>Winnings are subject to a 15% withholding tax as required by law</li>
              <li>Bets cannot be cancelled after the cancellation window has passed</li>
              <li>Maximum payout per slip is subject to platform limits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Deposits & Withdrawals</h2>
            <p className="mb-2">All deposits and withdrawals are processed through authorized cashiers and agents. NILE Bet is not responsible for delays caused by third-party payment processors. Withdrawal requests are subject to verification and may require identity confirmation.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Responsible Gambling</h2>
            <p className="mb-2">NILE Bet is committed to promoting responsible gambling. We offer self-exclusion tools and encourage users to gamble responsibly. If you feel you have a gambling problem, please seek help from a professional organization. Users showing signs of problem gambling may have their accounts restricted.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Prohibited Activities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fraud, collusion, or manipulation of odds</li>
              <li>Use of automated betting systems or bots</li>
              <li>Creating multiple accounts to abuse bonuses</li>
              <li>Money laundering or any illegal financial activity</li>
              <li>Sharing account credentials with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Bonuses & Promotions</h2>
            <p>All bonuses and promotions are subject to specific terms and wagering requirements. NILE Bet reserves the right to modify, suspend, or cancel any promotion at any time. Abuse of bonus systems will result in account suspension and forfeiture of winnings.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">9. Limitation of Liability</h2>
            <p>NILE Bet shall not be liable for any losses arising from technical failures, system downtime, or events beyond our reasonable control. The platform is provided "as is" without warranties of any kind. Users bet at their own risk.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">10. Privacy</h2>
            <p>Your use of NILE Bet is also governed by our <a href="/privacy" className="text-gold hover:text-gold-light underline">Privacy Policy</a>, which is incorporated into these terms by reference.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">11. Governing Law</h2>
            <p>These terms are governed by the laws of the United Kingdom. Any disputes shall be resolved through binding arbitration in accordance with applicable law.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">12. Contact Us</h2>
            <p>For questions about these Terms & Conditions, contact us at <span className="text-gold">nilebetting@gmail.com</span> or call <span className="text-gold">+44 7788 443322</span>.</p>
          </section>

          <div className="border-t border-nile-blue/20 pt-6">
            <p className="text-white/30 text-xs">By using NILE Bet, you confirm that you have read, understood, and agree to these Terms & Conditions. Must be 18+ to bet. Please gamble responsibly.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
