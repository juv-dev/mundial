import type { Match } from '../data/types'
import { Flag } from './shared'

export function LiveTicker({ matches, onOpen }: { matches: Match[]; onOpen: (m: Match) => void }) {
  const live = matches.filter((m) => m.status === 'live' || m.status === 'half-time')
  if (live.length === 0) return null

  const loop = [...live, ...live]

  return (
    <div className="bg-cal overflow-hidden border-b border-cal/20">
      <div className="max-w-7xl mx-auto flex items-stretch">
        <div className="shrink-0 flex items-center gap-2 px-4 bg-rojo text-white">
          <span className="w-[7px] h-[7px] rounded-full bg-white animate-pulse-live" />
          <span className="font-body font-extrabold text-[11px] tracking-[0.1em]">EN VIVO</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="inline-flex whitespace-nowrap animate-ticker">
            {loop.map((m, i) => (
              <button
                key={`${m.id}-${i}`}
                onClick={() => onOpen(m)}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 border-r border-white/[0.08] hover:bg-white/5 transition-colors"
              >
                <Flag team={m.home} size="text-lg" />
                <span className="font-body font-bold text-xs text-crema">{m.home?.code ?? '—'}</span>
                <span className="font-display text-[15px] text-white tabular-nums">{m.homeScore}</span>
                <span className="text-tiza text-[11px]">–</span>
                <span className="font-display text-[15px] text-white tabular-nums">{m.awayScore}</span>
                <span className="font-body font-bold text-xs text-crema">{m.away?.code ?? '—'}</span>
                <Flag team={m.away} size="text-lg" />
                <span className="font-body font-bold text-[10px] tracking-wide text-[#ff7a66] ml-1">
                  {m.minute > 0 ? `${m.minute}'` : 'VIVO'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
