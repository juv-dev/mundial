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
    (m) => m.group === group.name && (m.status === 'finished' || m.status === 'live' || m.status === 'half-time'),
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

export interface SimScore {
  h: number
  a: number
}

export function applySim(matches: Match[], sim: Record<string, SimScore>): Match[] {
  return matches.map((m) => {
    const s = sim[m.id]
    if (!s || m.status !== 'scheduled' || !m.home || !m.away) return m
    return { ...m, homeScore: s.h, awayScore: s.a, status: 'finished' as Match['status'] }
  })
}

export function bestThirds(groups: Group[], matches: Match[]): Set<string> {
  const thirds = groups
    .map((g) => computeStandings(g, matches)[2])
    .filter((row): row is GroupRow => !!row)
  thirds.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
  return new Set(thirds.slice(0, 8).map((r) => r.team.code))
}

export type QualTone = 'in' | 'out' | 'live'

export interface QualStatus {
  tone: QualTone
  label: string
}

const GROUP_MATCHES_PER_TEAM = 3

export function qualification(group: Group, matches: Match[]): Map<string, QualStatus> {
  const table = computeStandings(group, matches)
  const meta = table.map((row) => {
    const remaining = Math.max(0, GROUP_MATCHES_PER_TEAM - row.played)
    return { code: row.team.code, floor: row.points, ceil: row.points + 3 * remaining, remaining }
  })

  const result = new Map<string, QualStatus>()

  for (const t of meta) {
    const others = meta.filter((o) => o.code !== t.code)
    const canFinishAbove = others.filter((o) => o.ceil > t.floor).length
    const certainlyAbove = others.filter((o) => o.floor > t.ceil).length

    if (canFinishAbove < 2) {
      result.set(t.code, { tone: 'in', label: 'Clasificado' })
      continue
    }
    if (certainlyAbove >= 2) {
      result.set(t.code, { tone: 'out', label: 'Eliminado' })
      continue
    }
    if (t.remaining === 0) {
      result.set(t.code, { tone: 'live', label: 'Definido por desempate' })
      continue
    }
    const detailed = lastMatchdayScenario(group, matches, t.code)
    if (detailed) {
      result.set(t.code, { tone: 'live', label: detailed })
      continue
    }
    const groupRemaining = matches.filter(
      (m) => m.group === group.name && m.home && m.away && m.status !== 'finished',
    ).length
    result.set(t.code, {
      tone: 'live',
      label: groupRemaining <= 2 ? 'En disputa · la última fecha define' : 'En disputa',
    })
  }

  return result
}

type OtherRes = 'X' | 'D' | 'Y'

