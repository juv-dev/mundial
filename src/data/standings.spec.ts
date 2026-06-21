import { describe, it, expect } from 'vitest'
import { teamForm, computeStandings, bestThirds } from './standings'
import type { Group, Match, Team } from './types'

function team(code: string, name = code): Team {
  return { code, name, flag: '' }
}

function group(name: string, codes: string[]): Group {
  return { name, teams: codes.map((c) => team(c)) }
}

function match(over: Partial<Match> & { id: string }): Match {
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

function finished(id: string, groupName: string, home: string, away: string, hs: number, as: number, utcDate?: string): Match {
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

function scheduled(id: string, groupName: string, home: string, away: string): Match {
  return match({ id, group: groupName, home: team(home), away: team(away), status: 'scheduled' })
}

describe('teamForm', () => {
  it('should map results to W, D and L from the team perspective', () => {
    const matches: Match[] = [
      finished('1', 'A', 'X', 'Y', 2, 0, '2026-06-01T00:00:00Z'),
      finished('2', 'A', 'X', 'Y', 0, 1, '2026-06-02T00:00:00Z'),
      finished('3', 'A', 'X', 'Y', 1, 1, '2026-06-03T00:00:00Z'),
      finished('4', 'A', 'Y', 'X', 3, 0, '2026-06-04T00:00:00Z'),
    ]
    expect(teamForm('X', matches)).toEqual(['W', 'L', 'D', 'L'])
    expect(teamForm('Y', matches)).toEqual(['L', 'W', 'D', 'W'])
  })

  it('should ignore unfinished matches and matches without the team', () => {
    const matches: Match[] = [
      finished('1', 'A', 'X', 'Y', 1, 0),
      scheduled('2', 'A', 'X', 'Y'),
      finished('3', 'A', 'P', 'Q', 2, 2),
    ]
    expect(teamForm('X', matches)).toEqual(['W'])
  })

  it('should keep only the last five finished matches', () => {
    const matches: Match[] = Array.from({ length: 7 }, (_, i) =>
      finished(String(i), 'A', 'X', 'Y', 1, 0, `2026-06-0${i + 1}T00:00:00Z`),
    )
    expect(teamForm('X', matches)).toHaveLength(5)
  })

  it('should sort matches without a date last', () => {
    const matches: Match[] = [
      finished('1', 'A', 'X', 'Y', 1, 0),
      finished('2', 'A', 'X', 'Y', 0, 1, '2026-06-01T00:00:00Z'),
    ]
    expect(teamForm('X', matches)).toEqual(['L', 'W'])
  })
})

describe('computeStandings', () => {
  it('should award points and order by points, goal difference and goals for', () => {
    const g = group('A', ['T1', 'T2', 'T3'])
    const matches: Match[] = [
      finished('1', 'A', 'T1', 'T2', 2, 0),
      finished('2', 'A', 'T2', 'T3', 1, 1),
      finished('3', 'A', 'T1', 'T3', 0, 0),
    ]
    const table = computeStandings(g, matches)
    expect(table.map((r) => r.team.code)).toEqual(['T1', 'T3', 'T2'])
    expect(table[0].points).toBe(4)
    expect(table[0].goalsFor).toBe(2)
  })

  it('should count finished matches but skip other groups and incomplete matches', () => {
    const g = group('A', ['T1', 'T2'])
    const matches: Match[] = [
      match({ id: '1', group: 'A', home: team('T1'), away: team('T2'), homeScore: 1, awayScore: 0, status: 'finished' }),
      finished('2', 'B', 'T1', 'T2', 5, 0),
      match({ id: '3', group: 'A', home: null, away: team('T2'), status: 'finished' }),
      finished('4', 'A', 'T1', 'ZZ', 9, 0),
    ]
    const table = computeStandings(g, matches)
    expect(table[0].team.code).toBe('T1')
    expect(table[0].played).toBe(1)
    expect(table[0].points).toBe(3)
  })
})

describe('bestThirds', () => {
  it('should collect the eight best third-placed teams across groups', () => {
    const gA = group('A', ['A1', 'A2', 'A3'])
    const gB = group('B', ['B1', 'B2', 'B3'])
    const short = group('C', ['C1', 'C2'])
    const matches: Match[] = [
      finished('1', 'A', 'A1', 'A2', 1, 0),
      finished('2', 'A', 'A2', 'A3', 1, 0),
      finished('3', 'A', 'A1', 'A3', 3, 0),
      finished('4', 'B', 'B1', 'B2', 1, 0),
      finished('5', 'B', 'B2', 'B3', 1, 0),
      finished('6', 'B', 'B1', 'B3', 1, 0),
      finished('7', 'C', 'C1', 'C2', 1, 0),
    ]
    const result = bestThirds([gA, gB, short], matches)
    expect(result.has('A3')).toBe(true)
    expect(result.has('B3')).toBe(true)
    expect(result.size).toBe(2)
  })
})
