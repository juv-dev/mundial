import type { Match } from '../data/types'
import { MatchCard } from './MatchCard'

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
        <MatchCard key={m.id} match={m} />
      ))}
    </div>
  )
}
