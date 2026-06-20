import { useEffect, useState } from 'react'
import type { Match, Team } from '../data/types'
import { pathToGlory } from '../data/knockout'
import { Flag, teamName } from './shared'
import { useSquad, type SquadPlayer } from '../hooks/useSquad'

type Tab = 'camino' | 'plantilla'

export function CaminoModal({
  team,
  group,
  position,
  qualified,
  matches,
  onClose,
}: {
  team: Team
  group: string
  position: number
  qualified: boolean
  matches: Match[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>(qualified ? 'camino' : 'plantilla')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'camino', label: 'Camino a la gloria' },
    { id: 'plantilla', label: 'Plantilla' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(15,13,9,0.55)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin animate-slide-up rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-cal text-white p-6 pb-5 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(120% 90% at 50% -20%, rgba(27,67,224,0.28), transparent 60%)' }}
          />
          <div className="relative flex justify-between items-start">
            <div className="flex items-center gap-2.5 min-w-0">
              <Flag team={team} size="text-4xl" />
              <div className="min-w-0">
                <div className="text-lg font-bold text-white truncate">{teamName(team)}</div>
                <div className="text-[10.5px] text-white/50 uppercase tracking-[0.14em] font-bold">Grupo {group}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-[30px] h-[30px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-base leading-none transition shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="flex gap-1 px-5 border-b border-cal/[0.08] bg-white">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-sm font-medium transition border-b-2 ${
                tab === t.id ? 'border-mag text-mag' : 'border-transparent text-tiza hover:text-cal'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-5">
          {tab === 'camino' ? (
            <Camino team={team} group={group} position={position} qualified={qualified} matches={matches} />
          ) : (
            <Plantilla team={team} />
          )}
        </div>
      </div>
    </div>
  )
}

function Camino({
  team,
  group,
  position,
  qualified,
  matches,
}: {
  team: Team
  group: string
  position: number
  qualified: boolean
  matches: Match[]
}) {
  const isThird = position === 3
  const [pos, setPos] = useState<1 | 2>(position === 2 ? 2 : 1)

  if (!qualified) {
    return (
      <p className="text-center text-sm text-tiza py-8 leading-snug">
        {teamName(team)} todavía no está en zona de clasificación.
        <br />
        El camino aparece para los 2 primeros y los 8 mejores terceros.
      </p>
    )
  }

  const path = pathToGlory(group, pos)
  const groupGames = matches.filter(
    (m) => m.group === group && (m.home?.code === team.code || m.away?.code === team.code),
  )

  return (
    <>
      {isThird ? (
        <div className="mb-5 rounded-lg bg-tercero/10 border border-tercero/30 p-3 text-center">
          <p className="text-sm font-semibold text-tercero">Clasificado como mejor tercero</p>
          <p className="text-[11px] text-tiza mt-1 leading-snug">
            Tu rival de 16avos depende del sorteo de terceros.
          </p>
        </div>
      ) : (
        <div className="flex gap-1.5 mb-5">
          {([1, 2] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                pos === p ? 'bg-mag text-white' : 'bg-cal/[0.05] text-tiza hover:text-cal'
              }`}
            >
              Si sale {p}° del grupo
            </button>
          ))}
        </div>
      )}

      <ol className="relative ml-3 border-l-2 border-cal/[0.1] space-y-5">
        <Step round="Fase de Grupos" detail={`${groupGames.length} partidos · Grupo ${group}`} tone="start" />
        {path.map((s) => (
          <Step
            key={s.matchN}
            round={s.round}
            detail={isThird ? 'rival por definir' : `vs ${s.opponent}`}
            tone={s.stage === 'final' ? 'glory' : 'normal'}
          />
        ))}
      </ol>
    </>
  )
}

function Step({ round, detail, tone }: { round: string; detail: string; tone: 'start' | 'normal' | 'glory' }) {
  const dot =
    tone === 'glory' ? 'bg-mag border-mag' : tone === 'start' ? 'bg-verde border-verde' : 'bg-white border-cal/30'
  return (
    <li className="ml-5 relative">
      <span className={`absolute -left-[1.7rem] top-0.5 w-3.5 h-3.5 rounded-full border-2 ${dot}`} />
      <div className={`text-sm font-bold ${tone === 'glory' ? 'text-mag' : 'text-cal'}`}>
        {tone === 'glory' ? '🏆 Final' : round}
      </div>
      <div className="text-xs text-tiza mt-0.5">{detail}</div>
    </li>
  )
}

const GROUP_ES: Record<string, string> = {
  Goalkeepers: 'Porteros',
  Defenders: 'Defensas',
  Midfielders: 'Centrocampistas',
  Forwards: 'Delanteros',
  Coach: 'Entrenador',
}

function Plantilla({ team }: { team: Team }) {
  const { squad, loading } = useSquad(team.nameEn ?? team.name)

  if (loading) return <p className="text-center text-sm text-tiza py-8">Cargando plantilla…</p>
  if (!squad || squad.groups.length === 0)
    return <p className="text-center text-sm text-tiza py-8">Plantilla no disponible todavía.</p>

  return (
    <div className="space-y-5">
      {squad.groups.map(
        (g) =>
          g.players.length > 0 && (
            <div key={g.type}>
              <p className="text-[11px] uppercase tracking-[0.12em] text-mag font-bold mb-2">
                {GROUP_ES[g.type] ?? g.type}
              </p>
              <ul className="divide-y divide-cal/[0.06]">
                {g.players.map((pl, i) => (
                  <PlayerRow key={`${g.type}-${i}`} player={pl} coach={g.type === 'Coach'} />
                ))}
              </ul>
            </div>
          ),
      )}
    </div>
  )
}

function PlayerRow({ player, coach }: { player: SquadPlayer; coach?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-2">
      {!coach && (
        <span className="w-6 text-center text-sm tabular-nums font-bold text-tiza shrink-0">
          {player.number ?? '–'}
        </span>
      )}
      {player.photo ? (
        <img
          src={player.photo}
          alt=""
          loading="lazy"
          className="w-9 h-9 rounded-full object-cover bg-cal/10 shrink-0"
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
      ) : (
        <span className="w-9 h-9 rounded-full bg-cal/10 shrink-0" />
      )}
      <span className="flex-1 min-w-0 text-[15px] text-cal truncate">{player.name}</span>
      {player.clubLogo && (
        <img
          src={player.clubLogo}
          alt=""
          loading="lazy"
          className="w-5 h-5 object-contain shrink-0 opacity-90"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </li>
  )
}
