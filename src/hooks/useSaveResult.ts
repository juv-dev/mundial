import { useState } from 'react'
import { source } from '../data/store'
import type { Match } from '../data/types'

export function useSaveResult() {
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<Match | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async (
    matchId: string,
    homeScore: number,
    awayScore: number,
    penalties: [number, number] | undefined,
    expectedUpdatedAt: string,
  ): Promise<boolean> => {
    setSaving(true)
    setConflict(null)
    setError(null)
    const result = await source.saveResult(matchId, homeScore, awayScore, penalties, expectedUpdatedAt)
    setSaving(false)
    if (!result.ok && result.conflict) {
      setConflict(result.current)
      return false
    }
    if (!result.ok && !result.conflict) {
      setError(result.error || 'Error al guardar el resultado')
      return false
    }
    return result.ok
  }

  const reset = async (matchId: string): Promise<boolean> => {
    setSaving(true)
    setConflict(null)
    setError(null)
    const result = await source.resetResult(matchId)
    setSaving(false)
    if (!result.ok && !result.conflict) {
      setError(result.error || 'Error al reiniciar el resultado')
      return false
    }
    return result.ok
  }

  const clearConflict = () => setConflict(null)
  const clearError = () => setError(null)

  return { save, reset, saving, conflict, error, clearConflict, clearError }
}
