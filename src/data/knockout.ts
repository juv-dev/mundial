import type { Group, Match, Stage, Team } from './types'
import { computeStandings, bestThirds } from './standings'
import { THIRDS_TABLE } from './thirdsTable'

type SlotSpec =
  | { t: 'win'; g: string }
  | { t: 'run'; g: string }
  | { t: 'third'; m: number }
  | { t: 'wmatch'; m: number }
  | { t: 'lmatch'; m: number }

interface KoDef {
  n: number
  stage: Stage
  third?: boolean
  home: SlotSpec
  away: SlotSpec
}

const THIRD_ELIGIBLE: Record<number, string[]> = {
  74: ['A', 'B', 'C', 'D', 'F'],
  77: ['C', 'D', 'F', 'G', 'H'],
  79: ['C', 'E', 'F', 'H', 'I'],
  80: ['E', 'H', 'I', 'J', 'K'],
  81: ['B', 'E', 'F', 'I', 'J'],
  82: ['A', 'E', 'H', 'I', 'J'],
  85: ['E', 'F', 'G', 'I', 'J'],
  87: ['D', 'E', 'I', 'J', 'L'],
}

const KO: KoDef[] = [
  { n: 73, stage: 'r32', home: { t: 'run', g: 'A' }, away: { t: 'run', g: 'B' } },
  { n: 74, stage: 'r32', home: { t: 'win', g: 'E' }, away: { t: 'third', m: 74 } },
  { n: 75, stage: 'r32', home: { t: 'win', g: 'F' }, away: { t: 'run', g: 'C' } },
  { n: 76, stage: 'r32', home: { t: 'win', g: 'C' }, away: { t: 'run', g: 'F' } },
  { n: 77, stage: 'r32', home: { t: 'win', g: 'I' }, away: { t: 'third', m: 77 } },
  { n: 78, stage: 'r32', home: { t: 'run', g: 'E' }, away: { t: 'run', g: 'I' } },
  { n: 79, stage: 'r32', home: { t: 'win', g: 'A' }, away: { t: 'third', m: 79 } },
  { n: 80, stage: 'r32', home: { t: 'win', g: 'L' }, away: { t: 'third', m: 80 } },
  { n: 81, stage: 'r32', home: { t: 'win', g: 'D' }, away: { t: 'third', m: 81 } },
  { n: 82, stage: 'r32', home: { t: 'win', g: 'G' }, away: { t: 'third', m: 82 } },
  { n: 83, stage: 'r32', home: { t: 'run', g: 'K' }, away: { t: 'run', g: 'L' } },
  { n: 84, stage: 'r32', home: { t: 'win', g: 'H' }, away: { t: 'run', g: 'J' } },
  { n: 85, stage: 'r32', home: { t: 'win', g: 'B' }, away: { t: 'third', m: 85 } },
  { n: 86, stage: 'r32', home: { t: 'win', g: 'J' }, away: { t: 'run', g: 'H' } },
  { n: 87, stage: 'r32', home: { t: 'win', g: 'K' }, away: { t: 'third', m: 87 } },
  { n: 88, stage: 'r32', home: { t: 'run', g: 'D' }, away: { t: 'run', g: 'G' } },
  { n: 89, stage: 'r16', home: { t: 'wmatch', m: 74 }, away: { t: 'wmatch', m: 77 } },
  { n: 90, stage: 'r16', home: { t: 'wmatch', m: 73 }, away: { t: 'wmatch', m: 75 } },
  { n: 91, stage: 'r16', home: { t: 'wmatch', m: 76 }, away: { t: 'wmatch', m: 78 } },
  { n: 92, stage: 'r16', home: { t: 'wmatch', m: 79 }, away: { t: 'wmatch', m: 80 } },
  { n: 93, stage: 'r16', home: { t: 'wmatch', m: 83 }, away: { t: 'wmatch', m: 84 } },
  { n: 94, stage: 'r16', home: { t: 'wmatch', m: 81 }, away: { t: 'wmatch', m: 82 } },
  { n: 95, stage: 'r16', home: { t: 'wmatch', m: 86 }, away: { t: 'wmatch', m: 88 } },
  { n: 96, stage: 'r16', home: { t: 'wmatch', m: 85 }, away: { t: 'wmatch', m: 87 } },
  { n: 97, stage: 'qf', home: { t: 'wmatch', m: 89 }, away: { t: 'wmatch', m: 90 } },
  { n: 98, stage: 'qf', home: { t: 'wmatch', m: 93 }, away: { t: 'wmatch', m: 94 } },
  { n: 99, stage: 'qf', home: { t: 'wmatch', m: 91 }, away: { t: 'wmatch', m: 92 } },
  { n: 100, stage: 'qf', home: { t: 'wmatch', m: 95 }, away: { t: 'wmatch', m: 96 } },
  { n: 101, stage: 'sf', home: { t: 'wmatch', m: 97 }, away: { t: 'wmatch', m: 98 } },
  { n: 102, stage: 'sf', home: { t: 'wmatch', m: 99 }, away: { t: 'wmatch', m: 100 } },
  { n: 103, stage: 'sf', third: true, home: { t: 'lmatch', m: 101 }, away: { t: 'lmatch', m: 102 } },
  { n: 104, stage: 'final', home: { t: 'wmatch', m: 101 }, away: { t: 'wmatch', m: 102 } },
]

