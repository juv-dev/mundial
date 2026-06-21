import { useMemo, useState } from 'react'
import type { Group, Match, Team } from '../data/types'
import { computeStandings, bestThirds, teamForm } from '../data/standings'
import { Flag } from './shared'
import { MatchCard } from './MatchCard'

export function GroupStage({
  groups,
  matches,
  onTeamClick,
}: {
  groups: Group[]
  matches: Match[]
  onTeamClick: (team: Team, group: string, position: number, qualified: boolean) => void
}) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const thirds = useMemo(() => bestThirds(groups, matches), [groups, matches])
  const activeName = selectedGroup && groups.some((g) => g.name === selectedGroup) ? selectedGroup : groups[0]?.name
  const activeGroup = groups.find((g) => g.name === activeName)

  return (
    <div>
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
  onTeamClick,
  thirds,
}: {
  group: Group
  matches: Match[]
  onTeamClick: (team: Team, group: string, position: number, qualified: boolean) => void
  thirds: Set<string>
}) {
  const groupMatches = matches.filter((m) => m.stage === 'group' && m.group === group.name)
  const sortedMatches = [...groupMatches].sort((a, b) => {
    const md = (a.matchday ?? 0) - (b.matchday ?? 0)
    if (md !== 0) return md
    const da = a.utcDate ? Date.parse(a.utcDate) : Infinity
    const db = b.utcDate ? Date.parse(b.utcDate) : Infinity
    return da - db
  })
  const table = computeStandings(group, groupMatches)

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
              const form = teamForm(row.team.code, groupMatches)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {sortedMatches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  )
}
