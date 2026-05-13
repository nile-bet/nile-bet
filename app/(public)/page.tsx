import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { MatchListClient }
  from '@/components/bettor/MatchListClient'
import {
  getUpcomingMatches,
  getCountriesWithLeagues,
  getTopLeagues,
  getPlatformSettings,
} from '@/lib/actions/matches'

export default async function HomePage() {
  const [
    initialMatches,
    countries,
    topLeagues,
    settings,
  ] = await Promise.all([
    getUpcomingMatches({ isTopLeagues: true }),
    getCountriesWithLeagues(),
    getTopLeagues(),
    getPlatformSettings(),
  ])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PublicNavbar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MatchListClient
          initialMatches={initialMatches}
          countries={countries}
          topLeagues={topLeagues}
          settings={settings}
        />
      </div>

      <Footer />
    </div>
  )
}