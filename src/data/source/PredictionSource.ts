import type { Prediction } from '../types'

export type SavePrediction =
  | { ok: true }
  | { ok: false; error: string }

export interface PredictionSource {
  getAll(): Prediction[]
  subscribe(listener: () => void): () => void
  start(): void
  stop(): void
  upsert(
    participant: string,
    matchId: string,
    homeScore: number,
    awayScore: number,
    penalties: [number, number] | undefined,
  ): Promise<SavePrediction>
}
