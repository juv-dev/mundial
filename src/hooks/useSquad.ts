import { useEffect, useState } from 'react'
import { sameTeam } from '../data/teamMatch'

export interface SquadPlayer {
  name: string
  number: number | null
  photo: string | null
  clubLogo: string | null
}

export interface SquadGroup {
  type: string
  players: SquadPlayer[]
}

export interface TeamSquad {
  name: string
  code: string
  groups: SquadGroup[]
}

let cache: Promise<TeamSquad[]> | null = null

function load(): Promise<TeamSquad[]> {
  if (!cache) {
    cache = fetch('/squads.json')
      .then((r) => (r.ok ? r.json() : { teams: [] }))
      .then((d) => (d.teams ?? []) as TeamSquad[])
      .catch(() => [])
  }
  return cache
}

export function useSquad(name?: string): { squad: TeamSquad | null; loading: boolean } {
  const [squad, setSquad] = useState<TeamSquad | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!name) {
      setSquad(null)
      setLoading(false)
      return
    }
    setLoading(true)
    load().then((list) => {
      if (cancelled) return
      setSquad(list.find((t) => sameTeam(t.name, name)) ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [name])

  return { squad, loading }
}
