import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const sections = [
  {
    id: '1',
    title: '1. General Betting Rules',
    content: `
      Acceptance of Bets: All bets are subject to availability and acceptance by NILE Bet. Bets are only valid once confirmed and a unique 8-digit Slip ID is generated. NILE Bet reserves the right to void or limit any bet at its discretion.

      Settlement: All bets settled based on official results. Settlement occurs within 24 hours of event completion. In disputes, NILE Bet's decision is final.

      Winning Tax: A 15% winning tax is deducted from all winning payouts. Net Payout = Max Payout × 0.85. Tax is automatically deducted at redemption.
    `,
  },
  {
    id: '2',
    title: '2. Odds & Market Rules',
    content: `
      Market Label Corrections: Due to data variations, certain market labels may differ. NILE Bet reserves the right to correct these labels. The recorded odd at time of placement remains unchanged.

      All odds are sourced from our admin team. Odds are set until match kick-off. Odds at time of placement are final for that bet.
    `,
  },
  {
    id: '3',
    title: '3. Match & Event Rules',
    content: `
      ⚠️ ALL bets placed after kick-off are VOID. No exceptions — even if placed seconds after kick-off.

      Postponed matches: Bets remain valid if match replays within 48 hours. Otherwise bets are voided and full stake refunded.

      Extra time & penalties: Standard markets settle on 90-minute result only. Injury time IS included. Extra time & penalties do NOT count unless explicitly stated.
    `,
  },
  {
    id: '4',
    title: '4. Corners & Goals Markets',
    content: `
      Corners: Retaken corners count as one. Minimum line: Over 6.5.

      Goals Over/Under: Available lines 0.5 through 6.5. Own goals count towards total. Extra time goals do NOT count.

      Odds restrictions: Over 1.5 Goals max odd 1.50. Over 2.5 Goals max odd 2.50. Over 3.5 Goals max odd 4.00.
    `,
  },
  {
    id: '5',
    title: '5. Payouts & Redemption',
    content: `
      Maximum instant redemption: ETB 150,000. Payouts above this limit require manual cashier approval.

      Maximum potential win per slip: ETB 500,000.

      One Loss Insurance (10+ selections):
      - Exactly 1 loss &#8594; 2% of Net Payout credited
      - Exactly 2 losses &#8594; 1% of Net Payout credited
      - Exactly 3 losses &#8594; Full stake refunded (no tax)
      - 4+ losses &#8594; Standard lost slip

      Cancelled bets: Cancelled selections in an accumulator have their odds set to 1.00. If all selections void, full stake refunded.
    `,
  },
  {
    id: '6',
    title: '6. Accumulator Rules',
    content: `
      All selections must win for the accumulator to pay out.

      Minimum 4 selections required (admin adjustable). No maximum selection limit.

      Related selections from the same match are permitted (e.g. Match Winner + Over 2.5 Goals).

      Maximum potential win per slip: ETB 500,000.
    `,
  },
  {
    id: '7',
    title: '7. Disputes & Liability',
    content: `
      All disputes must be raised within 7 days of bet settlement via your cashier or admin.

      Provide your Slip ID and a description of the issue. NILE Bet's decision is final.

      Obvious pricing errors may result in bet cancellation at NILE Bet's discretion.

      Maximum liability is limited to the stake amount of the bet in question.
    `,
  },
  {
    id: '8',
    title: '8. Responsible Betting',
    content: `
      Age Restriction: You must be 18 years or older to place bets. Underage betting is strictly prohibited.

      Self-exclusion: Contact admin to temporarily or permanently deactivate your account. Pending bets will be settled normally.

      Signs of problem gambling — seek help if you notice:
      • Betting more than you can afford or planned
      • Borrowing money to bet or chasing losses
      • Lying about betting habits to family or friends

      Contact your cashier or admin for support, disputes, or self-exclusion requests.
    `,
  },
]

export default function RulesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-widest text-gold uppercase mb-2">
            Legal — Terms of Service
          </p>
          <h1 className="font-display text-3xl font-bold text-white mb-3">
            Rules & Regulations
          </h1>
          <p className="text-white/50 text-sm">
            Please read before placing any
            bets. All bets are subject to
            these terms. Last updated: 2025.
          </p>
        </div>

        {/* Important notice */}
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-8">
          <p className="text-gold font-semibold text-sm mb-1">
            IMPORTANT NOTICE
          </p>
          <p className="text-white/70 text-sm leading-relaxed">
            By placing a bet with NILE Bet,
            you confirm that you have read,
            understood, and agree to these
            rules. NILE Bet reserves the
            right to amend these rules at
            any time without prior notice.
          </p>
        </div>

        {/* Accordion */}
        <Accordion
          type="single"
          collapsible
          className="space-y-3"
        >
          {sections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="bg-slate-dark border border-nile-blue/30 rounded-xl overflow-hidden"
            >
              <AccordionTrigger className="px-5 py-4 text-white font-medium hover:text-gold hover:no-underline text-left">
                {section.title}
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>

      <Footer />
    </div>
  )
}