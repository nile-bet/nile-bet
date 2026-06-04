import { notFound } from 'next/navigation'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { BetSlipSidebar }
  from '@/components/bettor/BetSlipSidebar'
import { MatchDetailClient }
  from '@/components/bettor/MatchDetailClient'
import {
  getMatchWithAllMarkets,
  getPlatformSettings,
} from '@/lib/actions/matches'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MatchPage({
  params,
}: Props) {
  const { id } = await params

  const [match, settings] =
    await Promise.all([
      getMatchWithAllMarkets(id),
      getPlatformSettings(),
    ])

  if (!match) notFound()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PublicNavbar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MatchDetailClient match={match} />
        </div>
        <BetSlipSidebar settings={settings} />
      </div>
    </div>
  )
}
