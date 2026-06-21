import type { GroupRow, Group, Match } from './types'

export function teamForm(code: string, matches: Match[]): ('W' | 'D' | 'L')[] {
  const finished = matches.filter(
    (m) =>
      m.status === 'finished' &&
      m.home !== null &&
      m.away !== null &&
      (m.home.code === code || m.away.code === code),
  )

  finished.sort((a, b) => {
    const da = a.utcDate ? Date.parse(a.utcDate) : Infinity
    const db = b.utcDate ? Date.parse(b.utcDate) : Infinity
    return da - db
  })

  return finished.slice(-5).map((m) => {
    const isHome = m.home!.code === code
    if (m.homeScore === m.awayScore) return 'D'
    const homeWon = m.homeScore > m.awayScore
    return (isHome ? homeWon : !homeWon) ? 'W' : 'L'
  })
}

export function computeStandings(group: Group, matches: Match[]): GroupRow[] {
  const rows = new Map<string, GroupRow>()
  for (const t of group.teams) {
    rows.set(t.code, {
      team: t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    })
  }

  const counted = matches.filter(
    (m) => m.group === group.name && m.status === 'finished',
  )

  for (const m of counted) {
    if (!m.home || !m.away) continue
    const h = rows.get(m.home.code)
    const a = rows.get(m.away.code)
    if (!h || !a) continue
    h.played++
    a.played++
    h.goalsFor += m.homeScore
    h.goalsAgainst += m.awayScore
    a.goalsFor += m.awayScore
    a.goalsAgainst += m.homeScore
    if (m.homeScore > m.awayScore) {
      h.won++
      h.points += 3
      a.lost++
    } else if (m.homeScore < m.awayScore) {
      a.won++
      a.points += 3
      h.lost++
    } else {
      h.drawn++
      a.drawn++
      h.points++
      a.points++
    }
  }

  for (const r of rows.values()) r.goalDiff = r.goalsFor - r.goalsAgainst

  return [...rows.values()].sort(
    (x, y) => y.points - x.points || y.goalDiff - x.goalDiff || y.goalsFor - x.goalsFor,
  )
}

export function bestThirds(groups: Group[], matches: Match[]): Set<string> {
  const thirds = groups
    .map((g) => computeStandings(g, matches)[2])
    .filter((row): row is GroupRow => !!row)
  thirds.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
  return new Set(thirds.slice(0, 8).map((r) => r.team.code))
}
