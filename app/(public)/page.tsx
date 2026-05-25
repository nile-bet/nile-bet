import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { Footer } from '@/components/shared/Footer'
import { MatchListClient } from '@/components/bettor/MatchListClient'
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
    getUpcomingMatches({}),
    getCountriesWithLeagues(),
    getTopLeagues(),
    getPlatformSettings(),
  ])

  return (
    <div className="flex flex-col bg-charcoal">
      <div className="sticky top-0 z-50">
        <PublicNavbar />
      </div>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
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
