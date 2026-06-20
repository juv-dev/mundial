import type { DataSource } from './DataSource'
import type {
  Lineup,
  Match,
  MatchEvent,
  MatchStats,
  MatchStatus,
  PlayerSlot,
  Stage,
  Team,
  TournamentSnapshot,
} from '../types'

const WC_LEAGUE_ID = 1
const WC_SEASON = 2026

interface Options {
  leagueId?: number
  season?: number
  pollMs?: number
  maxRequests?: number
  baseUrl?: string
}

export class ApiFootballDataSource implements DataSource {
  private leagueId: number
  private season: number
  private pollMs: number
  private maxRequests: number
  private baseUrl: string

  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private requestCount = 0
  private detailFetched = new Set<string>()
  private detailInFlight = new Set<string>()

  private byId = new Map<string, Match>()
  private teams = new Map<number, Team>()
  private snapshot: TournamentSnapshot = { groups: [], matches: [], updatedAt: 0 }

  constructor(private apiKey: string, opts: Options = {}) {
    this.leagueId = opts.leagueId ?? WC_LEAGUE_ID
    this.season = opts.season ?? WC_SEASON
    this.pollMs = opts.pollMs ?? 90_000
    this.maxRequests = opts.maxRequests ?? 90
    this.baseUrl = opts.baseUrl ?? 'https://v3.football.api-sports.io'
  }

