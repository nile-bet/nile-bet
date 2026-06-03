import { CashierFooter } from '@/components/shared/CashierFooter'

export default function CashierPrivacyPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: January 2026</p>
      <div className="space-y-8 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">1. Information We Collect</h2>
          <p>We collect information you provide during registration including username, contact details, and transaction history necessary to operate the platform.</p>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and improve our betting services</li>
            <li>To process transactions and verify identity</li>
            <li>To comply with legal obligations</li>
            <li>To send important account notifications</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">3. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information. Your data is encrypted and stored securely.</p>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">4. Contact Us</h2>
          <p>For privacy concerns, contact us at <span className="text-gold">nilebetting@gmail.com</span>.</p>
        </section>
      </div>
      <CashierFooter />
    </div>
  )
}
