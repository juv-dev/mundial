import { useSyncExternalStore } from 'react'
import { source } from '../data/store'
import type { TournamentSnapshot } from '../data/types'

export function useTournament(): TournamentSnapshot {
  return useSyncExternalStore(
    (cb) => source.subscribe(cb),
    () => source.getSnapshot(),
  )
}
