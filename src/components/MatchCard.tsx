import type { Match } from '../data/types'
import { Flag, LiveBadge, teamName } from './shared'
import { useLocale } from '../i18n/locale'

const isLive = (m: Match) => m.status === 'live' || m.status === 'half-time'

export function MatchCard({ match, onOpen }: { match: Match; onOpen: (m: Match) => void }) {
  const live = isLive(match)
  const playable = !!match.home && !!match.away
  const finished = match.status === 'finished'
  const { formatDateTime } = useLocale()
  const kickoffDisplay = match.utcDate ? formatDateTime(match.utcDate) : match.kickoff

  return (
    <button
      onClick={() => playable && onOpen(match)}
      disabled={!playable}
      className={`card w-full text-left p-4 transition group ${
        playable
          ? 'hover:border-mag/30 hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer'
          : 'opacity-60 cursor-default'
      } ${live ? 'shadow-live-card border-rojo/40' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.12em] text-tiza">{match.label}</span>
        {live ? (
          <LiveBadge minute={match.minute} />
        ) : finished ? (
          <span className="text-[11px] font-semibold text-tiza">FIN{match.penalties ? ' (pen)' : ''}</span>
        ) : (
          <span className="text-[11px] text-tiza">{kickoffDisplay}</span>
        )}
      </div>

      <Row
        name={match.home ? teamName(match.home) : match.homeSlot ?? 'Por definir'}
        flag={match.home}
        score={match.home ? match.homeScore : null}
        live={live}
        pending={!match.home}
      />
      <div className="my-1.5 h-px bg-cal/[0.08]" />
      <Row
        name={match.away ? teamName(match.away) : match.awaySlot ?? 'Por definir'}
        flag={match.away}
        score={match.away ? match.awayScore : null}
        live={live}
        pending={!match.away}
      />

      {match.penalties && (
        <div className="mt-2 text-[11px] text-tiza text-right">
          Penales {match.penalties[0]}–{match.penalties[1]}
        </div>
      )}

      {playable && (
        <div className="mt-3 text-[11px] font-medium text-mag/0 group-hover:text-mag transition-colors duration-200 text-right">
          Ver detalle →
        </div>
      )}
    </button>
  )
}

function Row({
  name,
  flag,
  score,
  live,
  pending,
}: {
  name: string
  flag: Match['home']
  score: number | null
  live: boolean
  pending?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <Flag team={flag} />
        <span className={`truncate font-semibold ${pending ? 'text-tiza/70 italic text-sm' : 'text-cal'}`}>{name}</span>
      </div>
      <span className={`font-display text-3xl tabular-nums leading-none ${live ? 'text-rojo' : 'text-cal'}`}>
        {score ?? '–'}
      </span>
    </div>
  )
}
