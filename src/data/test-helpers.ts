import type { Match, Team, Group } from './types'

export function team(code: string, name = code): Team {
  return { code, name, flag: '' }
}

export function group(name: string, codes: string[]): Group {
  return { name, teams: codes.map((c) => team(c)) }
}

export function match(over: Partial<Match> & { id: string }): Match {
  return {
    stage: 'group',
    home: null,
    away: null,
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled',
    kickoff: '',
    ...over,
  }
}

export function finished(
  id: string,
  groupName: string,
  home: string,
  away: string,
  hs: number,
  as: number,
  utcDate?: string,
): Match {
  return match({
    id,
    group: groupName,
    home: team(home),
    away: team(away),
    homeScore: hs,
    awayScore: as,
    status: 'finished',
    utcDate,
  })
}
