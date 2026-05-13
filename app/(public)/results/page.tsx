import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { createClient }
  from '@/lib/supabase/server'
import { formatDate }
  from '@/lib/utils/formatCurrency'
import { EmptyState }
  from '@/components/shared/EmptyState'
import { Trophy } from 'lucide-react'

export default async function ResultsPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      leagues (name, countries (flag_emoji, name)),
      match_results (*)
    `)
    .eq('status', 'finished')
    .order('kick_off_time', {
      ascending: false,
    })
    .limit(50)

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-white mb-6">
          Results
        </h1>

        {!matches || matches.length === 0 ? (
          <EmptyState
            title="No results yet"
            message="Finished match results will appear here"
            icon={Trophy}
          />
        ) : (
          <div className="space-y-3">
            {matches.map((match: any) => {
              const result =
                match.match_results?.[0]
              const league = match.leagues
              const country =
                league?.countries
              return (
                <div
                  key={match.id}
                  className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-gold/60">
                      {country?.flag_emoji}{' '}
                      {country?.name} -{' '}
                      {league?.name}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {formatDate(
                        match.kick_off_time
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium flex-1">
                      {match.home_team}
                    </span>
                    <div className="text-center px-4">
                      {result ? (
                        <span className="text-gold font-mono text-xl font-bold">
                          {result.ft_home} -{' '}
                          {result.ft_away}
                        </span>
                      ) : (
                        <span className="text-white/30 text-sm">
                          vs
                        </span>
                      )}
                    </div>
                    <span className="text-white font-medium flex-1 text-right">
                      {match.away_team}
                    </span>
                  </div>
                  {result &&
                    result.ht_home !==
                      null && (
                      <p className="text-center text-[11px] text-white/30 mt-1">
                        HT: {result.ht_home}{' '}
                        - {result.ht_away}
                      </p>
                    )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}