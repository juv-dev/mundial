import { useMemo, useState } from 'react'
import type { Match, Stage, Team } from '../data/types'
import { useLocale } from '../i18n/locale'
import { Flag } from './shared'
import { MatchCard } from './MatchCard'

function feederIds(m: Match): string[] {
  return [m.homeSlot, m.awaySlot]
    .map((slot) => {
      const n = slot?.match(/P(\d+)/)
      return n ? `KO-${n[1]}` : null
    })
    .filter((id): id is string => id !== null)
}

function bracketOrder(matches: Match[]): Map<string, number> {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const order = new Map<string, number>()
  let i = 0
  const visit = (id: string) => {
    const m = byId.get(id)
    if (!m) return
    const feeders = feederIds(m)
    if (feeders.length < 2) {
      order.set(id, i++)
      return
    }
    visit(feeders[0])
    order.set(id, i++)
    visit(feeders[1])
  }
  visit('KO-104')
  return order
}

function shortSlot(slot?: string): string {
  if (!slot) return 'Por definir'
  const placed = slot.match(/^(\d)°\s*([A-L])$/)
  if (placed) return `${placed[1]}°${placed[2]}`
  const third = slot.match(/^3°\s*\(([^)]+)\)$/)
  if (third) return `3° ${third[1].replace(/\//g, '')}`
  const gan = slot.match(/Gan\. P(\d+)/)
  if (gan) return `Ganador P${gan[1]}`
  const per = slot.match(/Per\. P(\d+)/)
  if (per) return `Perdedor P${per[1]}`
  return slot
}

function Node({
  match,
  onOpen,
  highlight,
}: {
  match: Match
  onOpen: (m: Match) => void
  highlight?: boolean
}) {
  const { formatDateTime } = useLocale()
  const finished = match.status === 'finished'

  const row = (team: Team | null, slot: string | undefined, score: number) => (
    <div className="flex items-center gap-1.5 min-w-0">
      {team ? <Flag team={team} size="text-lg" /> : <span className="w-[22px] shrink-0" />}
      <span className={`flex-1 truncate text-[11px] ${team ? 'font-semibold text-cal' : 'text-tiza/70 italic'}`}>
        {team ? team.name : shortSlot(slot)}
      </span>
      <span className="w-3 text-right text-[11px] font-display tabular-nums text-cal">
        {finished ? score : ''}
      </span>
    </div>
  )

  return (
    <button
      onClick={() => onOpen(match)}
      className={`w-[164px] rounded-lg border px-2 py-1.5 text-left transition ${
        highlight
          ? 'border-mag/50 bg-mag/[0.06] hover:bg-mag/10'
          : 'border-cal/15 bg-cal/[0.03] hover:border-mag/40 hover:bg-cal/[0.06]'
      }`}
    >
      <div className="mb-1 truncate text-[8.5px] uppercase tracking-wide text-tiza/60 capitalize">
        {formatDateTime(match.utcDate ?? match.kickoff)}
      </div>
      {row(match.home, match.homeSlot, match.homeScore)}
      <div className="my-0.5 h-px bg-cal/10" />
      {row(match.away, match.awaySlot, match.awayScore)}
      {match.homePens != null && match.awayPens != null && (
        <div className="mt-0.5 text-right text-[9px] text-tiza">pen {match.homePens}–{match.awayPens}</div>
      )}
    </button>
  )
}

function Column({ matches, onOpen }: { matches: Match[]; onOpen: (m: Match) => void }) {
  return (
    <div className="flex shrink-0 flex-col justify-around gap-3">
      {matches.map((m) => (
        <Node key={m.id} match={m} onOpen={onOpen} />
      ))}
    </div>
  )
}

export function Bracket({ matches }: { matches: Match[] }) {
  const [open, setOpen] = useState<Match | null>(null)
  const order = useMemo(() => bracketOrder(matches), [matches])

  const sorted = (s: Stage) =>
    matches
      .filter((m) => m.stage === s && m.id !== 'TP-1')
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  const half = (arr: Match[]): [Match[], Match[]] => {
    const mid = Math.ceil(arr.length / 2)
    return [arr.slice(0, mid), arr.slice(mid)]
  }

  const [r32L, r32R] = half(sorted('r32'))
  const [r16L, r16R] = half(sorted('r16'))
  const [qfL, qfR] = half(sorted('qf'))
  const [sfL, sfR] = half(sorted('sf'))
  const final = matches.find((m) => m.stage === 'final')
  const third = matches.find((m) => m.id === 'TP-1')

  return (
    <div>
      <h2 className="mb-1 text-center font-head text-2xl uppercase text-cal">
        Camino al <span className="text-mag">título</span>
      </h2>
      <p className="mb-4 text-center text-[11px] text-tiza">Toca un partido para cargar el resultado o tu pronóstico.</p>

      <div className="overflow-x-auto scrollbar-thin pb-3">
        <div className="mx-auto flex w-fit items-stretch gap-3">
          <Column matches={r32L} onOpen={setOpen} />
          <Column matches={r16L} onOpen={setOpen} />
          <Column matches={qfL} onOpen={setOpen} />
          <Column matches={sfL} onOpen={setOpen} />

          <div className="flex shrink-0 flex-col items-center justify-center gap-3 px-3">
            <span className="text-center text-[10px] uppercase tracking-[0.15em] text-tiza">Campeón del Mundo</span>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cal font-head text-2xl text-crema">26</div>
            {final && (
              <div className="w-[164px]">
                <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-mag">Final</div>
                <Node match={final} onOpen={setOpen} highlight />
              </div>
            )}
          </div>

          <Column matches={sfR} onOpen={setOpen} />
          <Column matches={qfR} onOpen={setOpen} />
          <Column matches={r16R} onOpen={setOpen} />
          <Column matches={r32R} onOpen={setOpen} />
        </div>
      </div>

      {third && (
        <div className="mx-auto mt-4 w-fit text-center">
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-tiza">Tercer puesto</div>
          <Node match={third} onOpen={setOpen} />
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-cal/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <MatchCard match={open} />
          </div>
        </div>
      )}
    </div>
  )
}
