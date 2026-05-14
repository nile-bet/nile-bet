import { notFound } from 'next/navigation'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { SlipDetailCard }
  from '@/components/shared/SlipDetailCard'
import { getSlipById }
  from '@/lib/actions/bets'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SlipPage({
  params,
}: Props) {
  const { id } = await params
  const slip = await getSlipById(
    id.toUpperCase()
  )

  if (!slip) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <h1 className="font-display text-2xl font-bold text-white mb-6 text-center">
            Slip Details
          </h1>
          <SlipDetailCard
            slip={slip}
            showShareOptions
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}