import type { Match, Team } from '../data/types'
import { flagUrl, flagUrlByName } from '../data/flags'

const SIZE_W: Record<string, number> = {
  'text-lg': 22,
  'text-2xl': 28,
  'text-5xl': 52,
}

export function Flag({ team, size = 'text-2xl' }: { team: Team | null; size?: string }) {
  const src = team
    ? flagUrlByName(team.name) ?? flagUrl(team.code) ?? team.logo ?? null
    : null
  if (src) {
    const w = SIZE_W[size] ?? 28
    const h = Math.round(w * 0.72)
    return (
      <img
        src={src}
        alt={team?.name ?? ''}
        width={w}
        height={h}
        className="inline-block object-cover align-middle rounded-[2px] ring-1 ring-cal/10 shadow-sm shrink-0"
        style={{ width: w, height: h }}
        loading="lazy"
      />
    )
  }
  return <span className={size}>{team?.flag ?? '🏳️'}</span>
}

export function LiveBadge({ minute }: { minute: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-rojo font-bold text-xs">
      <span className="h-2 w-2 rounded-full bg-rojo animate-pulse-live" />
      {minute > 0 ? `${minute}'` : 'VIVO'}
    </span>
  )
}

export function statusText(m: Match): string {
  switch (m.status) {
    case 'finished':
      return m.penalties ? `Final · pen ${m.penalties[0]}-${m.penalties[1]}` : 'Finalizado'
    case 'half-time':
      return 'Entretiempo'
    case 'live':
      return m.minute > 0 ? `${m.minute}'` : 'En vivo'
    default:
      return m.kickoff
  }
}

export function teamName(team: Team | null): string {
  return team?.name ?? 'Por definir'
}
