import { notFound } from 'next/navigation'
import { MatchPageClient } from '@/components/bettor/MatchPageClient'
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

  return <MatchPageClient match={match} settings={settings} />
}
