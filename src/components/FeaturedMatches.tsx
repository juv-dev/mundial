import { useState, useEffect } from 'react'
import type { Match } from '../data/types'
import { Flag, teamName, statusText } from './shared'
import { MatchCard } from './MatchCard'
import { useLocale } from '../i18n/locale'

type CountdownResult = {
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
}

function useCountdown(targetIso: string | undefined): CountdownResult {
  const [now, setNow] = useState(() => Date.now())

  const target = targetIso ? new Date(targetIso).getTime() : -Infinity
  const isPast = target <= now

  useEffect(() => {
    if (isPast) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isPast])

  if (isPast) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }

  const diff = target - now
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    isPast: false,
  }
}

function HeroCard({ match, onOpen }: { match: Match; onOpen: (m: Match) => void }) {
  const { country, formatDateTime } = useLocale()
  const countdown = useCountdown(match.utcDate)
  const live = match.status === 'live' || match.status === 'half-time'
  const finished = match.status === 'finished'
  const played = live || finished

  const label = match.label ?? (match.group ? `Grupo ${match.group}` : match.stage.toUpperCase())
  const pad = (n: number) => String(n).padStart(2, '0')

  const formatTime = (iso: string): string => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat(country.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: country.timeZone,
    }).format(d)
  }

  return (
    <button
      onClick={() => onOpen(match)}
      className="group relative overflow-hidden text-left bg-cal text-white rounded-2xl p-6 flex flex-col justify-between min-h-[236px] shadow-hero transition-shadow duration-200 hover:shadow-[0_30px_56px_-22px_rgba(22,20,15,0.78)]"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(130% 90% at 50% -15%, rgba(27,67,224,0.3), transparent 62%)' }}
      />

      <div className="relative flex items-center justify-between">
        <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">{label}</span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 bg-rojo px-2.5 py-1 rounded-full font-body text-[11px] font-extrabold tracking-[0.06em]">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-live" />
            {match.minute > 0 ? `${match.minute}'` : 'EN VIVO'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full font-body text-[11px] font-extrabold tracking-[0.06em] text-white/90">
            {finished ? 'FINAL' : 'POR JUGAR'}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-between gap-3.5 my-4">
        <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
          <Flag team={match.home} size="text-5xl" />
          <span className="font-body font-bold text-sm text-center truncate w-full">{teamName(match.home)}</span>
        </div>
        <div className="flex items-center gap-3.5 shrink-0">
          {played ? (
            <>
              <span className="font-display text-[46px] sm:text-6xl leading-[0.8] tabular-nums">{match.homeScore}</span>
              <span className="text-white/40 text-3xl leading-none">·</span>
              <span className="font-display text-[46px] sm:text-6xl leading-[0.8] tabular-nums">{match.awayScore}</span>
            </>
          ) : (
            <span className="font-display text-3xl text-mag-soft tabular-nums">
              {match.utcDate ? formatTime(match.utcDate) : match.kickoff}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
          <Flag team={match.away} size="text-5xl" />
          <span className="font-body font-bold text-sm text-center truncate w-full">{teamName(match.away)}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 pt-3">
        <span className="inline-flex items-center gap-2 font-body font-medium text-[11.5px] text-white/75">
          <span className="w-[7px] h-[7px] rounded-full bg-verde" />
          {live
            ? statusText(match)
            : match.utcDate
              ? countdown.isPast
                ? formatDateTime(match.utcDate)
                : countdown.days > 0
                  ? `faltan ${countdown.days}d ${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
                  : `faltan ${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
              : match.kickoff}
        </span>
        <span className="inline-flex items-center gap-1.5 font-body font-bold text-[11.5px] text-white bg-white/10 group-hover:bg-white/20 ring-1 ring-white/10 group-hover:ring-white/25 px-3 py-1.5 rounded-full transition-all duration-200">
          Ver detalle
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </button>
  )
}

export function FeaturedMatches({ matches, onOpen }: { matches: Match[]; onOpen: (m: Match) => void }) {
  const nowMs = Date.now()

  const byDate = (a: Match, b: Match) => {
    const da = a.utcDate ? Date.parse(a.utcDate) : Infinity
    const db = b.utcDate ? Date.parse(b.utcDate) : Infinity
    return da - db
  }

  const live = matches
    .filter((m) => (m.status === 'live' || m.status === 'half-time') && m.home && m.away)
    .sort(byDate)

  const upcoming = matches
    .filter((m) => m.status === 'scheduled' && m.home && m.away && (!m.utcDate || Date.parse(m.utcDate) > nowMs))
    .sort(byDate)

  const featured = [...live, ...upcoming].slice(0, 3)
  if (!featured.length) return null

  const [hero, ...sides] = featured

  return (
    <div className="grid gap-4 mb-8 lg:grid-cols-[1.55fr_1fr]">
      <HeroCard match={hero} onOpen={onOpen} />
      {sides.length > 0 && (
        <div className="flex flex-col gap-4">
          {sides.map((m) => (
            <MatchCard key={m.id} match={m} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
