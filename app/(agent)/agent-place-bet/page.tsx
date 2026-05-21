import {
  getUpcomingMatches,
  getCountriesWithLeagues,
  getTopLeagues,
  getPlatformSettings,
} from '@/lib/actions/matches'
import { getActiveJackpot }
  from '@/lib/actions/jackpot'
import { AgentPlaceBetClient }
  from '@/components/agent/AgentPlaceBetClient'
import { Footer } from '@/components/shared/Footer'

export default async function AgentPlaceBetPage() {
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
      <AgentPlaceBetClient
        initialMatches={initialMatches}
        countries={countries}
        topLeagues={topLeagues}
        settings={settings}
        jackpot={jackpot}
      />
      <Footer />
    </>
  )
}