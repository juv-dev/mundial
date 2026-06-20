import type { TournamentSnapshot } from '../types'

export interface DataSource {
  getSnapshot(): TournamentSnapshot
  subscribe(listener: () => void): () => void
  start(): void
  stop(): void
  requestDetail?(matchId: string): void
}
