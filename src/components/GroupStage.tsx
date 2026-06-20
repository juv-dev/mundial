import { useMemo, useState } from 'react'
import type { Group, Match, Team } from '../data/types'
import { computeStandings, bestThirds, applySim, teamForm } from '../data/standings'
import type { SimScore } from '../data/standings'
import { Flag, teamName } from './shared'
import { useLocale } from '../i18n/locale'

type Draft = Record<string, { h: string; a: string }>
type Outcome = 'G' | 'E' | 'P'

export function GroupStage({
  groups,
  matches,
  onOpen,
  onTeamClick,
}: {
  groups: Group[]
  matches: Match[]
  onOpen: (m: Match) => void
  onTeamClick: (team: Team, group: string, position: number, qualified: boolean) => void
}) {
  const [draft, setDraft] = useState<Draft>({})
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const sim = useMemo(() => {
    const out: Record<string, SimScore> = {}
    for (const [id, d] of Object.entries(draft)) {
      const h = parseInt(d.h, 10)
      const a = parseInt(d.a, 10)
      if (Number.isFinite(h) && Number.isFinite(a)) out[id] = { h, a }
    }
    return out
  }, [draft])

  const simMatches = useMemo(() => applySim(matches, sim), [matches, sim])
  const thirds = bestThirds(groups, simMatches)
  const simCount = Object.keys(sim).length
  const activeName = selectedGroup && groups.some((g) => g.name === selectedGroup) ? selectedGroup : groups[0]?.name
  const activeGroup = groups.find((g) => g.name === activeName)

  const onScore = (id: string, side: 'h' | 'a', value: string) =>
    setDraft((d) => {
      const cur = d[id] ?? { h: '', a: '' }
      const next = { ...cur, [side]: value.replace(/[^0-9]/g, '').slice(0, 2) }
      if (next.h === '' && next.a === '') {
        const rest = { ...d }
        delete rest[id]
        return rest
      }
      return { ...d, [id]: next }
    })

  const onQuick = (id: string, r: Outcome) =>
    setDraft((d) => {
      const score = r === 'G' ? { h: '1', a: '0' } : r === 'P' ? { h: '0', a: '1' } : { h: '0', a: '0' }
      return { ...d, [id]: score }
    })

  return (
    <div>
      <div className="card p-3 mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-tiza leading-snug">
          Poné el marcador, o tocá <b className="text-cal">G</b> (gana local) · <b className="text-cal">E</b> (empate) ·{' '}
          <b className="text-cal">P</b> (pierde local) en los partidos por jugar. La tabla se recalcula sola. Los ya
          jugados están bloqueados.
        </p>
        {simCount > 0 && (
          <button
            onClick={() => setDraft({})}
            className="shrink-0 text-[11px] font-semibold text-mag border border-mag/40 rounded-full px-3 py-1 hover:bg-mag/10 transition"
          >
            Reiniciar ({simCount})
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-4 text-[11px] text-tiza">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-verde" /> Clasifican (1.º y 2.º)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-tercero" /> Mejores 8 terceros
        </span>
      </div>

      <div className="-mx-4 px-4 mb-4 overflow-x-auto scrollbar-thin">
        <div className="flex gap-1.5 min-w-max">
          {groups.map((g) => (
            <button
              key={g.name}
              onClick={() => setSelectedGroup(g.name)}
              className={`shrink-0 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                g.name === activeName ? 'bg-mag text-white' : 'bg-cal/[0.05] text-tiza hover:text-cal'
              }`}
            >
              Grupo {g.name}
            </button>
          ))}
        </div>
      </div>

      {activeGroup && (
        <div className="max-w-2xl mx-auto">
          <GroupCard
            group={activeGroup}
            matches={matches}
            sim={sim}
            draft={draft}
            onScore={onScore}
            onQuick={onQuick}
            onOpen={onOpen}
            onTeamClick={onTeamClick}
            thirds={thirds}
          />
        </div>
      )}
    </div>
  )
}

function GroupCard({
  group,
  matches,
  sim,
  draft,
  onScore,
  onQuick,
  onOpen,
  onTeamClick,
  thirds,
}: {
  group: Group
  matches: Match[]
  sim: Record<string, SimScore>
  draft: Draft
  onScore: (id: string, side: 'h' | 'a', value: string) => void
  onQuick: (id: string, r: Outcome) => void
  onOpen: (m: Match) => void
  onTeamClick: (team: Team, group: string, position: number, qualified: boolean) => void
  thirds: Set<string>
}) {
  const groupMatches = matches.filter((m) => m.group === group.name)
  const simMatches = applySim(groupMatches, sim)
  const table = computeStandings(group, simMatches)

  const liveTeams = new Set<string>()
  for (const m of groupMatches) {
    if ((m.status === 'live' || m.status === 'half-time') && m.home && m.away) {
      liveTeams.add(m.home.code)
      liveTeams.add(m.away.code)
    }
  }

  return (
    <section className="card group-card p-4">
      <h3 className="font-head text-2xl mb-4 pb-1.5 border-b border-cal/[0.12] flex items-center gap-2 uppercase">
        Grupo <span className="text-mag">{group.name}</span>
      </h3>

      <div className="overflow-x-auto -mx-1 mb-4">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em] text-tiza text-center">
              <th className="text-left font-medium pb-1 pl-1">Equipo</th>
              <th className="font-medium w-5">PJ</th>
              <th className="font-medium w-5">V</th>
              <th className="font-medium w-5">E</th>
              <th className="font-medium w-5">D</th>
              <th className="font-medium w-7">DG</th>
              <th className="font-medium w-10">GLS</th>
              <th className="font-medium w-24">Últ. 5</th>
              <th className="font-medium w-7">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const qualThird = i === 2 && thirds.has(row.team.code)
              const highlighted = i < 2 || qualThird
              const form = teamForm(row.team.code, simMatches)
              return (
                <tr key={row.team.code} className={`text-center ${highlighted ? 'text-cal' : 'text-tiza'}`}>
                  <td className="text-left py-1 pl-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          i < 2
                            ? 'bg-verde text-white'
                            : qualThird
                              ? 'bg-tercero text-cal'
                              : 'bg-cal/10 text-tiza'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Flag team={row.team} size="text-lg" />
                      <button
                        onClick={() => onTeamClick(row.team, group.name, i + 1, highlighted)}
                        className="truncate hover:text-mag transition text-left"
                      >
                        {row.team.name}
                      </button>
                      {liveTeams.has(row.team.code) && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rojo animate-pulse-live shrink-0" title="En vivo" />
                      )}
                    </div>
                  </td>
                  <td className="tabular-nums">{row.played}</td>
                  <td className="tabular-nums">{row.won}</td>
                  <td className="tabular-nums">{row.drawn}</td>
                  <td className="tabular-nums">{row.lost}</td>
                  <td className="tabular-nums">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                  <td className="tabular-nums text-[12px]">{row.goalsFor}:{row.goalsAgainst}</td>
                  <td>
                    <div className="flex items-center justify-center gap-[3px]">
                      {form.length === 0 ? (
                        <span className="text-tiza/40 text-xs">—</span>
                      ) : (
                        form.map((r, j) => (
                          <span
                            key={j}
                            className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold leading-none ${
                              r === 'W'
                                ? 'bg-verde text-white'
                                : r === 'D'
                                  ? 'bg-[#C9C2B2] text-cal'
                                  : 'bg-rojo text-white'
                            }`}
                          >
                            {r === 'W' ? 'G' : r === 'D' ? 'E' : 'P'}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className={`font-display tabular-nums text-base ${highlighted ? 'text-cal' : 'text-tiza'}`}>
                    {row.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-0.5">
        {groupMatches.map((m) => (
          <GroupMatchRow key={m.id} match={m} draft={draft[m.id]} onScore={onScore} onQuick={onQuick} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function ScoreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="–"
      className="w-7 h-7 text-center bg-cal/[0.06] border border-cal/[0.14] rounded text-cal text-sm tabular-nums placeholder:text-tiza/40 focus:border-mag focus:outline-none"
    />
  )
}

function QuickPick({ outcome, onPick }: { outcome: Outcome | null; onPick: (r: Outcome) => void }) {
  const opts: Outcome[] = ['G', 'E', 'P']
  return (
    <div className="flex gap-0.5">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className={`w-5 h-4 rounded text-[9px] font-bold leading-none transition ${
            outcome === o ? 'bg-mag text-white' : 'text-tiza/70 bg-cal/[0.05] hover:text-cal hover:bg-cal/[0.1]'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function GroupMatchRow({
  match,
  draft,
  onScore,
  onQuick,
  onOpen,
}: {
  match: Match
  draft?: { h: string; a: string }
  onScore: (id: string, side: 'h' | 'a', value: string) => void
  onQuick: (id: string, r: Outcome) => void
  onOpen: (m: Match) => void
}) {
  const playable = !!match.home && !!match.away
  const live = match.status === 'live' || match.status === 'half-time'
  const { formatDateTime } = useLocale()
  const kickoffDisplay = match.utcDate ? formatDateTime(match.utcDate) : match.kickoff
  const editable = playable && match.status === 'scheduled'
  const d = draft ?? { h: '', a: '' }
  const simmed = d.h !== '' && d.a !== ''
  const outcome: Outcome | null = simmed
    ? parseInt(d.h, 10) > parseInt(d.a, 10)
      ? 'G'
      : parseInt(d.h, 10) < parseInt(d.a, 10)
        ? 'P'
        : 'E'
    : null

  if (editable) {
    return (
      <div className={`flex items-center gap-2 py-1.5 px-1.5 rounded-lg text-xs ${simmed ? 'bg-mag/[0.05]' : ''}`}>
        <span className="flex-1 flex items-center gap-1.5 min-w-0 justify-end text-right">
          <span className="truncate text-cal/90">{teamName(match.home)}</span>
          <Flag team={match.home} size="text-lg" />
        </span>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-[9px] text-tiza/50 leading-none whitespace-nowrap">{kickoffDisplay}</span>
          <div className="flex items-center gap-1">
            <ScoreInput value={d.h} onChange={(v) => onScore(match.id, 'h', v)} />
            <span className="text-tiza/40 text-xs">-</span>
            <ScoreInput value={d.a} onChange={(v) => onScore(match.id, 'a', v)} />
          </div>
          <QuickPick outcome={outcome} onPick={(r) => onQuick(match.id, r)} />
        </div>
        <span className="flex-1 flex items-center gap-1.5 min-w-0">
          <Flag team={match.away} size="text-lg" />
          <span className="truncate text-cal/90">{teamName(match.away)}</span>
        </span>
        <span className="w-8 text-right text-[9px] shrink-0 tabular-nums text-mag/70">{simmed ? 'SIM' : ''}</span>
      </div>
    )
  }

  const status = live ? (match.status === 'half-time' ? 'ET' : match.minute > 0 ? `${match.minute}'` : 'VIVO') : match.status === 'finished' ? 'FIN' : ''
  return (
    <button
      onClick={() => playable && onOpen(match)}
      disabled={!playable}
      className={`w-full flex items-center gap-2 py-1.5 px-1.5 rounded-lg text-xs transition ${
        playable ? 'hover:bg-cal/[0.05] cursor-pointer' : 'opacity-60 cursor-default'
      } ${live ? 'bg-rojo/[0.06]' : ''}`}
    >
      <span className="flex-1 flex items-center gap-1.5 min-w-0 justify-end text-right">
        <span className="truncate text-cal/90">{teamName(match.home)}</span>
        <Flag team={match.home} size="text-lg" />
      </span>
      <span className="flex items-center gap-1 shrink-0 font-display tabular-nums text-sm leading-none">
        <span className={live ? 'text-rojo' : 'text-cal'}>{match.home ? match.homeScore : '–'}</span>
        <span className="text-tiza/40">-</span>
        <span className={live ? 'text-rojo' : 'text-cal'}>{match.away ? match.awayScore : '–'}</span>
      </span>
      <span className="flex-1 flex items-center gap-1.5 min-w-0">
        <Flag team={match.away} size="text-lg" />
        <span className="truncate text-cal/90">{teamName(match.away)}</span>
      </span>
      <span className={`w-8 text-right text-[9px] shrink-0 tabular-nums ${live ? 'text-rojo font-bold' : 'text-tiza/50'}`}>
        {status}
      </span>
    </button>
  )
}