const ROUND_LABEL: Record<Stage, string> = {
  group: 'Grupo',
  r32: '16avos',
  r16: '8avos',
  qf: 'Cuartos',
  sf: 'Semifinal',
  final: 'Final',
}

const R32_DATE: Record<number, string> = {
  73: '28 jun', 74: '29 jun', 75: '29 jun', 76: '29 jun',
  77: '30 jun', 78: '30 jun', 79: '30 jun', 80: '1 jul',
  81: '1 jul', 82: '1 jul', 83: '2 jul', 84: '2 jul',
  85: '2 jul', 86: '3 jul', 87: '3 jul', 88: '3 jul',
}

const ROUND_DATE: Record<Stage, string> = {
  group: '',
  r32: '',
  r16: '4–7 jul',
  qf: '9–11 jul',
  sf: '14–15 jul',
  final: '19 jul',
}

const KO_STAGES: Stage[] = ['r32', 'r16', 'qf', 'sf', 'final']

function thirdGroupsQualified(groups: Group[], matches: Match[]): string[] | null {
  if (groups.length < 12) return null
  const set = bestThirds(groups, matches)
  const quals = groups
    .filter((g) => {
      const row = computeStandings(g, matches)[2]
      return row && set.has(row.team.code)
    })
    .map((g) => g.name)
  return quals.length === 8 ? quals : null
}

function winner(m: Match): Team | null {
  if (m.status !== 'finished' || !m.home || !m.away) return null
  if (m.homePens != null && m.awayPens != null) return m.homePens > m.awayPens ? m.home : m.away
  if (m.homeScore === m.awayScore) return null
  return m.homeScore > m.awayScore ? m.home : m.away
}

function loser(m: Match): Team | null {
  const w = winner(m)
  if (!w || !m.home || !m.away) return null
  return w.code === m.home.code ? m.away : m.home
}

