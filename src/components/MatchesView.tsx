import { useState, type ReactNode } from 'react'
import type { Match } from '../data/types'
import { Flag, teamName } from './shared'
import { useLocale } from '../i18n/locale'

type Mode = 'grupos' | 'eliminatorias'

const STAGES: { key: string; label: string }[] = [
  { key: 'r32', label: '16avos' },
  { key: 'r16', label: '8avos' },
  { key: 'qf', label: 'Cuartos' },
  { key: 'sf', label: 'Semis' },
  { key: 'tp', label: 'Tercer Puesto' },
  { key: 'final', label: 'Final' },
]

function byDate(a: Match, b: Match): number {
  const da = a.utcDate ? Date.parse(a.utcDate) : Infinity
  const db = b.utcDate ? Date.parse(b.utcDate) : Infinity
  return da - db
}

export function MatchesView({
  matches,
  knockout,
  onOpen,
}: {
  matches: Match[]
  knockout: Match[]
  onOpen: (m: Match) => void
}) {
  const [mode, setMode] = useState<Mode>('grupos')
  const [selGroup, setSelGroup] = useState<string | null>(null)
  const [selStage, setSelStage] = useState<string | null>(null)

  const groupLetters = [...new Set(matches.filter((m) => m.group).map((m) => m.group as string))].sort()
  const activeGroup = selGroup && groupLetters.includes(selGroup) ? selGroup : groupLetters[0]

  const stageMatches = (key: string): Match[] => {
    if (key === 'tp') return knockout.filter((m) => m.id === 'TP-1')
    if (key === 'sf') return knockout.filter((m) => m.stage === 'sf' && m.id !== 'TP-1')
    return knockout.filter((m) => m.stage === key)
  }
  const firstStage = STAGES.find((s) => stageMatches(s.key).length > 0)?.key ?? 'r32'
  const activeStage = selStage ?? firstStage

  const list =
    mode === 'grupos'
      ? matches.filter((m) => m.group === activeGroup).sort(byDate)
      : stageMatches(activeStage)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex gap-1.5 mb-4 max-w-xs">
        {(['grupos', 'eliminatorias'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${
              mode === m ? 'bg-mag text-white' : 'bg-cal/[0.05] text-tiza hover:text-cal'
            }`}
          >
            {m === 'grupos' ? 'Grupos' : 'Eliminatorias'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {mode === 'grupos'
          ? groupLetters.map((l) => (
              <Pill key={l} active={l === activeGroup} onClick={() => setSelGroup(l)}>
                Grupo {l}
              </Pill>
            ))
          : STAGES.map((s) => (
              <Pill key={s.key} active={s.key === activeStage} onClick={() => setSelStage(s.key)}>
                {s.label}
              </Pill>
            ))}
      </div>

      {list.length === 0 ? (
        <p className="text-center text-sm text-tiza py-8">Sin partidos</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {list.map((m) => (
            <MatchRow key={m.id} match={m} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
        active ? 'bg-mag text-white' : 'bg-cal/[0.05] text-tiza hover:text-cal'
      }`}
    >
      {children}
    </button>
  )
}

function MatchRow({ match, onOpen }: { match: Match; onOpen: (m: Match) => void }) {
  const { formatDateTime } = useLocale()
  const live = match.status === 'live' || match.status === 'half-time'
  const finished = match.status === 'finished'
  const played = finished || live
  const homeName = match.home ? teamName(match.home) : match.homeSlot ?? 'Por definir'
  const awayName = match.away ? teamName(match.away) : match.awaySlot ?? 'Por definir'

  return (
    <button
      onClick={() => onOpen(match)}
      className="card w-full flex items-center gap-2 py-3 px-3.5 hover:shadow-card-hover transition text-left"
    >
      <span className="w-16 shrink-0 text-[10px] leading-tight">
        {live ? (
          <span className="text-rojo font-bold">VIVO</span>
        ) : finished ? (
          <span className="text-verde font-bold">FIN</span>
        ) : (
          <span className="text-tiza">{match.utcDate ? formatDateTime(match.utcDate) : match.kickoff}</span>
        )}
      </span>

      <span className="flex-1 flex items-center gap-1.5 min-w-0 justify-end text-right text-sm">
        <span className={`truncate ${match.home ? 'text-cal' : 'text-tiza/60 italic text-xs'}`}>{homeName}</span>
        <Flag team={match.home} size="text-lg" />
      </span>

      <span className="w-12 text-center shrink-0">
        {played ? (
          <span className={`font-display text-xl tabular-nums ${live ? 'text-rojo' : 'text-cal'}`}>
            {match.homeScore}-{match.awayScore}
          </span>
        ) : (
          <span className="text-tiza/50 text-xs">vs</span>
        )}
      </span>

      <span className="flex-1 flex items-center gap-1.5 min-w-0 text-sm">
        <Flag team={match.away} size="text-lg" />
        <span className={`truncate ${match.away ? 'text-cal' : 'text-tiza/60 italic text-xs'}`}>{awayName}</span>
      </span>
    </button>
  )
}
