import type { TournamentSnapshot, Match } from '../types'

export type SaveResult =
  | { ok: true }
  | { ok: false; conflict: true; current: Match }
  | { ok: false; conflict: false; error: string }

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
    expectedUpdatedAt: string,
  ): Promise<SaveResult>
  resetResult(matchId: string): Promise<SaveResult>
}
