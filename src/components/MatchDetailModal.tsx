import { useEffect, useState } from 'react'
import type { Match } from '../data/types'
import { Flag, statusText, teamName } from './shared'
import { useLocale } from '../i18n/locale'
import type { MatchEvent, ScrapedPlayer, ScrapedTeamLineup, StatSection } from '../hooks/useLineup'
import { useMatchDetail } from '../hooks/useMatchDetail'

type Tab = 'resumen' | 'estadisticas' | 'alineacion'

export function MatchDetailModal({ match, onClose }: { match: Match; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const live = match.status === 'live' || match.status === 'half-time'
  const { formatDateTime } = useLocale()
  const kickoffDisplay = match.utcDate ? formatDateTime(match.utcDate) : match.kickoff
  const detail = useMatchDetail(match)
  const [tab, setTab] = useState<Tab>('resumen')

  const homeScore = detail.liveScore ? detail.liveScore[0] : match.homeScore
  const awayScore = detail.liveScore ? detail.liveScore[1] : match.awayScore
  const liveLabel = detail.liveMinute ? `${detail.liveMinute}'` : statusText(match)

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'resumen', label: 'Resumen', show: true },
    { id: 'estadisticas', label: 'Estadísticas', show: !!detail.stats?.length },
    { id: 'alineacion', label: 'Alineación', show: !!detail.lineup },
  ]
  const activeTab = tabs.find((t) => t.id === tab && t.show) ? tab : 'resumen'

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(15,13,9,0.55)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin animate-slide-up rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-cal text-white p-6 pb-5 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(120% 90% at 50% -20%, rgba(27,67,224,0.28), transparent 60%)' }}
          />
          <div className="relative flex justify-between items-start mb-3">
            <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">
              {match.label}
            </span>
            <button
              onClick={onClose}
              className="w-[30px] h-[30px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-base leading-none transition"
            >
              ✕
            </button>
          </div>
          <div className="relative flex items-center justify-center gap-4 sm:gap-6">
            <Side flag={match.home} name={teamName(match.home)} />
            <div className="text-center shrink-0">
              <div className="font-display text-5xl sm:text-[52px] tabular-nums leading-[0.8] flex items-center justify-center gap-3">
                <span>{homeScore}</span>
                <span className="text-white/40 text-2xl">-</span>
                <span>{awayScore}</span>
              </div>
              <div
                className={`mt-2 text-[11px] font-extrabold uppercase tracking-[0.06em] ${live ? 'text-[#ff6f59]' : 'text-white/55'}`}
              >
                {live && <span className="inline-block h-1.5 w-1.5 rounded-full bg-rojo animate-pulse-live mr-1.5 align-middle" />}
                {live ? liveLabel : statusText(match)}
              </div>
              <div className="mt-1 text-[11px] text-white/40">{kickoffDisplay}</div>
            </div>
            <Side flag={match.away} name={teamName(match.away)} right />
          </div>
        </div>

        <nav className="flex gap-1 px-5 border-b border-cal/[0.08] sticky top-0 bg-white z-10">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2.5 text-sm font-medium transition border-b-2 ${
                  activeTab === t.id ? 'border-mag text-mag' : 'border-transparent text-tiza hover:text-cal'
                }`}
              >
                {t.label}
              </button>
            ))}
        </nav>

        <div className="p-5">
          {activeTab === 'resumen' && (
            <Resumen match={match} kickoff={kickoffDisplay} events={detail.events} loading={detail.loading} />
          )}
          {activeTab === 'estadisticas' && detail.stats && <Estadisticas sections={detail.stats} />}
          {activeTab === 'alineacion' && detail.lineup && <Alineacion match={match} lineups={detail.lineup} />}
        </div>
      </div>
    </div>
  )
}

function Resumen({
  match,
  kickoff,
  events,
  loading,
}: {
  match: Match
  kickoff: string
  events: MatchEvent[] | null
  loading: boolean
}) {
  if (loading && !(events && events.length)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <span className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rojo animate-pulse-live" />
          <span className="w-2 h-2 rounded-full bg-rojo animate-pulse-live" style={{ animationDelay: '0.2s' }} />
          <span className="w-2 h-2 rounded-full bg-rojo animate-pulse-live" style={{ animationDelay: '0.4s' }} />
        </span>
        <p className="text-sm font-semibold text-cal">Cargando datos del partido en vivo…</p>
        <p className="text-[11px] text-tiza">Eventos, estadísticas y alineaciones en instantes</p>
      </div>
    )
  }
  if (events && events.length) {
    return (
      <ul className="space-y-3">
        {events.map((e, i) => (
          <EventRow key={i} ev={e} />
        ))}
      </ul>
    )
  }
  return (
    <dl className="space-y-2.5 text-sm">
      {match.label && <Row label="Instancia" value={match.label} />}
      <Row label="Fecha" value={kickoff} />
      {match.halfTime && <Row label="1er tiempo" value={`${match.halfTime[0]} - ${match.halfTime[1]}`} />}
      <Row label="Estado" value={statusText(match)} />
    </dl>
  )
}

const EVENT_ICON: Record<MatchEvent['type'], string> = { goal: '⚽', sub: '🔁', yellow: '🟨', red: '🟥' }

function EventRow({ ev }: { ev: MatchEvent }) {
  const right = ev.team === 2
  return (
    <li className={`flex items-start gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-[12px] tabular-nums font-semibold text-tiza w-8 shrink-0">{ev.minute}</span>
      <span className="shrink-0 text-sm leading-tight">{EVENT_ICON[ev.type]}</span>
      <span className="flex-1 min-w-0 text-sm text-cal">
        {ev.type === 'goal' && (
          <>
            <span className="font-semibold">{ev.player}</span>
            {ev.score && <span className="mx-1.5 font-display tabular-nums text-mag">{ev.score}</span>}
            {ev.assist && <span className="block text-[11px] text-tiza">asist. {ev.assist}</span>}
          </>
        )}
        {ev.type === 'sub' && (
          <>
            <span className="text-verde">▲ {ev.in}</span>
            <span className="block text-[11px] text-tiza/80">▼ {ev.out}</span>
          </>
        )}
        {(ev.type === 'yellow' || ev.type === 'red') && <span className="font-medium">{ev.player}</span>}
      </span>
    </li>
  )
}