export function buildKnockout(groups: Group[], matches: Match[]): Match[] {
  const byGroup = new Map(groups.map((g) => [g.name, g]))
  const thirdQuals = thirdGroupsQualified(groups, matches)
  const thirdAssign = thirdQuals ? THIRDS_TABLE[[...thirdQuals].sort().join('')] : undefined

  const groupStarted = (name: string): boolean =>
    matches.some(
      (m) =>
        m.stage === 'group' &&
        m.group === name &&
        m.status === 'finished',
    )

  const groupTeam = (name: string, rank: number): Team | null => {
    const g = byGroup.get(name)
    if (!g || !groupStarted(name)) return null
    return computeStandings(g, matches)[rank]?.team ?? null
  }

  const resolveR32 = (spec: SlotSpec): { team: Team | null; slot: string } => {
    if (spec.t === 'win') return { team: groupTeam(spec.g, 0), slot: `1° ${spec.g}` }
    if (spec.t === 'run') return { team: groupTeam(spec.g, 1), slot: `2° ${spec.g}` }
    if (spec.t === 'third') {
      const slot = `3° (${THIRD_ELIGIBLE[spec.m].join('/')})`
      const g = thirdAssign?.[spec.m]
      return { team: g ? groupTeam(g, 2) : null, slot }
    }
    return { team: null, slot: '' }
  }

  const slotLabel = (spec: SlotSpec): string => {
    if (spec.t === 'wmatch') return `Ganador P${spec.m}`
    if (spec.t === 'lmatch') return `Perdedor P${spec.m}`
    return ''
  }

  const built = new Map<number, Match>()

  for (const d of KO) {
    const id = d.third ? 'TP-1' : `KO-${d.n}`
    const labelBase = d.third ? 'Tercer Puesto' : ROUND_LABEL[d.stage]
    const label = d.third || d.stage === 'final' ? labelBase : `${labelBase} · P${d.n}`
    const kickoff = d.third ? '18 jul' : R32_DATE[d.n] ?? ROUND_DATE[d.stage] ?? 'Por definir'

    const h = d.stage === 'r32' ? resolveR32(d.home) : { team: null, slot: slotLabel(d.home) }
    const a = d.stage === 'r32' ? resolveR32(d.away) : { team: null, slot: slotLabel(d.away) }

    built.set(d.n, {
      id,
      stage: d.stage,
      label,
      home: h.team,
      away: a.team,
      homeSlot: h.slot || undefined,
      awaySlot: a.slot || undefined,
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      kickoff,
    })
  }

  const source = matches.filter((m) => KO_STAGES.includes(m.stage))

  const overlay = (stage: Stage) => {
    for (const m of built.values()) {
      if (m.stage !== stage) continue
      const src = source.find((s) => s.id === m.id)
      if (!src) continue
      m.homeScore = src.homeScore
      m.awayScore = src.awayScore
      m.status = src.status
      m.homePens = src.homePens
      m.awayPens = src.awayPens
      m.updatedAt = src.updatedAt
      m.kickoff = src.kickoff
      if (src.home) m.home = src.home
      if (src.away) m.away = src.away
    }
  }

  const propagate = () => {
    let changed = false
    for (const d of KO) {
      const m = built.get(d.n)!
      for (const side of ['home', 'away'] as const) {
        const spec = side === 'home' ? d.home : d.away
        if (m[side]) continue
        if (spec.t === 'wmatch') {
          const w = winner(built.get(spec.m)!)
          if (w) {
            m[side] = w
            changed = true
          }
        } else if (spec.t === 'lmatch') {
          const l = loser(built.get(spec.m)!)
          if (l) {
            m[side] = l
            changed = true
          }
        }
      }
    }
    return changed
  }

  for (const stage of KO_STAGES) {
    overlay(stage)
    let guard = 0
    while (propagate() && guard++ < 10) {
      continue
    }
  }
  for (const stage of KO_STAGES) overlay(stage)

  return KO.map((d) => built.get(d.n)!)
}

export interface GloryStep {
  stage: Stage
  round: string
  matchN: number
  opponent: string
}

function gloryOpponentLabel(spec: SlotSpec): string {
  if (spec.t === 'win') return `1° ${spec.g}`
  if (spec.t === 'run') return `2° ${spec.g}`
  if (spec.t === 'third') return `3° (${THIRD_ELIGIBLE[spec.m].join('/')})`
  if (spec.t === 'wmatch') return `Ganador P${spec.m}`
  return `Perdedor P${spec.m}`
}

export function pathToGlory(group: string, position: 1 | 2): GloryStep[] {
  const steps: GloryStep[] = []
  let isMine = (spec: SlotSpec): boolean =>
    position === 1 ? spec.t === 'win' && spec.g === group : spec.t === 'run' && spec.g === group
  let guard = 0
  while (guard++ < 8) {
    const def = KO.find((d) => !d.third && (isMine(d.home) || isMine(d.away)))
    if (!def) break
    const opp = isMine(def.home) ? def.away : def.home
    steps.push({ stage: def.stage, round: ROUND_LABEL[def.stage], matchN: def.n, opponent: gloryOpponentLabel(opp) })
    if (def.stage === 'final') break
    const n = def.n
    isMine = (spec: SlotSpec): boolean => spec.t === 'wmatch' && spec.m === n
  }
  return steps
}
