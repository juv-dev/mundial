import type { Match } from '../data/types'
import { Flag, teamName } from './shared'
import { useLocale } from '../i18n/locale'

export function FeaturedMatches({ matches }: { matches: Match[] }) {
  const nowMs = Date.now()

  const byDate = (a: Match, b: Match): number => {
    const da = a.utcDate ? Date.parse(a.utcDate) : Infinity
    const db = b.utcDate ? Date.parse(b.utcDate) : Infinity
    return da - db
  }

  const upcoming = matches
    .filter((m) => m.status === 'scheduled' && m.home && m.away && (!m.utcDate || Date.parse(m.utcDate) > nowMs))
    .sort(byDate)

  const featured = upcoming.slice(0, 3)
  if (!featured.length) return null

  return (
    <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3">
      {featured.map((m) => (
        <FeaturedCard key={m.id} match={m} />
      ))}
    </div>
  )
}

function FeaturedCard({ match }: { match: Match }) {
  const { formatDateTime } = useLocale()
  const kickoffDisplay = formatDateTime(match.utcDate ?? match.kickoff)

  return (
    <div className="card w-full p-4">
      <div className="flex items-center justify-center mb-3">
        <span className="text-base font-bold text-cal text-center leading-tight">
          {kickoffDisplay}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <div className="truncate font-semibold text-sm text-cal">
              {match.home ? teamName(match.home) : match.homeSlot ?? 'Por definir'}
            </div>
          </div>
          <Flag team={match.home} />
        </div>
        <span className="text-tiza/40 text-xs shrink-0">vs</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Flag team={match.away} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-sm text-cal">
              {match.away ? teamName(match.away) : match.awaySlot ?? 'Por definir'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