function num(s: string): number {
  const m = s.match(/[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

function Estadisticas({ sections }: { sections: StatSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="text-[11px] uppercase tracking-[0.12em] text-tiza font-bold mb-3 text-center">{s.title}</p>
          <div className="space-y-3">
            {s.rows.map((r) => {
              const h = num(r.home)
              const a = num(r.away)
              const total = h + a || 1
              const hp = (h / total) * 100
              return (
                <div key={r.name}>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-semibold text-cal tabular-nums w-16">{r.home}</span>
                    <span className="text-tiza text-[12px] text-center flex-1 px-2">{r.name}</span>
                    <span className="font-semibold text-cal tabular-nums w-16 text-right">{r.away}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-cal/[0.07]">
                    <span className="bg-cal" style={{ width: `${hp}%` }} />
                    <span className="bg-mag" style={{ width: `${100 - hp}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function formationLabel(f: string): string {
  const parts = f.split('-')
  return parts.length > 1 && parts[0] === '1' ? parts.slice(1).join('-') : f
}

function buildLines(players: ScrapedPlayer[], formation: string): ScrapedPlayer[][] {
  const sorted = [...players].sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99))
  let sizes = (formation || '').split('-').map(Number).filter((n) => n > 0)
  if (!sizes.length) return [sorted]
  const sum = sizes.reduce((a, b) => a + b, 0)
  if (sum < sorted.length) sizes = [sorted.length - sum, ...sizes]
  const lines: ScrapedPlayer[][] = []
  let idx = 0
  for (const s of sizes) {
    lines.push(sorted.slice(idx, idx + s))
    idx += s
  }
  if (idx < sorted.length && lines.length) lines[lines.length - 1].push(...sorted.slice(idx))
  return lines
}

function Alineacion({
  match,
  lineups,
}: {
  match: Match
  lineups: { home: ScrapedTeamLineup; away: ScrapedTeamLineup }
}) {
  const home = lineups.home
  const away = lineups.away
  const homeLines = buildLines(home.starters, home.formation)
  const awayLines = buildLines(away.starters, away.formation).reverse()

  return (
    <div className="space-y-6">
      <div className="rounded-xl overflow-hidden border border-cal/[0.08]">
        <div className="flex items-center justify-between px-3 py-2 bg-cal/[0.04] text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-cal">
            <Flag team={match.home} size="text-sm" /> {formationLabel(home.formation)}
          </span>
          <span className="text-tiza uppercase tracking-wider">Sistema de juego</span>
          <span className="flex items-center gap-1.5 text-cal">
            {formationLabel(away.formation)} <Flag team={match.away} size="text-sm" />
          </span>
        </div>
        <div
          className="relative flex flex-col py-3"
          style={{
            background:
              'linear-gradient(90deg,#1f7a44,#23904f)',
          }}
        >
          <span className="absolute left-0 right-0 top-1/2 h-px bg-white/25" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border border-white/25" />
          {homeLines.map((line, i) => (
            <PitchLine key={`h${i}`} players={line} />
          ))}
          {awayLines.map((line, i) => (
            <PitchLine key={`a${i}`} players={line} />
          ))}
        </div>
      </div>

      <MirrorList title="Alineaciones iniciales" home={home.starters} away={away.starters} />
      {(home.subs.length > 0 || away.subs.length > 0) && (
        <MirrorList title="Suplentes" home={home.subs} away={away.subs} />
      )}
    </div>
  )
}

function PitchLine({ players }: { players: ScrapedPlayer[] }) {
  return (
    <div className="flex-1 flex items-center justify-around px-2 py-1">
      {players.map((p, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 w-14">
          {p.photo ? (
            <img
              src={p.photo}
              alt=""
              loading="lazy"
              className="w-8 h-8 rounded-full object-cover bg-white border border-white/60"
              onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-white border border-white/60 flex items-center justify-center text-[10px] font-bold text-cal">
              {p.number ?? ''}
            </span>
          )}
          <span className="text-[9px] text-[#0c2a18] bg-white/85 px-1 rounded text-center leading-tight truncate max-w-full">
            {p.number ? `${p.number} ` : ''}
            {p.name}
          </span>
        </div>
      ))}
    </div>
  )
}

function MirrorList({ title, home, away }: { title: string; home: ScrapedPlayer[]; away: ScrapedPlayer[] }) {
  const rows = Math.max(home.length, away.length)
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-mag font-bold mb-2 text-center">{title}</p>
      <ul className="divide-y divide-cal/[0.06]">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-2 py-1.5">
            <PlayerHalf player={home[i]} />
            <PlayerHalf player={away[i]} right />
          </li>
        ))}
      </ul>
    </div>
  )
}

function PlayerHalf({ player, right }: { player?: ScrapedPlayer; right?: boolean }) {
  if (!player) return <span className="flex-1" />
  return (
    <span className={`flex-1 min-w-0 flex items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="w-5 text-center text-[12px] tabular-nums font-bold text-tiza shrink-0">
        {player.number ?? '–'}
      </span>
      <span className="flex-1 min-w-0 text-[13px] text-cal truncate">
        {player.name}
        {player.gk && <span className="mx-1 text-[9px] font-bold text-mag">GK</span>}
      </span>
      {player.clubLogo && (
        <img
          src={player.clubLogo}
          alt=""
          loading="lazy"
          className="w-4 h-4 object-contain shrink-0 opacity-90"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </span>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-tiza shrink-0">{label}</dt>
      <dd className="text-cal font-medium text-right truncate">{value}</dd>
    </div>
  )
}

function Side({ flag, name, right }: { flag: Match['home']; name: string; right?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 flex flex-col items-center gap-1 ${right ? 'order-1' : ''}`}>
      <Flag team={flag} size="text-4xl" />
      <span className="text-sm font-bold text-center truncate w-full text-white">{name}</span>
    </div>
  )
}
