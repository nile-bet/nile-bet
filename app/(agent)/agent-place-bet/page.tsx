import {
  getUpcomingMatches,
  getCountriesWithLeagues,
  getTopLeagues,
  getPlatformSettings,
} from '@/lib/actions/matches'
import { AgentPlaceBetClient }
  from '@/components/agent/AgentPlaceBetClient'
import { Footer } from '@/components/shared/Footer'

export default async function AgentPlaceBetPage() {
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
    <>
      <AgentPlaceBetClient
        initialMatches={initialMatches}
        countries={countries}
        topLeagues={topLeagues}
        settings={settings}
      />
      <Footer />
    </>
  )
}