import { useState } from 'react'
import { source } from '../data/store'

export function useSaveResult() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (
    matchId: string,
    homeScore: number,
    awayScore: number,
    penalties?: [number, number],
  ): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const result = await source.saveResult(matchId, homeScore, awayScore, penalties)
      setSaving(false)
      if (!result.ok) {
        setError(result.error || 'Error al guardar el resultado')
        return false
      }
      return true
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Error inesperado al guardar')
      return false
    }
  }

  const reset = async (matchId: string): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const result = await source.resetResult(matchId)
      setSaving(false)
      if (!result.ok) {
        setError(result.error || 'Error al resetear el resultado')
        return false
      }
      return true
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Error inesperado al resetear')
      return false
    }
  }

  const clearError = () => setError(null)

  return { save, reset, saving, error, clearError }
}
