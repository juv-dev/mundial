import { describe, it, expect } from 'vitest'
import { buildKnockout } from './knockout'
import type { Group, Match, Team } from './types'

function team(code: string): Team {
  return { code, name: code, flag: '' }
}

function group(name: string, codes: string[]): Group {
  return { name, teams: codes.map(team) }
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

function finished(
  id: string,
  groupName: string,
  home: string,
  away: string,
  hs: number,
  as: number,
): Match {
  return match({
    id,
    group: groupName,
    home: team(home),
    away: team(away),
    homeScore: hs,
    awayScore: as,
    status: 'finished',
  })
}

describe('buildKnockout overlay', () => {
  it('should overlay scores and penalties from a finished DB row that has null home/away codes', () => {
    const groups = [group('A', ['A1', 'A2']), group('B', ['B1', 'B2'])]
    const groupMatches: Match[] = [
      finished('gA-1', 'A', 'A1', 'A2', 3, 0),
      finished('gB-1', 'B', 'B1', 'B2', 1, 0),
    ]
    const koRow: Match = match({
      id: 'KO-73',
      stage: 'r32',
      home: null,
      away: null,
      homeScore: 1,
      awayScore: 1,
      homePens: 3,
      awayPens: 5,
      status: 'finished',
      updatedAt: '2026-07-01T12:00:00Z',
    })

    const result = buildKnockout(groups, [...groupMatches, koRow])
    const ko73 = result.find((m) => m.id === 'KO-73')!

    expect(ko73.home?.code).toBe('A2')
    expect(ko73.away?.code).toBe('B2')
    expect(ko73.status).toBe('finished')
    expect(ko73.homeScore).toBe(1)
    expect(ko73.awayScore).toBe(1)
    expect(ko73.homePens).toBe(3)
    expect(ko73.awayPens).toBe(5)
    expect(ko73.updatedAt).toBe('2026-07-01T12:00:00Z')
  })

  it('should propagate the penalty winner of a knockout match to the next round', () => {
    const groups = [group('A', ['A1', 'A2']), group('B', ['B1', 'B2'])]
    const groupMatches: Match[] = [
      finished('gA-1', 'A', 'A1', 'A2', 3, 0),
      finished('gB-1', 'B', 'B1', 'B2', 1, 0),
    ]
    const koRow: Match = match({
      id: 'KO-73',
      stage: 'r32',
      home: null,
      away: null,
      homeScore: 1,
      awayScore: 1,
      homePens: 3,
      awayPens: 5,
      status: 'finished',
    })

    const result = buildKnockout(groups, [...groupMatches, koRow])
    const ko90 = result.find((m) => m.id === 'KO-90')!

    expect(ko90.home?.code).toBe('B2')
  })
})
