import { describe, it, expect } from 'vitest'
import { rowToPrediction, type DbPrediction } from './predictionMapper'

function row(over: Partial<DbPrediction> & { participant: string; match_id: string }): DbPrediction {
  return {
    home_score: 0,
    away_score: 0,
    home_pens: null,
    away_pens: null,
    updated_at: '2026-06-01T12:00:00Z',
    ...over,
  }
}

describe('rowToPrediction', () => {
  it('should map snake_case fields to camelCase', () => {
    const result = rowToPrediction(row({ participant: 'Jesús', match_id: 'M1', home_score: 2, away_score: 1 }))
    expect(result.participant).toBe('Jesús')
    expect(result.matchId).toBe('M1')
    expect(result.homeScore).toBe(2)
    expect(result.awayScore).toBe(1)
  })

  it('should set updatedAt from updated_at', () => {
    const result = rowToPrediction(row({ participant: 'Papá', match_id: 'M2', updated_at: '2026-06-10T18:00:00Z' }))
    expect(result.updatedAt).toBe('2026-06-10T18:00:00Z')
  })

  it('should convert null penalties to undefined', () => {
    const result = rowToPrediction(row({ participant: 'Abuelo', match_id: 'M3', home_pens: null, away_pens: null }))
    expect(result.homePens).toBeUndefined()
    expect(result.awayPens).toBeUndefined()
  })

  it('should preserve non-null penalties', () => {
    const result = rowToPrediction(
      row({ participant: 'Jesús', match_id: 'M4', home_score: 1, away_score: 1, home_pens: 4, away_pens: 3 }),
    )
    expect(result.homePens).toBe(4)
    expect(result.awayPens).toBe(3)
  })

  it('should handle zero scores correctly', () => {
    const result = rowToPrediction(row({ participant: 'Papá', match_id: 'M5', home_score: 0, away_score: 0 }))
    expect(result.homeScore).toBe(0)
    expect(result.awayScore).toBe(0)
  })
})
