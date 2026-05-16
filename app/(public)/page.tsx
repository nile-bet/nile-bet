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
    <div className="flex flex-col min-h-screen bg-charcoal">
      {/* Sticky Navbar */}
      <PublicNavbar />

      {/* Main 3-column area — fixed height, no scroll on outer */}
      <div
        className="flex flex-col flex-1"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        <MatchListClient
          initialMatches={initialMatches}
          countries={countries}
          topLeagues={topLeagues}
          settings={settings}
        />
      </div>

      {/* Footer — full width, below the 3 columns */}
      <Footer />
    </div>
  )
}
