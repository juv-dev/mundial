export interface Team {
  code: string
  name: string
  nameEn?: string
  flag: string
  logo?: string
}

export type MatchStatus = 'scheduled' | 'finished'

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
  homePens?: number
  awayPens?: number
  status: MatchStatus
  kickoff: string
  utcDate?: string
  matchday?: number
  updatedAt?: string
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

export interface Prediction {
  participant: string
  matchId: string
  homeScore: number
  awayScore: number
  homePens?: number
  awayPens?: number
  updatedAt?: string
}
