import { useEffect, useState } from 'react'

interface Scorer {
  player: { id: number; name: string }
  team: { id: number; name: string; crest?: string }
  goals: number
  assists: number | null
}

const CACHE_KEY = 'wc-scorers-v1'
const TTL = 600_000

export function Scorers() {
  const [scorers, setScorers] = useState<Scorer[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = readCache()
    if (cached) {
      setScorers(cached)
      return
    }
    fetch('/fd/competitions/WC/scorers?limit=20')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((d) => {
        if (cancelled) return
        const list = (d.scorers ?? []) as Scorer[]
        setScorers(list)
        writeCache(list)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="text-center text-sm text-tiza py-12">No se pudieron cargar los goleadores.</p>
  if (!scorers) return <p className="text-center text-sm text-tiza py-12">Cargando goleadores…</p>
  if (scorers.length === 0) return <p className="text-center text-sm text-tiza py-12">Todavía no hay goleadores.</p>

  return (
    <div className="card p-4 max-w-2xl mx-auto">
      <h3 className="font-head text-2xl mb-4 pb-1.5 border-b border-cal/[0.12] uppercase text-cal">
        Bota de <span className="text-mag">Oro</span>
      </h3>
      <ul className="divide-y divide-cal/[0.06]">
        {scorers.map((s, i) => (
          <li key={s.player.id} className="flex items-center gap-3 py-2.5">
            <span className={`w-6 text-center font-display text-lg tabular-nums shrink-0 ${i < 3 ? 'text-mag' : 'text-tiza'}`}>
              {i + 1}
            </span>
            {s.team.crest ? (
              <img src={s.team.crest} alt="" className="w-6 h-6 object-contain shrink-0" />
            ) : (
              <span className="w-6 h-6 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-cal truncate">{s.player.name}</div>
              <div className="text-[11px] text-tiza truncate">
                {s.team.name}
                {s.assists ? ` · ${s.assists} asist.` : ''}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-2xl text-cal tabular-nums leading-none">{s.goals}</div>
              <div className="text-[10px] text-tiza uppercase tracking-wide">goles</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function readCache(): Scorer[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ts: number; data: Scorer[] }
    if (Date.now() - parsed.ts > TTL) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeCache(data: Scorer[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    return
  }
}
