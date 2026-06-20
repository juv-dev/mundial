import { useEffect, useState } from 'react'
import type { Match } from '../data/types'
import { sameTeam } from '../data/teamMatch'

export interface ScrapedPlayer {
  name: string
  number: number | null
  club: string | null
  gk: boolean
  photo: string | null
  pos: number | null
  clubLogo: string | null
}

export interface ScrapedTeamLineup {
  formation: string
  starters: ScrapedPlayer[]
  subs: ScrapedPlayer[]
}

export interface StatRow {
  name: string
  home: string
  away: string
}

export interface StatSection {
  title: string
  rows: StatRow[]
}

export interface MatchEvent {
  type: 'goal' | 'sub' | 'yellow' | 'red'
  minute: string
  team: number
  player?: string | null
  assist?: string | null
  score?: string | null
  out?: string | null
  in?: string | null
}

export interface ScrapedLineup {
  date: string
  home: string
  away: string
  lineups: { home: ScrapedTeamLineup; away: ScrapedTeamLineup }
  stats: StatSection[] | null
  events: MatchEvent[] | null
}

let cache: Promise<ScrapedLineup[]> | null = null

function load(): Promise<ScrapedLineup[]> {
  if (!cache) {
    cache = fetch('/lineups.json')
      .then((r) => (r.ok ? r.json() : { matches: [] }))
      .then((d) => (d.matches ?? []) as ScrapedLineup[])
      .catch(() => [])
  }
  return cache
}

export function useLineup(match: Match): ScrapedLineup | null {
  const [data, setData] = useState<ScrapedLineup | null>(null)

  useEffect(() => {
    let cancelled = false
    const date = (match.utcDate ?? '').slice(0, 10)
    if (!date || !match.home || !match.away) {
      setData(null)
      return
    }
    const hn = match.home?.nameEn ?? match.home?.name
    const an = match.away?.nameEn ?? match.away?.name
    load().then((list) => {
      if (cancelled) return
      const found = list.find((e) => e.date === date && sameTeam(e.home, hn) && sameTeam(e.away, an))
      setData(found ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [match])

  return data
}
