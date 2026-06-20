import { describe, it, expect } from 'vitest'
import {
  teamForm,
  computeStandings,
  applySim,
  bestThirds,
  qualification,
  teamScenario,
} from './standings'
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
    minute: 0,
    kickoff: '',
    events: [],
    lineups: null,
    stats: null,
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

  it('should count live and half-time matches but skip other groups and incomplete matches', () => {
    const g = group('A', ['T1', 'T2'])
    const matches: Match[] = [
      match({ id: '1', group: 'A', home: team('T1'), away: team('T2'), homeScore: 1, awayScore: 0, status: 'live' }),
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

describe('applySim', () => {
  it('should apply simulated scores only to scheduled matches', () => {
    const matches: Match[] = [
      scheduled('1', 'A', 'T1', 'T2'),
      finished('2', 'A', 'T3', 'T4', 1, 0),
      scheduled('3', 'A', 'T5', 'T6'),
    ]
    const out = applySim(matches, { '1': { h: 2, a: 1 } })
    expect(out[0]).toMatchObject({ homeScore: 2, awayScore: 1, status: 'finished' })
    expect(out[1]).toBe(matches[1])
    expect(out[2]).toBe(matches[2])
  })

  it('should ignore matches without both teams', () => {
    const incomplete = match({ id: '1', group: 'A', home: team('T1'), away: null })
    const out = applySim([incomplete], { '1': { h: 1, a: 0 } })
    expect(out[0]).toBe(incomplete)
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

describe('qualification', () => {
  it('should mark dominant teams in and bottom teams out', () => {
    const g = group('A', ['T1', 'T2', 'T3', 'T4'])
    const matches: Match[] = [
      finished('1', 'A', 'T1', 'T2', 1, 0),
      finished('2', 'A', 'T1', 'T3', 1, 0),
      finished('3', 'A', 'T1', 'T4', 1, 0),
      finished('4', 'A', 'T2', 'T3', 1, 0),
      finished('5', 'A', 'T2', 'T4', 1, 0),
      finished('6', 'A', 'T3', 'T4', 1, 0),
    ]
    const result = qualification(g, matches)
    expect(result.get('T1')?.tone).toBe('in')
    expect(result.get('T4')?.tone).toBe('out')
  })

  it('should describe last matchday scenarios when two matches and four teams remain', () => {
    const g = group('A', ['T1', 'T2', 'T3', 'T4'])
    const matches: Match[] = [
      finished('1', 'A', 'T1', 'T3', 1, 0),
      finished('2', 'A', 'T4', 'T1', 1, 0),
      finished('3', 'A', 'T2', 'T4', 1, 0),
      finished('4', 'A', 'T3', 'T2', 1, 0),
      scheduled('5', 'A', 'T1', 'T2'),
      scheduled('6', 'A', 'T3', 'T4'),
    ]
    const result = qualification(g, matches)
    expect(result.get('T1')?.tone).toBe('live')
    expect(typeof result.get('T1')?.label).toBe('string')
  })

  it('should fall back to a generic live label when no clean scenario exists', () => {
    const g = group('A', ['T1', 'T2', 'T3', 'T4'])
    const matches: Match[] = [
      finished('1', 'A', 'T1', 'T2', 1, 0),
      finished('2', 'A', 'T3', 'T4', 1, 0),
      scheduled('3', 'A', 'T1', 'T3'),
      scheduled('4', 'A', 'T2', 'T4'),
      scheduled('5', 'A', 'T1', 'T4'),
      scheduled('6', 'A', 'T2', 'T3'),
    ]
    const result = qualification(g, matches)
    expect(result.get('T2')?.tone).toBe('live')
  })
})

describe('teamScenario', () => {
  it('should return no lines when the team has no remaining matches', () => {
    const g = group('A', ['T1', 'T2'])
    const matches: Match[] = [finished('1', 'A', 'T1', 'T2', 1, 0)]
    expect(teamScenario(g, matches, 'T1')).toEqual([])
  })

  it('should report when a team is already eliminated', () => {
    const g = group('A', ['T1', 'T2', 'T3', 'T4'])
    const matches: Match[] = [
      finished('1', 'A', 'T2', 'T1', 3, 0),
      finished('2', 'A', 'T3', 'T1', 3, 0),
      finished('3', 'A', 'T2', 'T3', 0, 0),
      finished('4', 'A', 'T2', 'T4', 5, 0),
      finished('5', 'A', 'T3', 'T4', 5, 0),
      scheduled('6', 'A', 'T1', 'T4'),
    ]
    const lines = teamScenario(g, matches, 'T1')
    expect(lines.some((l) => l.tone === 'out')).toBe(true)
  })

  it('should report when a team has already clinched', () => {
    const g = group('A', ['T1', 'T2', 'T3', 'T4'])
    const matches: Match[] = [
      finished('1', 'A', 'T1', 'T2', 5, 0),
      finished('2', 'A', 'T1', 'T3', 5, 0),
      finished('3', 'A', 'T2', 'T3', 0, 0),
      finished('4', 'A', 'T2', 'T4', 0, 5),
      finished('5', 'A', 'T3', 'T4', 0, 5),
      scheduled('6', 'A', 'T1', 'T4'),
    ]
    const lines = teamScenario(g, matches, 'T1')
    expect(lines.some((l) => l.tone === 'in')).toBe(true)
  })

  it('should produce mixed scenario lines on a balanced last matchday', () => {
    const g = group('A', ['T1', 'T2', 'T3', 'T4'])
    const matches: Match[] = [
      finished('1', 'A', 'T1', 'T3', 1, 0),
      finished('2', 'A', 'T4', 'T1', 1, 0),
      finished('3', 'A', 'T2', 'T4', 1, 0),
      finished('4', 'A', 'T3', 'T2', 1, 0),
      scheduled('5', 'A', 'T1', 'T2'),
      scheduled('6', 'A', 'T3', 'T4'),
    ]
    const lines = teamScenario(g, matches, 'T1')
    expect(lines.length).toBeGreaterThan(0)
  })

  it('should describe teams that depend on other results', () => {
    const g = group('H', ['H1', 'H2', 'H3', 'H4'])
    const matches: Match[] = [
      finished('1', 'H', 'H1', 'H3', 2, 0),
      finished('2', 'H', 'H1', 'H4', 2, 0),
      finished('3', 'H', 'H3', 'H2', 1, 0),
      finished('4', 'H', 'H4', 'H2', 1, 0),
      scheduled('5', 'H', 'H1', 'H2'),
      scheduled('6', 'H', 'H3', 'H4'),
    ]
    const lines = teamScenario(g, matches, 'H3')
    expect(lines.some((l) => l.tone === 'in')).toBe(true)
    expect(teamScenario(g, matches, 'H2').length).toBeGreaterThan(0)
  })
})

describe('qualification edge scenarios', () => {
  it('should cover conditional and no-win last matchday outcomes', () => {
    const g = group('H', ['H1', 'H2', 'H3', 'H4'])
    const matches: Match[] = [
      finished('1', 'H', 'H1', 'H3', 2, 0),
      finished('2', 'H', 'H1', 'H4', 2, 0),
      finished('3', 'H', 'H3', 'H2', 1, 0),
      finished('4', 'H', 'H4', 'H2', 1, 0),
      scheduled('5', 'H', 'H1', 'H2'),
      scheduled('6', 'H', 'H3', 'H4'),
    ]
    const result = qualification(g, matches)
    expect(result.get('H1')?.tone).toBe('in')
    expect(result.get('H2')?.tone).toBe('live')
    expect(result.get('H3')?.tone).toBe('live')
    expect(typeof result.get('H3')?.label).toBe('string')
  })
})
