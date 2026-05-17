import {
  getUpcomingMatches,
  getCountriesWithLeagues,
  getTopLeagues,
  getPlatformSettings,
} from '@/lib/actions/matches'
import { CashierPlaceBetClient }
  from '@/components/cashier/CashierPlaceBetClient'

export default async function CashierPlaceBetPage() {
  const [
    initialMatches,
    countries,
    topLeagues,
    settings,
  ] = await Promise.all([
    getUpcomingMatches({
      isTopLeagues: true,
    }),
    getCountriesWithLeagues(),
    getTopLeagues(),
    getPlatformSettings(),
  ])

  return (
    <CashierPlaceBetClient
      initialMatches={initialMatches}
      countries={countries}
      topLeagues={topLeagues}
      settings={settings}
    />
  )
}