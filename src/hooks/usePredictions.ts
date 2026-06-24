import { useSyncExternalStore, useCallback, useMemo } from 'react'
import { predictionSource } from '../data/predictionStore'

export function usePredictions() {
  const predictions = useSyncExternalStore(
    (cb) => predictionSource.subscribe(cb),
    () => predictionSource.getAll(),
  )

  const allParticipants = useMemo(
    () => [...new Set(predictions.map((p) => p.participant))].sort(),
    [predictions],
  )

  const upsert = useCallback(
    (
      participant: string,
      matchId: string,
      homeScore: number,
      awayScore: number,
      penalties: [number, number] | undefined,
    ) => predictionSource.upsert(participant, matchId, homeScore, awayScore, penalties),
    [],
  )

  return { predictions, allParticipants, upsert }
}
