import { useSyncExternalStore, useCallback, useMemo } from 'react'
import { predictionSource } from '../data/predictionStore'
import type { Prediction } from '../data/types'
import type { SavePrediction } from '../data/source/PredictionSource'

export function usePredictions(): {
  predictions: Prediction[]
  allParticipants: string[]
  upsert: (
    participant: string,
    matchId: string,
    homeScore: number,
    awayScore: number,
    penalties: [number, number] | undefined,
  ) => Promise<SavePrediction>
} {
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
