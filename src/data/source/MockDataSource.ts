import type {
  DataSource,
} from './DataSource'
import type {
  Lineup,
  Match,
  MatchStats,
  PlayerSlot,
  Stage,
  Team,
  TournamentSnapshot,
} from '../types'
import { GROUPS, NAME_POOL, R32_SEED, T } from '../worldcup2026'

const rnd = (n: number) => Math.floor(Math.random() * n)
const pick = <X>(arr: X[]) => arr[rnd(arr.length)]
const chance = (p: number) => Math.random() < p
let _seq = 0
const uid = () => `evt-${++_seq}`

const hash = (s: string) => s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)

function rosterName(code: string, pos: keyof typeof NAME_POOL, i: number): string {
  const pool = NAME_POOL[pos]
  return pool[(hash(code) + i) % pool.length]
}

function makeLineup(team: Team): Lineup {
  const starters: PlayerSlot[] = []
  let n = 1
  const add = (pos: PlayerSlot['position'], count: number) => {
    for (let i = 0; i < count; i++) {
      starters.push({ number: n, name: rosterName(team.code, pos as any, n), position: pos })
      n++
    }
  }
  add('GK', 1)
  add('DF', 4)
  add('MF', 3)
  add('FW', 3)
  const bench: PlayerSlot[] = []
  for (let i = 0; i < 7; i++) {
    const pos = pick(['DF', 'MF', 'FW']) as PlayerSlot['position']
    bench.push({ number: 12 + i, name: rosterName(team.code, pos as any, 12 + i), position: pos })
  }
  return { formation: '4-3-3', starters, bench }
}

function emptyStats(): MatchStats {
  return {
    possession: [50, 50],
    shots: [0, 0],
    shotsOnTarget: [0, 0],
    corners: [0, 0],
    fouls: [0, 0],
    offsides: [0, 0],
    passes: [0, 0],
  }
}

const RR_PAIRS: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[0, 3], [1, 2]],
]

const KICKOFFS = ['Hoy 13:00', 'Hoy 16:00', 'Hoy 19:00', 'Mañana 13:00', 'Mañana 16:00', 'Mañana 19:00']

export class MockDataSource implements DataSource {
  private matches: Match[] = []
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private snapshot: TournamentSnapshot

  constructor() {
    this.buildGroupStage()
    this.buildKnockout()
    this.snapshot = { groups: GROUPS, matches: this.matches, updatedAt: Date.now() }
  }

  private newMatch(p: Partial<Match> & { id: string; stage: Stage }): Match {
    return {
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      minute: 0,
      kickoff: 'Por definir',
      events: [],
      lineups: null,
      stats: null,
      home: null,
      away: null,
      ...p,
    }
  }

  private attachDetail(m: Match) {
    if (m.home && m.away && !m.lineups) {
      m.lineups = { home: makeLineup(m.home), away: makeLineup(m.away) }
      m.stats = emptyStats()
    }
  }

  private buildGroupStage() {
    GROUPS.forEach((g) => {
      RR_PAIRS.forEach((round, ri) => {
        round.forEach(([a, b], gi) => {
          const m = this.newMatch({
            id: `G${g.name}-${ri}${gi}`,
            stage: 'group',
            group: g.name,
            home: g.teams[a],
            away: g.teams[b],
            kickoff: KICKOFFS[ri * 2 + gi],
            label: `Grupo ${g.name} · Jornada ${ri + 1}`,
          })
          this.attachDetail(m)
          if (ri === 0) this.finishWithRandomScore(m)
          else if (ri === 1) this.kickoff(m)
          this.matches.push(m)
        })
      })
    })
  }

