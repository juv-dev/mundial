import { useEffect, useMemo, useState } from 'react'
import { useTournament } from './hooks/useTournament'
import { useParticipant } from './hooks/useParticipant'
import { GroupStage } from './components/GroupStage'
import { Bracket } from './components/Bracket'
import { CaminoModal } from './components/CaminoModal'
import { FeaturedMatches } from './components/FeaturedMatches'
import { ParticipantPicker } from './components/ParticipantPicker'
import { source, sourceLabel } from './data/store'
import { buildKnockout } from './data/knockout'
import type { Team } from './data/types'
import { useLocale, type CountryKey } from './i18n/locale'

type View = 'grupos' | 'eliminatorias'

const TABS: { id: View; label: string }[] = [
  { id: 'grupos', label: 'Fase de Grupos' },
  { id: 'eliminatorias', label: 'Eliminatorias' },
]

export default function App() {
  const { groups, matches } = useTournament()
  const [view, setView] = useState<View>('grupos')
  const [camino, setCamino] = useState<{ team: Team; group: string; position: number; qualified: boolean } | null>(
    null,
  )
  const { countryKey, setCountry, countries } = useLocale()
  const { participant } = useParticipant()
  const [showPicker, setShowPicker] = useState(!participant)

  useEffect(() => {
    source.start()
    return () => {
      source.stop()
    }
  }, [])

  const knockout = useMemo(() => buildKnockout(groups, matches), [groups, matches])

  const activeView: View = view

  return (
    <div className="min-h-screen flex flex-col bg-crema">
      <header className="sticky top-0 z-30 border-b border-cal/10 bg-[rgba(236,231,219,0.85)] backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl leading-none uppercase tracking-tight">Mundial</span>
              <span className="font-display text-2xl leading-none tracking-tight text-mag">26</span>
            </div>
            <div className="flex gap-[3px]">
              <span className="w-6 h-[3px] rounded-sm bg-verde" />
              <span className="w-6 h-[3px] rounded-sm bg-rojo" />
              <span className="w-6 h-[3px] rounded-sm bg-mag" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1">
              {(Object.entries(countries) as [CountryKey, (typeof countries)[CountryKey]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCountry(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition ${
                    countryKey === key
                      ? 'bg-cal text-white'
                      : 'text-tiza hover:text-cal'
                  }`}
                >
                  <span>{cfg.flag}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 text-xs text-tiza hover:text-cal transition"
            >
              {participant ? (
                <>
                  <span className="font-semibold text-cal">{participant}</span>
                  <span className="text-tiza/60">(cambiar)</span>
                </>
              ) : (
                <span className="font-semibold text-mag">¿Quién juega?</span>
              )}
            </button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-6 flex gap-1">
          {TABS.map((t) => {
            const active = activeView === t.id
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`relative shrink-0 px-4 py-3.5 text-[13.5px] font-bold whitespace-nowrap transition ${
                  active ? 'text-cal' : 'text-tiza hover:text-cal'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute left-3.5 right-3.5 -bottom-px h-[2.5px] rounded-sm bg-mag" />
                )}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-7 flex-1 w-full">
        <FeaturedMatches matches={matches} />
        {activeView === 'grupos' && (
          <GroupStage
            groups={groups}
            matches={matches}
            onTeamClick={(team, group, position, qualified) => setCamino({ team, group, position, qualified })}
          />
        )}
        {activeView === 'eliminatorias' && <Bracket matches={knockout} />}
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-10 text-center w-full">
        <span className="font-body text-[11px] text-tiza">
          Mundial 2026 · 48 selecciones · USA · Canadá · México · Fuente: {sourceLabel}
        </span>
      </footer>

      {camino && (
        <CaminoModal
          team={camino.team}
          group={camino.group}
          position={camino.position}
          qualified={camino.qualified}
          matches={matches}
          onClose={() => setCamino(null)}
        />
      )}

      {showPicker && (
        <ParticipantPicker
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
