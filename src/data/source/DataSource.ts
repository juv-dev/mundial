import type { TournamentSnapshot } from '../types'

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string }

export interface DataSource {
  getSnapshot(): TournamentSnapshot
  subscribe(listener: () => void): () => void
  start(): void
  stop(): void
  saveResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
    penalties: [number, number] | undefined,
  ): Promise<SaveResult>
}