function lastMatchdayScenario(group: Group, matches: Match[], code: string): string | null {
  const remaining = matches.filter(
    (m) => m.group === group.name && m.home && m.away && m.status !== 'finished',
  )
  if (remaining.length !== 2) return null
  const involved = new Set<string>()
  remaining.forEach((m) => {
    involved.add(m.home!.code)
    involved.add(m.away!.code)
  })
  if (involved.size !== 4) return null

  const pts = new Map<string, number>()
  const gd = new Map<string, number>()
  for (const t of group.teams) {
    pts.set(t.code, 0)
    gd.set(t.code, 0)
  }
  for (const m of matches) {
    if (m.group !== group.name || m.status !== 'finished' || !m.home || !m.away) continue
    const h = m.home.code
    const a = m.away.code
    gd.set(h, (gd.get(h) ?? 0) + m.homeScore - m.awayScore)
    gd.set(a, (gd.get(a) ?? 0) + m.awayScore - m.homeScore)
    if (m.homeScore > m.awayScore) pts.set(h, (pts.get(h) ?? 0) + 3)
    else if (m.homeScore < m.awayScore) pts.set(a, (pts.get(a) ?? 0) + 3)
    else {
      pts.set(h, (pts.get(h) ?? 0) + 1)
      pts.set(a, (pts.get(a) ?? 0) + 1)
    }
  }

  const myMatch = remaining.find((m) => m.home!.code === code || m.away!.code === code)
  const otherMatch = remaining.find((m) => m !== myMatch)
  if (!myMatch || !otherMatch) return null
  const meHome = myMatch.home!.code === code
  const oppCode = meHome ? myMatch.away!.code : myMatch.home!.code
  const X = otherMatch.home!.code
  const Y = otherMatch.away!.code

  const qualifies = (my: 'W' | 'D' | 'L', other: OtherRes): boolean => {
    const p = new Map(pts)
    if (my === 'W') p.set(code, (p.get(code) ?? 0) + 3)
    else if (my === 'D') {
      p.set(code, (p.get(code) ?? 0) + 1)
      p.set(oppCode, (p.get(oppCode) ?? 0) + 1)
    } else p.set(oppCode, (p.get(oppCode) ?? 0) + 3)
    if (other === 'X') p.set(X, (p.get(X) ?? 0) + 3)
    else if (other === 'Y') p.set(Y, (p.get(Y) ?? 0) + 3)
    else {
      p.set(X, (p.get(X) ?? 0) + 1)
      p.set(Y, (p.get(Y) ?? 0) + 1)
    }
    const ranked = group.teams
      .map((t) => ({ code: t.code, pts: p.get(t.code) ?? 0, gd: gd.get(t.code) ?? 0 }))
      .sort((u, v) => v.pts - u.pts || v.gd - u.gd)
    return ranked.findIndex((r) => r.code === code) < 2
  }

  const all: OtherRes[] = ['X', 'D', 'Y']
  const winOk = all.filter((o) => qualifies('W', o))
  const drawOk = all.filter((o) => qualifies('D', o))
  const nameOf = (c: string) => group.teams.find((t) => t.code === c)?.name ?? c

  if (drawOk.length === 3) return 'Le alcanza con empatar'
  if (winOk.length === 3) return 'Gana y clasifica'
  if (winOk.length === 0) return 'Solo con otros resultados'

  const has = (o: OtherRes) => winOk.includes(o)
  let cond = 'otros resultados'
  if (has('X') && !has('D') && !has('Y')) cond = `que gane ${nameOf(X)}`
  else if (has('Y') && !has('D') && !has('X')) cond = `que gane ${nameOf(Y)}`
  else if (has('D') && !has('X') && !has('Y')) cond = `que empaten ${nameOf(X)} y ${nameOf(Y)}`
  else if (has('X') && has('D') && !has('Y')) cond = `que no gane ${nameOf(Y)}`
  else if (has('Y') && has('D') && !has('X')) cond = `que no gane ${nameOf(X)}`
  else if (has('X') && has('Y') && !has('D')) cond = `que no empaten ${nameOf(X)} y ${nameOf(Y)}`
  return `Gana y ${cond}`
}

type Res = 0 | 1 | 2

export interface ScenarioLine {
  tone: QualTone
  text: string
}

function baseStats(group: Group, matches: Match[]): { pts: Map<string, number>; gd: Map<string, number> } {
  const pts = new Map<string, number>()
  const gd = new Map<string, number>()
  for (const t of group.teams) {
    pts.set(t.code, 0)
    gd.set(t.code, 0)
  }
  for (const m of matches) {
    if (m.group !== group.name || m.status !== 'finished' || !m.home || !m.away) continue
    const h = m.home.code
    const a = m.away.code
    gd.set(h, (gd.get(h) ?? 0) + m.homeScore - m.awayScore)
    gd.set(a, (gd.get(a) ?? 0) + m.awayScore - m.homeScore)
    if (m.homeScore > m.awayScore) pts.set(h, (pts.get(h) ?? 0) + 3)
    else if (m.homeScore < m.awayScore) pts.set(a, (pts.get(a) ?? 0) + 3)
    else {
      pts.set(h, (pts.get(h) ?? 0) + 1)
      pts.set(a, (pts.get(a) ?? 0) + 1)
    }
  }
  return { pts, gd }
}

function applyRes(pts: Map<string, number>, m: Match, r: Res): void {
  const h = m.home!.code
  const a = m.away!.code
  if (r === 0) pts.set(h, (pts.get(h) ?? 0) + 3)
  else if (r === 2) pts.set(a, (pts.get(a) ?? 0) + 3)
  else {
    pts.set(h, (pts.get(h) ?? 0) + 1)
    pts.set(a, (pts.get(a) ?? 0) + 1)
  }
}

