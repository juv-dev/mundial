import type { Prediction } from '../types'

export interface DbPrediction {
  participant: string
  match_id: string
  home_score: number
  away_score: number
  home_pens: number | null
  away_pens: number | null
  updated_at: string
}

export function rowToPrediction(row: DbPrediction): Prediction {
  return {
    participant: row.participant,
    matchId: row.match_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    homePens: row.home_pens ?? undefined,
    awayPens: row.away_pens ?? undefined,
    updatedAt: row.updated_at,
  }
}
