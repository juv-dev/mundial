import { useState } from 'react'
import type { Match, Stage } from '../data/types'
import { STAGE_LABEL } from '../data/worldcup2026'
import { MatchCard } from './MatchCard'

const COLUMNS: Stage[] = ['r32', 'r16', 'qf', 'sf', 'final']

export function Bracket({ matches, onOpen }: { matches: Match[]; onOpen: (m: Match) => void }) {
  const [stage, setStage] = useState<Stage>('r32')
  const thirdPlace = matches.find((m) => m.id === 'TP-1')
  const colFor = (s: Stage) => matches.filter((m) => m.stage === s && m.id !== 'TP-1')

  return (
    <div className="space-y-6">
      <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-thin">
        <div className="flex gap-2 min-w-max pb-1">
          {COLUMNS.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition ${
                stage === s
                  ? 'border-mag/60 text-mag bg-mag/10'
                  : 'border-cal/[0.1] text-tiza hover:text-cal'
              }`}
            >
              {STAGE_LABEL[s]}
              <span className="ml-1.5 text-[10px] opacity-60">({colFor(s).length})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {colFor(stage).map((m) => (
          <MatchCard key={m.id} match={m} onOpen={onOpen} />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto scrollbar-thin pb-2">
        <div className="flex gap-5 min-w-max">
          {COLUMNS.map((s) => {
            const col = colFor(s)
            return (
              <div key={s} className="flex flex-col gap-3" style={{ width: 248 }}>
                <h3 className="font-head text-lg text-cal uppercase pb-2 border-b-2 border-cal/[0.14] flex items-center justify-between">
                  {STAGE_LABEL[s]}
                  <span className="text-[11px] text-tiza font-body font-semibold normal-case">{col.length}</span>
                </h3>
                <div className="flex flex-col gap-3 justify-around h-full">
                  {col.map((m) => (
                    <MatchCard key={m.id} match={m} onOpen={onOpen} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {thirdPlace && (
        <div className="md:max-w-sm">
          <h3 className="font-head text-lg text-tiza uppercase pb-2 border-b-2 border-cal/[0.1] mb-2">Tercer Puesto</h3>
          <MatchCard match={thirdPlace} onOpen={onOpen} />
        </div>
      )}
    </div>
  )
}
