import {
  getUpcomingMatches,
  getCountriesWithLeagues,
  getTopLeagues,
  getPlatformSettings,
} from '@/lib/actions/matches'
import { getActiveJackpot }
  from '@/lib/actions/jackpot'
import { CashierPlaceBetClient }
  from '@/components/cashier/CashierPlaceBetClient'
import { CashierFooter } from '@/components/shared/CashierFooter'

export default async function CashierPlaceBetPage() {
  const [
    initialMatches,
    countries,
    topLeagues,
    settings,
    jackpot,
  ] = await Promise.all([
    getUpcomingMatches({
      isTopLeagues: true,
    }),
    getCountriesWithLeagues(),
    getTopLeagues(),
    getPlatformSettings(),
    getActiveJackpot(),
  ])

  return (
    <>
      <CashierPlaceBetClient
        initialMatches={initialMatches}
        countries={countries}
        topLeagues={topLeagues}
        settings={settings}
        jackpot={jackpot}
      />
      <CashierFooter />
    </>
  )
}