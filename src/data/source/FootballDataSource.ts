import type { DataSource } from './DataSource'
import type {
  Group,
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
import { teamNameEs } from '../flags'

interface TsdbSeasonEvent {
  idEvent: string
  dateEvent: string
  intHomeScore: string | null
  intAwayScore: string | null
  strHomeTeam: string
  strAwayTeam: string
}

interface TsdbTimelineEntry {
  idTimeline?: string
  strTimeline: string
  strTimelineDetail: string
  strHome: string
  strPlayer: string
  strAssist: string
  intTime: string
  idTeam: string
  strTeam: string
  strComment?: string
}

interface TsdbLineupEntry {
  strPosition: string
  strHome: string
  strSubstitute: string
  intSquadNumber: string
  strPlayer: string
  strTeam: string
  strCutout?: string
  strThumb?: string
}

interface TsdbStatEntry {
  strStat: string
  intHome: string | number
  intAway: string | number
}

interface TsdbEventDetail {
  strHomeFormation?: string
  strAwayFormation?: string
}

interface Options {
  baseUrl?: string
  live?: boolean
  cacheTtlMs?: number
  maxRequests?: number
}

const KNOCKOUT_LABEL: Record<string, string> = {
  LAST_32: '16avos de Final',
  LAST_16: '8avos de Final',
  QUARTER_FINALS: 'Cuartos de Final',
  SEMI_FINALS: 'Semifinales',
  FINAL: 'Final',
}

export class FootballDataSource implements DataSource {
  private baseUrl: string
  private live: boolean
  private cacheTtlMs: number
  private maxRequests: number
  private cacheKey = 'fd-snapshot-v8'
  private rateLimitBackoffMs = 1_800_000
  private livePollMs = 180_000
  private idlePollMs = 900_000

  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private requestCount = 0
  private backoffUntil = 0

  private byId = new Map<string, Match>()
  private teams = new Map<string, Team>()
  private teamGroup = new Map<string, string>()
  private groups: Group[] = []
  private snapshot: TournamentSnapshot = { groups: [], matches: [], updatedAt: 0 }

  private tsdbBaseUrl = '/tsdb'
  private detailFetched = new Set<string>()
  private detailInFlight = new Set<string>()
  private tsdbIndex = new Map<string, string>()
  private tsdbIndexLoaded = false
  private tsdbIndexInFlight = false

  constructor(opts: Options = {}) {
    this.baseUrl = opts.baseUrl ?? '/fd'
    this.live = opts.live ?? true
    this.cacheTtlMs = opts.cacheTtlMs ?? 300_000
    this.maxRequests = opts.maxRequests ?? 90
  }

  private async get<R = unknown>(path: string): Promise<R | null> {
    if (this.requestCount >= this.maxRequests) {
      this.stop()
      return null
    }
    if (Date.now() < this.backoffUntil) return null
    this.requestCount++
    try {
      const res = await fetch(`${this.baseUrl}${path}`)
      if (res.status === 429) {
        this.backoffUntil = Date.now() + this.rateLimitBackoffMs
        return null
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as R
    } catch {
      return null
    }
  }

  start() {
    void this.loadAll().then(() => {
      if (this.live) this.scheduleNext()
    })
  }

  private scheduleNext() {
    if (this.timer) return
    const isLive = [...this.byId.values()].some(
      (m) => m.status === 'live' || m.status === 'half-time',
    )
    let delay = isLive ? this.livePollMs : this.idlePollMs
    const wait = this.backoffUntil - Date.now()
    if (wait > delay) delay = wait
    this.timer = setTimeout(() => {
      this.timer = null
      if (typeof document !== 'undefined' && document.hidden) {
        this.scheduleNext()
        return
      }
      void this.pollLive().then(() => this.scheduleNext())
    }, delay)
  }

  stop() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async loadAll() {
    if (this.restoreFromCache()) return
    await this.loadStandings()
    await this.loadMatches()
    if (this.byId.size === 0) {
      this.listeners.forEach((l) => l())
      return
    }
    this.rebuildSnapshot()
    this.writeCache()
  }

  private restoreFromCache(): boolean {
    try {
      const raw = localStorage.getItem(this.cacheKey)
      if (!raw) return false
      const snap = JSON.parse(raw) as TournamentSnapshot
      if (!snap.updatedAt || Date.now() - snap.updatedAt > this.cacheTtlMs) return false
      this.groups = snap.groups
      this.byId.clear()
      for (const m of snap.matches) this.byId.set(m.id, m)
      this.snapshot = snap
      this.listeners.forEach((l) => l())
      return true
    } catch {
      return false
    }
  }

  private writeCache() {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.snapshot))
    } catch {
      return
    }
  }

  private async loadStandings() {
    const data = await this.get<{ standings: unknown[] }>('/competitions/WC/standings')
    const standings: unknown[] = data?.standings ?? []
    this.groups = []
    for (const entry of standings) {
      const e = entry as Record<string, unknown>
      if (e['type'] !== 'TOTAL') continue
      const groupRaw = String(e['group'] ?? '')
      const letter = groupRaw.replace(/^group[\s_]*/i, '').trim()
      if (letter.length !== 1) continue
      const teams: Team[] = []
      for (const row of (e['table'] as unknown[] | undefined) ?? []) {
        const r = row as Record<string, unknown>
        const team = this.teamFrom(r['team'])
        if (!team) continue
        teams.push(team)
        this.teamGroup.set(team.code, letter)
      }
      this.groups.push({ name: letter, teams })
    }
    this.groups.sort((a, b) => a.name.localeCompare(b.name))
  }

  private async loadMatches() {
    const data = await this.get<{ matches: unknown[] }>('/competitions/WC/matches')
    for (const row of data?.matches ?? []) {
      const m = this.mapMatch(row)
      if (m) this.byId.set(m.id, m)
    }
  }

  private async pollLive() {
    const data = await this.get<{ matches: unknown[] }>('/competitions/WC/matches')
    if (!data) return
    for (const row of data.matches ?? []) {
      const fresh = this.mapMatch(row)
      if (!fresh) continue
      const existing = this.byId.get(fresh.id)
      if (existing) {
        existing.homeScore = fresh.homeScore
        existing.awayScore = fresh.awayScore
        existing.status = fresh.status
        existing.minute = fresh.minute
        existing.penalties = fresh.penalties ?? existing.penalties
      } else {
        this.byId.set(fresh.id, fresh)
      }
    }
    this.rebuildSnapshot()
  }

  requestDetail(matchId: string) {
    const m = this.byId.get(matchId)
    if (!m || m.status !== 'finished') return
    if (this.detailFetched.has(matchId) || this.detailInFlight.has(matchId)) return
    void this.loadDetail(matchId)
  }

  private async tsdbGet<R = unknown>(path: string): Promise<R | null> {
    try {
      const res = await fetch(`${this.tsdbBaseUrl}${path}`)
      if (!res.ok) return null
      return (await res.json()) as R
    } catch {
      return null
    }
  }

  private async loadTsdbIndex(): Promise<void> {
    if (this.tsdbIndexLoaded || this.tsdbIndexInFlight) return
    this.tsdbIndexInFlight = true
    try {
      const data = await this.tsdbGet<{ events: TsdbSeasonEvent[] | null }>(
        '/eventsseason.php?id=4429&s=2026',
      )
      for (const ev of data?.events ?? []) {
        if (ev.intHomeScore == null || ev.intAwayScore == null) continue
        const key = `${ev.dateEvent}|${ev.intHomeScore}-${ev.intAwayScore}`
        this.tsdbIndex.set(key, ev.idEvent)
      }
      this.tsdbIndexLoaded = true
    } finally {
      this.tsdbIndexInFlight = false
    }
  }

  private async loadDetail(matchId: string): Promise<void> {
    const m = this.byId.get(matchId)
    if (!m) return
    this.detailInFlight.add(matchId)
    try {
      await this.loadTsdbIndex()
      const utcDay = m.utcDate?.slice(0, 10)
      if (!utcDay) return
      const key = `${utcDay}|${m.homeScore}-${m.awayScore}`
      const idEvent = this.tsdbIndex.get(key)
      if (!idEvent) return
      const [timelineData, lineupData, statsData, eventDetailData] = await Promise.all([
        this.tsdbGet<{ timeline: TsdbTimelineEntry[] | null }>(
          `/lookuptimeline.php?id=${idEvent}`,
        ),
        this.tsdbGet<{ lineup: TsdbLineupEntry[] | null }>(
          `/lookuplineup.php?id=${idEvent}`,
        ),
        this.tsdbGet<{ eventstats: TsdbStatEntry[] | null }>(
          `/lookupeventstats.php?id=${idEvent}`,
        ),
        this.tsdbGet<{ events: TsdbEventDetail[] | null }>(
          `/lookupevent.php?id=${idEvent}`,
        ),
      ])
      const events = this.mapTsdbEvents(timelineData?.timeline ?? [], m)
      if (events.length) m.events = events
      const lineups = this.mapTsdbLineups(lineupData?.lineup ?? [])
      if (lineups) {
        lineups.home.formation = eventDetailData?.events?.[0]?.strHomeFormation || '—'
        lineups.away.formation = eventDetailData?.events?.[0]?.strAwayFormation || '—'
        m.lineups = lineups
      }
      const stats = this.mapTsdbStats(statsData?.eventstats ?? [])
      if (stats) m.stats = stats
      this.detailFetched.add(matchId)
      this.rebuildSnapshot()
    } finally {
      this.detailInFlight.delete(matchId)
    }
  }

  private mapTsdbEvents(rows: TsdbTimelineEntry[], m: Match): MatchEvent[] {
    return rows
      .map((e, i): MatchEvent | null => {
        const tl = e.strTimeline
        const detail = (e.strTimelineDetail ?? '').toLowerCase()
        let type: MatchEvent['type'] | null = null
        if (tl === 'Goal') {
          if (detail.includes('own')) type = 'own-goal'
          else if (detail.includes('penalt')) type = 'penalty'
          else type = 'goal'
        } else if (tl === 'Card') {
          if (detail.includes('yellow')) type = 'yellow'
          else if (detail.includes('red')) type = 'red'
        } else if (tl === 'subst') {
          type = 'sub'
        }
        if (!type) return null
        const minute = parseInt(e.intTime, 10) || 0
        const teamCode = e.strHome === 'Yes' ? (m.home?.code ?? '') : (m.away?.code ?? '')
        const assist = e.strAssist && e.strAssist !== '0' ? e.strAssist : null
        let eventDetail: string | undefined
        if (type === 'sub') {
          eventDetail = assist ? `↑ ${e.strPlayer} · ↓ ${assist}` : undefined
        } else if (assist) {
          eventDetail = `asist. ${assist}`
        }
        return {
          id: `tsdb-${e.idTimeline ?? i}`,
          minute,
          type,
          teamCode,
          player: e.strPlayer,
          detail: eventDetail,
        }
      })
      .filter((x): x is MatchEvent => x !== null)
      .sort((a, b) => a.minute - b.minute)
  }

  private mapTsdbLineups(rows: TsdbLineupEntry[]): { home: Lineup; away: Lineup } | null {
    if (!rows.length) return null
    const homeStarters: PlayerSlot[] = []
    const homeBench: PlayerSlot[] = []
    const awayStarters: PlayerSlot[] = []
    const awayBench: PlayerSlot[] = []
    for (const p of rows) {
      const slot: PlayerSlot = {
        number: parseInt(p.intSquadNumber, 10) || 0,
        name: p.strPlayer,
        position: p.strPosition ?? '',
        photo: p.strThumb || p.strCutout || undefined,
        club: p.strTeam || undefined,
      }
      if (p.strHome === 'Yes') {
        if (p.strSubstitute === 'No') homeStarters.push(slot)
        else homeBench.push(slot)
      } else {
        if (p.strSubstitute === 'No') awayStarters.push(slot)
        else awayBench.push(slot)
      }
    }
    if (!homeStarters.length && !awayStarters.length) return null
    return {
      home: { formation: '—', starters: homeStarters, bench: homeBench },
      away: { formation: '—', starters: awayStarters, bench: awayBench },
    }
  }

  private mapTsdbStats(rows: TsdbStatEntry[]): MatchStats | null {
    if (!rows.length) return null
    const parse = (v: string | number): number => {
      if (typeof v === 'number') return Math.round(v)
      return parseInt(String(v).replace('%', ''), 10) || 0
    }
    const find = (...keywords: string[]): [number, number] => {
      for (const kw of keywords) {
        const row = rows.find((r) => r.strStat.toLowerCase().includes(kw.toLowerCase()))
        if (row) return [parse(row.intHome), parse(row.intAway)]
      }
      return [0, 0]
    }
    const possession = find('possession')
    const shots = find('total shots')
    const shotsOnTarget = find('shots on goal', 'shots on target')
    const corners = find('corner')
    const fouls = find('foul')
    const offsides = find('offside')
    const passes = find('passes', 'pass')
    const hasPossession = possession[0] !== 0 || possession[1] !== 0
    const hasShots = shots[0] !== 0 || shots[1] !== 0
    if (!hasPossession && !hasShots) return null
    return { possession, shots, shotsOnTarget, corners, fouls, offsides, passes }
  }

  private teamFrom(t: unknown): Team | null {
    if (!t || typeof t !== 'object') return null
    const obj = t as Record<string, unknown>
    const code = obj['tla'] ? String(obj['tla']) : String(obj['id'])
    const cached = this.teams.get(code)
    if (cached) return cached
    const team: Team = {
      code,
      name: teamNameEs(String(obj['name'] ?? '—')),
      nameEn: String(obj['name'] ?? ''),
      flag: '🏳️',
      logo: obj['crest'] ? String(obj['crest']) : undefined,
    }
    this.teams.set(code, team)
    return team
  }

  private mapStatus(s: string): MatchStatus {
    if (s === 'IN_PLAY' || s === 'PAUSED') return 'live'
    if (s === 'FINISHED' || s === 'AWARDED') return 'finished'
    return 'scheduled'
  }

  private mapKnockoutStage(stage: string): { stage: Stage; thirdPlace?: boolean } {
    if (stage === 'LAST_32') return { stage: 'r32' }
    if (stage === 'LAST_16') return { stage: 'r16' }
    if (stage === 'QUARTER_FINALS') return { stage: 'qf' }
    if (stage === 'SEMI_FINALS') return { stage: 'sf' }
    if (stage === 'THIRD_PLACE') return { stage: 'sf', thirdPlace: true }
    if (stage === 'FINAL') return { stage: 'final' }
    return { stage: 'r32' }
  }

  private mapMatch(row: unknown): Match | null {
    if (!row || typeof row !== 'object') return null
    const r = row as Record<string, unknown>
    const id = String(r['id'] ?? '')
    if (!id || id === 'undefined') return null

    const status = this.mapStatus(String(r['status'] ?? ''))
    const home = this.teamFrom(r['homeTeam'])
    const away = this.teamFrom(r['awayTeam'])
    const stageFd = String(r['stage'] ?? '')
    const isGroup = stageFd === 'GROUP_STAGE'

    let stage: Stage = 'group'
    let group: string | undefined
    let label: string
    let thirdPlace = false

    if (isGroup) {
      stage = 'group'
      const groupRaw = String(r['group'] ?? '')
      group = groupRaw.replace(/^group[\s_]*/i, '').trim() || undefined
      if (!group) {
        group =
          (home && this.teamGroup.get(home.code)) ||
          (away && this.teamGroup.get(away.code)) ||
          undefined
      }
      const matchday = r['matchday'] ? `Jornada ${r['matchday']}` : ''
      label = group ? `Grupo ${group}${matchday ? ` · ${matchday}` : ''}` : matchday || stageFd
    } else {
      const ko = this.mapKnockoutStage(stageFd)
      stage = ko.stage
      thirdPlace = !!ko.thirdPlace
      label = thirdPlace ? 'Tercer Puesto' : (KNOCKOUT_LABEL[stageFd] ?? stageFd)
    }

    const score = (r['score'] as Record<string, unknown> | undefined) ?? {}
    const fullTime = (score['fullTime'] as Record<string, unknown> | undefined) ?? {}
    const homeScore = typeof fullTime['home'] === 'number' ? fullTime['home'] : 0
    const awayScore = typeof fullTime['away'] === 'number' ? fullTime['away'] : 0
    const penaltiesRaw = score['penalties'] as Record<string, unknown> | undefined
    const pens: [number, number] | undefined =
      penaltiesRaw?.['home'] != null && penaltiesRaw?.['away'] != null
        ? [Number(penaltiesRaw['home']), Number(penaltiesRaw['away'])]
        : undefined
    const halfTimeRaw = score['halfTime'] as Record<string, unknown> | undefined
    const ht: [number, number] | undefined =
      typeof halfTimeRaw?.['home'] === 'number' && typeof halfTimeRaw?.['away'] === 'number'
        ? [halfTimeRaw['home'] as number, halfTimeRaw['away'] as number]
        : undefined

    return {
      id: thirdPlace ? 'TP-1' : id,
      stage,
      group,
      label,
      home,
      away,
      homeScore,
      awayScore,
      status,
      minute: 0,
      kickoff: r['utcDate']
        ? new Date(String(r['utcDate'])).toLocaleString('es', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Por definir',
      utcDate: r['utcDate'] ? String(r['utcDate']) : undefined,
      matchday: isGroup && typeof r['matchday'] === 'number' ? (r['matchday'] as number) : undefined,
      events: [],
      lineups: null,
      stats: null,
      penalties: pens,
      halfTime: ht,
      highlights: undefined,
    }
  }

  private rebuildSnapshot() {
    const matches = [...this.byId.values()]
    let groups = this.groups
    if (groups.length === 0) {
      const groupMap = new Map<string, Team[]>()
      for (const m of matches) {
        if (m.stage !== 'group' || !m.group) continue
        const set = groupMap.get(m.group) ?? []
        for (const t of [m.home, m.away]) {
          if (t && !set.some((x) => x.code === t.code)) set.push(t)
        }
        groupMap.set(m.group, set)
      }
      groups = [...groupMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, teams]) => ({ name, teams }))
    }
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
