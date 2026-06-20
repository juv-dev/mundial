export interface Team {
  code: string
  name: string
  nameEn?: string
  flag: string
  logo?: string
}

export type MatchStatus = 'scheduled' | 'live' | 'half-time' | 'finished'

export type EventType = 'goal' | 'own-goal' | 'penalty' | 'yellow' | 'red' | 'sub'

export interface MatchEvent {
  id: string
  minute: number
  minuteLabel?: string
  type: EventType
  teamCode: string
  player: string
  detail?: string
}

export interface PlayerSlot {
  number: number
  name: string
  position: string
  photo?: string
  club?: string
}

export interface Lineup {
  formation: string
  starters: PlayerSlot[]
  bench: PlayerSlot[]
}

export interface MatchStats {
  possession: [number, number]
  shots: [number, number]
  shotsOnTarget: [number, number]
  corners: [number, number]
  fouls: [number, number]
  offsides: [number, number]
  passes: [number, number]
}

export interface Highlight {
  id: string
  title: string
  type: string
  url: string
  embedUrl?: string
  imgUrl?: string
  source?: string
}

export type Stage =
  | 'group'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'final'

export interface Match {
  id: string
  stage: Stage
  group?: string
  label?: string
  home: Team | null
  away: Team | null
  homeSlot?: string
  awaySlot?: string
  homeScore: number
  awayScore: number
  status: MatchStatus
  minute: number
  kickoff: string
  utcDate?: string
  matchday?: number
  events: MatchEvent[]
  lineups: { home: Lineup; away: Lineup } | null
  stats: MatchStats | null
  penalties?: [number, number]
  halfTime?: [number, number]
  highlights?: Highlight[]
}

export interface GroupRow {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface Group {
  name: string
  teams: Team[]
}

export interface TournamentSnapshot {
  groups: Group[]
  matches: Match[]
  updatedAt: number
}