function enumCombos(n: number): Res[][] {
  const out: Res[][] = []
  const total = Math.pow(3, n)
  for (let k = 0; k < total; k++) {
    const combo: Res[] = []
    let x = k
    for (let i = 0; i < n; i++) {
      combo.push((x % 3) as Res)
      x = Math.floor(x / 3)
    }
    out.push(combo)
  }
  return out
}

export function teamScenario(group: Group, matches: Match[], code: string): ScenarioLine[] {
  const remaining = matches.filter(
    (m) => m.group === group.name && m.home && m.away && m.status !== 'finished',
  )
  const own = remaining.filter((m) => m.home!.code === code || m.away!.code === code)
  if (own.length === 0) return []
  const others = remaining.filter((m) => m.home!.code !== code && m.away!.code !== code)

  const base = baseStats(group, matches)
  const nameOf = (c: string) => group.teams.find((t) => t.code === c)?.name ?? c
  const oppOf = (m: Match) => (m.home!.code === code ? m.away!.code : m.home!.code)

  const qualifies = (ownC: Res[], otherC: Res[]): boolean => {
    const pts = new Map(base.pts)
    own.forEach((m, i) => applyRes(pts, m, ownC[i]))
    others.forEach((m, i) => applyRes(pts, m, otherC[i]))
    const ranked = group.teams
      .map((t) => ({ code: t.code, pts: pts.get(t.code) ?? 0, gd: base.gd.get(t.code) ?? 0 }))
      .sort((u, v) => v.pts - u.pts || v.gd - u.gd)
    return ranked.findIndex((r) => r.code === code) < 2
  }

  const otherCombos = enumCombos(others.length)
  const ownCombos = enumCombos(own.length)

  const ownText = (m: Match, r: Res): string => {
    const opp = nameOf(oppOf(m))
    const win = (m.home!.code === code && r === 0) || (m.away!.code === code && r === 2)
    const lose = (m.home!.code === code && r === 2) || (m.away!.code === code && r === 0)
    if (win) return `ganarle a ${opp}`
    if (lose) return `perder con ${opp}`
    return `empatar con ${opp}`
  }
  const comboText = (c: Res[]) => own.map((m, i) => ownText(m, c[i])).join(' y ')
  const pointsOf = (c: Res[]) =>
    c.reduce((s, r, i) => {
      const m = own[i]
      const win = (m.home!.code === code && r === 0) || (m.away!.code === code && r === 2)
      return s + (win ? 3 : r === 1 ? 1 : 0)
    }, 0)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const classified = ownCombos.map((c) => {
    let some = false
    let all = true
    for (const oc of otherCombos) {
      if (qualifies(c, oc)) some = true
      else all = false
    }
    return { c, cls: all ? 'clinch' : some ? 'depends' : 'out', pts: pointsOf(c) }
  })

  const clinch = classified.filter((x) => x.cls === 'clinch').sort((a, b) => a.pts - b.pts)
  const dead = classified.filter((x) => x.cls === 'out').sort((a, b) => a.pts - b.pts)
  const hasDepends = classified.some((x) => x.cls === 'depends')

  if (dead.length === classified.length) {
    return [{ tone: 'out', text: 'Ya no podés terminar entre los dos primeros.' }]
  }
  if (clinch.length === classified.length) {
    return [{ tone: 'in', text: 'Clasificás pase lo que pase en tus partidos.' }]
  }

  const lines: ScenarioLine[] = []
  if (clinch.length > 0) {
    const min = clinch[0].pts
    const best = clinch.filter((x) => x.pts === min).slice(0, 2)
    const text = best.map((x) => comboText(x.c)).join(' — o bien ')
    lines.push({ tone: 'in', text: `${cap(text)}: clasificás seguro.` })
    if (hasDepends) {
      lines.push({ tone: 'live', text: 'Con menos que eso seguís con chances, pero dependés de otros resultados.' })
    }
  } else {
    lines.push({ tone: 'live', text: 'Ni ganando todos tus partidos asegurás el pase: dependés de otros resultados.' })
  }
  if (dead.length > 0) {
    lines.push({ tone: 'out', text: `${cap(comboText(dead[0].c))}: quedás eliminado.` })
  }
  return lines
}
