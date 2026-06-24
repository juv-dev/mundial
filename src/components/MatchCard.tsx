import { useState, useEffect, useRef } from 'react'
import type { Match } from '../data/types'
import { Flag, teamName } from './shared'
import { useLocale } from '../i18n/locale'
import { useSaveResult } from '../hooks/useSaveResult'
import { useParticipant } from '../hooks/useParticipant'
import { usePredictions } from '../hooks/usePredictions'

export function MatchCard({ match }: { match: Match }) {
  const { formatDateTime } = useLocale()
  const { save, saving, conflict, error, clearConflict, clearError } = useSaveResult()
  const { participant } = useParticipant()
  const { predictions, allParticipants, upsert } = usePredictions()

  const [editingOfficial, setEditingOfficial] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [officialHome, setOfficialHome] = useState('')
  const [officialAway, setOfficialAway] = useState('')
  const [officialPenHome, setOfficialPenHome] = useState('')
  const [officialPenAway, setOfficialPenAway] = useState('')

  const [predHome, setPredHome] = useState('')
  const [predAway, setPredAway] = useState('')
  const [predPenHome, setPredPenHome] = useState('')
  const [predPenAway, setPredPenAway] = useState('')
  const [savingPred, setSavingPred] = useState(false)
  const [predError, setPredError] = useState<string | null>(null)
  const predSeededRef = useRef(false)

  const finished = match.status === 'finished'
  const isKnockout = match.stage !== 'group'
  const playable = !!match.home && !!match.away
  const kickoffDisplay = formatDateTime(match.utcDate ?? match.kickoff)

  const myPred = participant
    ? predictions.find((p) => p.matchId === match.id && p.participant === participant)
    : undefined

  const otherParticipants = allParticipants.filter((p) => p !== participant)

  useEffect(() => {
    predSeededRef.current = false
    setPredHome('')
    setPredAway('')
    setPredPenHome('')
    setPredPenAway('')
  }, [participant])

  useEffect(() => {
    if (!predSeededRef.current && myPred !== undefined) {
      predSeededRef.current = true
      setPredHome(String(myPred.homeScore))
      setPredAway(String(myPred.awayScore))
      setPredPenHome(myPred.homePens != null ? String(myPred.homePens) : '')
      setPredPenAway(myPred.awayPens != null ? String(myPred.awayPens) : '')
    }
  }, [myPred])

  useEffect(() => {
    setJustSaved(false)
    clearError()
  }, [match])

  const startEditOfficial = () => {
    setOfficialHome(String(match.homeScore))
    setOfficialAway(String(match.awayScore))
    setOfficialPenHome(match.homePens != null ? String(match.homePens) : '')
    setOfficialPenAway(match.awayPens != null ? String(match.awayPens) : '')
    clearConflict()
    clearError()
    setEditingOfficial(true)
  }

  const cancelEditOfficial = () => {
    setEditingOfficial(false)
    clearConflict()
    clearError()
  }

  const handleSaveOfficial = async () => {
    const h = parseInt(officialHome, 10)
    const a = parseInt(officialAway, 10)
    if (!Number.isFinite(h) || !Number.isFinite(a)) return
    const ph = parseInt(officialPenHome, 10)
    const pa = parseInt(officialPenAway, 10)
    const pens: [number, number] | undefined =
      isKnockout && Number.isFinite(ph) && Number.isFinite(pa) && h === a ? [ph, pa] : undefined
    const ok = await save(match.id, h, a, pens, match.updatedAt ?? '')
    if (ok) {
      setEditingOfficial(false)
      setJustSaved(true)
    }
  }

  const handleSavePrediction = async () => {
    if (!participant) return
    const h = parseInt(predHome, 10)
    const a = parseInt(predAway, 10)
    if (!Number.isFinite(h) || !Number.isFinite(a)) return
    const ph = parseInt(predPenHome, 10)
    const pa = parseInt(predPenAway, 10)
    const pens: [number, number] | undefined =
      isKnockout && Number.isFinite(ph) && Number.isFinite(pa) && h === a ? [ph, pa] : undefined
    setSavingPred(true)
    const result = await upsert(participant, match.id, h, a, pens)
    setSavingPred(false)
    if (!result.ok) {
      setPredError(result.error)
    } else {
      setPredError(null)
    }
  }

  const showOfficialInputs = (!finished && !justSaved) || editingOfficial

  const scoreInput = (value: string, onChange: (v: string) => void, size: 'lg' | 'sm' = 'lg') => (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
      placeholder="–"
      className={
        size === 'lg'
          ? 'w-10 h-8 text-center bg-cal/[0.06] border border-cal/[0.14] rounded-lg text-cal font-display text-2xl tabular-nums placeholder:text-tiza/40 focus:border-mag focus:outline-none'
          : 'w-9 h-7 text-center bg-cal/[0.06] border border-cal/[0.14] rounded text-cal font-display text-lg tabular-nums placeholder:text-tiza/40 focus:border-verde focus:outline-none'
      }
    />
  )

  return (
    <div className={`card w-full p-4 ${!playable ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        {!isKnockout && (
          <span className="text-[10px] uppercase tracking-[0.12em] text-tiza shrink-0">{match.label}</span>
        )}
        {finished ? (
          <span className="text-xs font-bold text-verde uppercase tracking-wide">
            Finalizado{match.homePens != null && match.awayPens != null ? ' · pen' : ''}
          </span>
        ) : (
          <span className="text-base font-bold text-cal text-right leading-tight capitalize">
            {kickoffDisplay}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <div className={`truncate font-semibold text-sm ${match.home ? 'text-cal' : 'text-tiza/70 italic'}`}>
              {match.home ? teamName(match.home) : match.homeSlot ?? 'Por definir'}
            </div>
            {isKnockout && match.home && match.homeSlot && (
              <div className="text-[10px] text-tiza/60 truncate">{match.homeSlot}</div>
            )}
          </div>
          <Flag team={match.home} />
        </div>
        <span className="text-tiza/40 text-xs shrink-0">vs</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Flag team={match.away} />
          <div className="min-w-0">
            <div className={`truncate font-semibold text-sm ${match.away ? 'text-cal' : 'text-tiza/70 italic'}`}>
              {match.away ? teamName(match.away) : match.awaySlot ?? 'Por definir'}
            </div>
            {isKnockout && match.away && match.awaySlot && (
              <div className="text-[10px] text-tiza/60 truncate">{match.awaySlot}</div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-cal/[0.08] pt-3 mb-3">
        <span className="text-[9px] uppercase tracking-[0.12em] text-tiza/50 font-semibold mb-2 block">
          Resultado oficial
        </span>

        {showOfficialInputs && playable ? (
          <>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              {scoreInput(officialHome, setOfficialHome)}
              <span className="text-tiza/40">–</span>
              {scoreInput(officialAway, setOfficialAway)}
            </div>

            {isKnockout &&
              officialHome !== '' &&
              officialAway !== '' &&
              parseInt(officialHome, 10) === parseInt(officialAway, 10) && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-[11px] text-tiza">Penales:</span>
                  {scoreInput(officialPenHome, setOfficialPenHome)}
                  <span className="text-tiza/40 text-xs">–</span>
                  {scoreInput(officialPenAway, setOfficialPenAway)}
                </div>
              )}

            {conflict && (
              <p className="text-[11px] text-rojo mb-2 text-center">
                Actualizado en otro dispositivo ({conflict.homeScore}–{conflict.awayScore}). Recarga la página.
              </p>
            )}
            {error && (
              <p className="text-[11px] text-rojo mb-2 text-center">{error}</p>
            )}

            <div className="flex gap-2">
              {editingOfficial && (
                <button
                  onClick={cancelEditOfficial}
                  className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-tiza bg-cal/[0.06] hover:bg-cal/[0.12] transition"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSaveOfficial}
                disabled={saving || officialHome === '' || officialAway === ''}
                className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white bg-mag hover:bg-mag/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Guardando…' : 'Guardar resultado'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-display text-3xl tabular-nums text-cal">
              {match.homeScore}–{match.awayScore}
            </span>
            {match.homePens != null && match.awayPens != null && (
              <span className="text-[11px] text-tiza">pen {match.homePens}–{match.awayPens}</span>
            )}
            {playable && (
              <button
                onClick={startEditOfficial}
                className="text-[11px] font-semibold text-mag border border-mag/30 rounded-lg px-3 py-1 hover:bg-mag/10 transition"
              >
                Corregir
              </button>
            )}
          </div>
        )}
      </div>

      {playable && (
        <div className="border-t border-cal/[0.08] pt-3 mb-3">
          <span className="text-[9px] uppercase tracking-[0.12em] text-tiza/50 font-semibold mb-2 block">
            Mi pronóstico
          </span>

          {!participant ? (
            <p className="text-[11px] text-tiza/60">
              Configura tu nombre en el encabezado para guardar pronósticos.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                {scoreInput(predHome, setPredHome, 'sm')}
                <span className="text-tiza/40 text-xs">–</span>
                {scoreInput(predAway, setPredAway, 'sm')}
                <button
                  onClick={handleSavePrediction}
                  disabled={savingPred || predHome === '' || predAway === ''}
                  className="ml-1 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-verde hover:bg-verde/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {savingPred ? '…' : 'Guardar'}
                </button>
              </div>

              {predError && (
                <p className="text-[11px] text-rojo mb-2 text-center">{predError}</p>
              )}

              {isKnockout &&
                predHome !== '' &&
                predAway !== '' &&
                parseInt(predHome, 10) === parseInt(predAway, 10) && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] text-tiza">Penales:</span>
                    {scoreInput(predPenHome, setPredPenHome, 'sm')}
                    <span className="text-tiza/40 text-xs">–</span>
                    {scoreInput(predPenAway, setPredPenAway, 'sm')}
                  </div>
                )}
            </>
          )}
        </div>
      )}

      {playable && (
        <div className="border-t border-cal/[0.08] pt-3">
          <span className="text-[9px] uppercase tracking-[0.12em] text-tiza/50 font-semibold mb-2 block">
            Pronósticos
          </span>

          {otherParticipants.length === 0 ? (
            <p className="text-[11px] text-tiza/50">Sin pronósticos aún.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {otherParticipants.map((name) => {
                const pred = predictions.find(
                  (p) => p.matchId === match.id && p.participant === name,
                )
                return (
                  <span
                    key={name}
                    className="text-[11px] bg-cal/[0.05] rounded-full px-2.5 py-1 leading-none"
                  >
                    <span className="font-semibold text-cal">{name}:</span>{' '}
                    {pred ? (
                      <>
                        {pred.homeScore}–{pred.awayScore}
                        {pred.homePens != null && pred.awayPens != null
                          ? ` · pen ${pred.homePens}–${pred.awayPens}`
                          : ''}
                      </>
                    ) : (
                      <span className="text-tiza/40">sin pronóstico</span>
                    )}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}