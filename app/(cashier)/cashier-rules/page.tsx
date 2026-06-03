import { CashierFooter } from '@/components/shared/CashierFooter'

export default function CashierRulesPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-white mb-2">Rules & Regulations</h1>
      <p className="text-white/40 text-sm mb-8">NILE Bet Official Betting Rules</p>
      <div className="space-y-8 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">General Rules</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All bets must be placed before the match kicks off</li>
            <li>Minimum 4 selections required per bet slip</li>
            <li>Maximum odds per selection apply</li>
            <li>NILE Bet reserves the right to void any bet placed in error</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Settlement Rules</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Bets are settled based on official match results</li>
            <li>Abandoned matches will be voided</li>
            <li>15% tax applies to all winnings</li>
            <li>Payouts are processed within 24 hours</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Jackpot Rules</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Players must predict all 12 match outcomes</li>
            <li>Fixed entry fee applies per jackpot</li>
            <li>Near-win bonus for 11 correct predictions</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Responsible Gambling</h2>
          <p>Must be 18+ to bet. Gambling should be entertaining. Never bet more than you can afford to lose.</p>
        </section>
      </div>
      <CashierFooter />
    </div>
  )
}