  private async fetchJson<R = any>(path: string): Promise<R | null> {
    if (this.requestCount >= this.maxRequests) {
      this.stop()
      return null
    }
    this.requestCount++
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'x-apisports-key': this.apiKey },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json as R
    } catch {
      return null
    }
  }

  start() {
    void this.loadAll().then(() => {
      if (this.timer) return
      this.timer = setInterval(() => void this.pollLive(), this.pollMs)
    })
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async loadAll() {
    const data = await this.fetchJson(`/fixtures?league=${this.leagueId}&season=${this.season}`)
    const rows: any[] = data?.response ?? []
    for (const row of rows) {
      const m = this.mapFixture(row)
      if (m) this.byId.set(m.id, m)
    }
    this.rebuildSnapshot()
  }

  private async pollLive() {
    const data = await this.fetchJson(
      `/fixtures?league=${this.leagueId}&season=${this.season}&live=all`,
    )
    if (!data) return
    const rows: any[] = data.response ?? []
    if (rows.length === 0) return
    for (const row of rows) {
      const fresh = this.mapFixture(row)
      if (!fresh) continue
      const existing = this.byId.get(fresh.id)
      if (existing) {
        existing.homeScore = fresh.homeScore
        existing.awayScore = fresh.awayScore
        existing.status = fresh.status
        existing.minute = fresh.minute
        existing.home = fresh.home ?? existing.home
        existing.away = fresh.away ?? existing.away
        existing.penalties = fresh.penalties ?? existing.penalties
      } else {
        this.byId.set(fresh.id, fresh)
      }
      if (this.detailFetched.has(fresh.id)) void this.loadDetail(fresh.id, true)
    }
    this.rebuildSnapshot()
  }

  requestDetail(matchId: string) {
    if (this.detailFetched.has(matchId) || this.detailInFlight.has(matchId)) return
    void this.loadDetail(matchId)
  }

  private async loadDetail(matchId: string, refresh = false) {
    const m = this.byId.get(matchId)
    if (!m) return
    this.detailInFlight.add(matchId)
    try {
      const [ev, lu, st] = await Promise.all([
        this.fetchJson(`/fixtures/events?fixture=${matchId}`),
        refresh ? Promise.resolve(null) : this.fetchJson(`/fixtures/lineups?fixture=${matchId}`),
        this.fetchJson(`/fixtures/statistics?fixture=${matchId}`),
      ])
      if (ev?.response) m.events = this.mapEvents(ev.response)
      if (lu?.response?.length) m.lineups = this.mapLineups(m, lu.response)
      if (st?.response?.length) m.stats = this.mapStats(st.response)
      this.detailFetched.add(matchId)
      this.rebuildSnapshot()
    } finally {
      this.detailInFlight.delete(matchId)
    }
  }

  private teamFrom(t: any): Team {
    const cached = this.teams.get(t.id)
    if (cached) return cached
    const team: Team = {
      code: String(t.id),
      name: t.name,
      flag: '🏳️',
      logo: t.logo,
    }
    this.teams.set(t.id, team)
    return team
  }

  private mapStatus(short: string): { status: MatchStatus; live: boolean } {
    if (['1H', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT'].includes(short)) return { status: 'live', live: true }
    if (short === 'HT') return { status: 'half-time', live: true }
    if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(short)) return { status: 'finished', live: false }
    return { status: 'scheduled', live: false }
  }

  private mapRound(round: string): { stage: Stage; group?: string; thirdPlace?: boolean } {
    const r = round.toLowerCase()
    if (r.startsWith('group')) {
      const letter = round.replace(/group/i, '').trim().charAt(0).toUpperCase()
      return { stage: 'group', group: letter }
    }
    if (r.includes('3rd place') || r.includes('third place')) return { stage: 'sf', thirdPlace: true }
    if (r.includes('round of 32')) return { stage: 'r32' }
    if (r.includes('round of 16')) return { stage: 'r16' }
    if (r.includes('quarter')) return { stage: 'qf' }
    if (r.includes('semi')) return { stage: 'sf' }
    if (r.includes('final')) return { stage: 'final' }
    return { stage: 'group' }
  }

  private mapFixture(row: any): Match | null {
    if (!row?.fixture) return null
    const id = String(row.fixture.id)
    const { status } = this.mapStatus(row.fixture.status?.short ?? 'NS')
    const { stage, group, thirdPlace } = this.mapRound(row.league?.round ?? '')

    const home = row.teams?.home?.id ? this.teamFrom(row.teams.home) : null
    const away = row.teams?.away?.id ? this.teamFrom(row.teams.away) : null

    const penH = row.score?.penalty?.home
    const penA = row.score?.penalty?.away
    const penalties: [number, number] | undefined =
      penH != null && penA != null ? [penH, penA] : undefined

    const kickoff = row.fixture.date
      ? new Date(row.fixture.date).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Por definir'

    return {
      id: thirdPlace ? 'TP-1' : id,
      stage,
      group,
      label: thirdPlace ? 'Tercer Puesto' : this.labelFor(stage, group, row.league?.round),
      home,
      away,
      homeScore: row.goals?.home ?? 0,
      awayScore: row.goals?.away ?? 0,
      status,
      minute: row.fixture.status?.elapsed ?? 0,
      kickoff,
      events: [],
      lineups: null,
      stats: null,
      penalties,
    }
  }

  private labelFor(stage: Stage, group: string | undefined, round: string): string {
    if (stage === 'group') return `Grupo ${group ?? ''} · ${round}`
    const names: Partial<Record<Stage, string>> = {
      r32: '16avos',
      r16: '8avos',
      qf: 'Cuartos',
      sf: 'Semifinal',
      final: 'Final',
    }
    return names[stage] ?? round
  }

  private mapEvents(rows: any[]): MatchEvent[] {
    return rows.map((e, i): MatchEvent => {
      const type = e.type as string
      const detail = (e.detail as string) ?? ''
      let mapped: MatchEvent['type'] = 'sub'
      if (type === 'Goal') {
        mapped = /own/i.test(detail) ? 'own-goal' : /penalty/i.test(detail) ? 'penalty' : 'goal'
      } else if (type === 'Card') {
        mapped = /red/i.test(detail) ? 'red' : 'yellow'
      } else if (type === 'subst') {
        mapped = 'sub'
      }
      return {
        id: `api-evt-${e.team?.id}-${e.time?.elapsed}-${i}`,
        minute: (e.time?.elapsed ?? 0) + (e.time?.extra ?? 0),
        type: mapped,
        teamCode: String(e.team?.id ?? ''),
        player: e.player?.name ?? '—',
        detail: type === 'subst' ? `↑ ${e.player?.name ?? ''} · ↓ ${e.assist?.name ?? ''}` : undefined,
      }
    })
  }

  private mapLineups(m: Match, rows: any[]): { home: Lineup; away: Lineup } | null {
    const homeId = m.home?.code
    const find = (teamCode: string | undefined) =>
      rows.find((r) => String(r.team?.id) === teamCode) ?? rows[0]
    const build = (r: any): Lineup => ({
      formation: r?.formation ?? '—',
      starters: (r?.startXI ?? []).map((p: any): PlayerSlot => ({
        number: p.player?.number ?? 0,
        name: p.player?.name ?? '—',
        position: p.player?.pos ?? '',
      })),
      bench: (r?.substitutes ?? []).map((p: any): PlayerSlot => ({
        number: p.player?.number ?? 0,
        name: p.player?.name ?? '—',
        position: p.player?.pos ?? '',
      })),
    })
    const homeRow = find(homeId)
    const awayRow = rows.find((r) => r !== homeRow) ?? rows[1]
    return { home: build(homeRow), away: build(awayRow) }
  }

  private mapStats(rows: any[]): MatchStats {
    const get = (r: any, type: string): number => {
      const item = (r?.statistics ?? []).find((s: any) => s.type === type)
      const v = item?.value
      if (v == null) return 0
      if (typeof v === 'string') return parseInt(v.replace('%', ''), 10) || 0
      return v
    }
    const [h, a] = rows
    return {
      possession: [get(h, 'Ball Possession'), get(a, 'Ball Possession')],
      shots: [get(h, 'Total Shots'), get(a, 'Total Shots')],
      shotsOnTarget: [get(h, 'Shots on Goal'), get(a, 'Shots on Goal')],
      corners: [get(h, 'Corner Kicks'), get(a, 'Corner Kicks')],
      fouls: [get(h, 'Fouls'), get(a, 'Fouls')],
      offsides: [get(h, 'Offsides'), get(a, 'Offsides')],
      passes: [get(h, 'Total passes'), get(a, 'Total passes')],
    }
  }

  private rebuildSnapshot() {
    const matches = [...this.byId.values()]
    const groupMap = new Map<string, Team[]>()
    for (const m of matches) {
      if (m.stage !== 'group' || !m.group) continue
      const set = groupMap.get(m.group) ?? []
      for (const t of [m.home, m.away]) {
        if (t && !set.some((x) => x.code === t.code)) set.push(t)
      }
      groupMap.set(m.group, set)
    }
    const groups = [...groupMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, teams]) => ({ name, teams }))

    this.snapshot = { groups, matches, updatedAt: Date.now() }
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
