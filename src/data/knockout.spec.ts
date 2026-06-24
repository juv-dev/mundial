import { describe, it, expect } from 'vitest'
import { buildKnockout } from './knockout'
import type { Match } from './types'
import { group, match, finished } from './test-helpers'

const groups = [group('A', ['A1', 'A2']), group('B', ['B1', 'B2'])]
const groupMatches: Match[] = [
  finished('gA-1', 'A', 'A1', 'A2', 3, 0),
  finished('gB-1', 'B', 'B1', 'B2', 1, 0),
]

function ko73Row(overrides?: Partial<Match>): Match {
  return match({
    id: 'KO-73',
    stage: 'r32',
    home: null,
    away: null,
    homeScore: 1,
    awayScore: 1,
    homePens: 3,
    awayPens: 5,
    status: 'finished',
    ...overrides,
  })
}

describe('buildKnockout overlay', () => {
  it('should overlay scores and penalties from a finished DB row that has null home/away codes', () => {
    const koRow = ko73Row({ updatedAt: '2026-07-01T12:00:00Z' })

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
    const koRow = ko73Row()

    const result = buildKnockout(groups, [...groupMatches, koRow])
    const ko90 = result.find((m) => m.id === 'KO-90')!

    expect(ko90.home?.code).toBe('B2')
  })
})