  private buildKnockout() {
    R32_SEED.forEach(([h, a], i) => {
      const m = this.newMatch({
        id: `R32-${i + 1}`,
        stage: 'r32',
        home: T[h],
        away: T[a],
        kickoff: 'Fase final',
        label: `16avos · Llave ${i + 1}`,
      })
      this.attachDetail(m)
      this.matches.push(m)
    })
    const rounds: [Stage, number, string][] = [
      ['r16', 8, '8avos'],
      ['qf', 4, 'Cuartos'],
      ['sf', 2, 'Semifinal'],
      ['final', 1, 'Final'],
    ]
    rounds.forEach(([stage, count, label]) => {
      for (let i = 0; i < count; i++) {
        this.matches.push(
          this.newMatch({
            id: `${stage.toUpperCase()}-${i + 1}`,
            stage,
            label: `${label}${count > 1 ? ` · Llave ${i + 1}` : ''}`,
          }),
        )
      }
    })
    this.matches.push(
      this.newMatch({ id: 'TP-1', stage: 'sf', label: 'Tercer Puesto' }),
    )
  }

  private kickoff(m: Match) {
    if (!m.home || !m.away) return
    this.attachDetail(m)
    m.status = 'live'
    m.minute = 1
  }

  private finishWithRandomScore(m: Match) {
    const hs = rnd(4)
    const as = rnd(4)
    m.homeScore = hs
    m.awayScore = as
    m.status = 'finished'
    m.minute = 90
    if (m.stats) {
      m.stats.shots = [hs + 4 + rnd(6), as + 3 + rnd(6)]
      m.stats.shotsOnTarget = [hs + rnd(3), as + rnd(3)]
      m.stats.possession = [40 + rnd(20), 0]
      m.stats.possession[1] = 100 - m.stats.possession[0]
    }
  }

  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 2500)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private tick() {
    let changed = false
    for (const m of this.matches) {
      if (m.status === 'live' || m.status === 'half-time') {
        this.advance(m)
        changed = true
      }
    }
    if (this.resolveBracket()) changed = true
    if (this.keepFlowing()) changed = true
    if (changed) this.commit()
  }

  private advance(m: Match) {
    if (m.status === 'half-time') {
      m.status = 'live'
      return
    }
    m.minute = Math.min(90, m.minute + 2 + rnd(2))

    if (m.stats) {
      const side = rnd(2) as 0 | 1
      m.stats.passes[side] += 8 + rnd(20)
      if (chance(0.5)) m.stats.shots[side]++
      if (chance(0.25)) m.stats.shotsOnTarget[side]++
      if (chance(0.2)) m.stats.corners[side]++
      if (chance(0.3)) m.stats.fouls[side]++
      if (chance(0.12)) m.stats.offsides[side]++
      const totalPasses = m.stats.passes[0] + m.stats.passes[1] || 1
      const home = Math.round((m.stats.passes[0] / totalPasses) * 100)
      m.stats.possession = [home, 100 - home]
    }

    if (chance(0.22)) this.scoreGoal(m)
    else if (chance(0.14)) this.addCard(m, 'yellow')
    else if (chance(0.03)) this.addCard(m, 'red')

    if (m.minute >= 45 && m.minute < 47 && !m.events.some((e) => e.detail === 'HT')) {
      m.status = 'half-time'
      m.events.push({ id: uid(), minute: 45, type: 'sub', teamCode: '', player: '— Entretiempo —', detail: 'HT' })
    }

    if (m.minute >= 90) this.finalize(m)
  }

  private teamSide(m: Match, side: 0 | 1): Team {
    return (side === 0 ? m.home : m.away)!
  }

  private scoreGoal(m: Match) {
    const side = rnd(2) as 0 | 1
    const team = this.teamSide(m, side)
    const scorer = pick(m.lineups![side === 0 ? 'home' : 'away'].starters.filter((p) => p.position !== 'GK'))
    if (side === 0) m.homeScore++
    else m.awayScore++
    const penalty = chance(0.12)
    m.events.push({
      id: uid(),
      minute: m.minute,
      type: penalty ? 'penalty' : 'goal',
      teamCode: team.code,
      player: scorer.name,
      detail: penalty ? 'de penal' : undefined,
    })
    if (m.stats) m.stats.shotsOnTarget[side]++
  }

  private addCard(m: Match, kind: 'yellow' | 'red') {
    const side = rnd(2) as 0 | 1
    const team = this.teamSide(m, side)
    const player = pick(m.lineups![side === 0 ? 'home' : 'away'].starters)
    m.events.push({ id: uid(), minute: m.minute, type: kind, teamCode: team.code, player: player.name })
  }

  private finalize(m: Match) {
    m.minute = 90
    m.status = 'finished'
    if (m.stage !== 'group' && m.homeScore === m.awayScore) {
      const hp = 3 + rnd(3)
      let ap = 3 + rnd(3)
      if (ap === hp) ap = hp === 5 ? 4 : hp + 1
      m.penalties = [hp, ap]
    }
  }

  private winner(m: Match): Team | null {
    if (m.status !== 'finished' || !m.home || !m.away) return null
    if (m.penalties) return m.penalties[0] > m.penalties[1] ? m.home : m.away
    if (m.homeScore === m.awayScore) return null
    return m.homeScore > m.awayScore ? m.home : m.away
  }

  private loser(m: Match): Team | null {
    const w = this.winner(m)
    if (!w || !m.home || !m.away) return null
    return w.code === m.home.code ? m.away : m.home
  }

  private byId(id: string) {
    return this.matches.find((x) => x.id === id)!
  }

  private place(targetId: string, slot: 'home' | 'away', team: Team) {
    const t = this.byId(targetId)
    if ((slot === 'home' && t.home?.code === team.code) || (slot === 'away' && t.away?.code === team.code)) return false
    t[slot] = team
    this.attachDetail(t)
    return true
  }

  private resolveBracket(): boolean {
    let changed = false
    const feed = (fromPrefix: string, count: number, toPrefix: string) => {
      for (let i = 1; i <= count; i++) {
        const src = this.byId(`${fromPrefix}-${i}`)
        const w = this.winner(src)
        if (!w) continue
        const targetId = `${toPrefix}-${Math.ceil(i / 2)}`
        const slot = i % 2 === 1 ? 'home' : 'away'
        if (this.place(targetId, slot, w)) changed = true
      }
    }
    feed('R32', 16, 'R16')
    feed('R16', 8, 'QF')
    feed('QF', 4, 'SF')
    for (let i = 1; i <= 2; i++) {
      const sf = this.byId(`SF-${i}`)
      const w = this.winner(sf)
      const l = this.loser(sf)
      const slot = i === 1 ? 'home' : 'away'
      if (w && this.place('FINAL-1', slot, w)) changed = true
      if (l && this.place('TP-1', slot, l)) changed = true
    }
    return changed
  }

  private keepFlowing(): boolean {
    let changed = false
    for (const g of GROUPS) {
      const gm = this.matches.filter((m) => m.group === g.name)
      const live = gm.some((m) => m.status === 'live' || m.status === 'half-time')
      if (!live) {
        const next = gm.find((m) => m.status === 'scheduled')
        if (next) {
          this.kickoff(next)
          changed = true
        }
      }
    }
    const ko: Stage[] = ['r32', 'r16', 'qf', 'sf', 'final']
    for (const stage of ko) {
      const rm = this.matches.filter((m) => m.stage === stage && m.id !== 'TP-1')
      const liveCount = rm.filter((m) => m.status === 'live' || m.status === 'half-time').length
      if (liveCount >= 4) continue
      const ready = rm.find((m) => m.status === 'scheduled' && m.home && m.away)
      if (ready) {
        this.kickoff(ready)
        changed = true
      }
    }
    return changed
  }

  private commit() {
    this.snapshot = { groups: GROUPS, matches: this.matches, updatedAt: Date.now() }
    this.listeners.forEach((l) => l())
  }

  getSnapshot() {
    return this.snapshot
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
