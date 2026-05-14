import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { Footer } from '@/components/shared/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-white mb-6">Privacy Policy</h1>
        <div className="space-y-6 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Information We Collect</h2>
            <p>We collect account information (username), betting activity data, and device usage data to provide our services.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">How We Use Your Information</h2>
            <p>To provide betting services, process transactions, send notifications, and improve our platform.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Data Security</h2>
            <p>All data is encrypted and stored securely. We do not share your information with third parties without consent.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Your Rights</h2>
            <p>You may request access to your data, deletion of your account, or contact us for any data-related requests.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Contact</h2>
            <p>elitebet Ltd. | Mail Box Office 66 95, Wilton Rd London | +44 7788 443322</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}