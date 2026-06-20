import { useEffect, useState } from 'react'
import type { Match } from '../data/types'
import { sameTeam } from '../data/teamMatch'
import { useLineup, type MatchEvent, type ScrapedTeamLineup, type StatSection } from './useLineup'
import { fetchDetail, fetchLiveDay, type FlashscoreDetail } from '../data/flashscore'

export interface MatchDetail {
  lineup: { home: ScrapedTeamLineup; away: ScrapedTeamLineup } | null
  stats: StatSection[] | null
  events: MatchEvent[] | null
  liveScore: [number, number] | null
  liveMinute: string | null
  isLive: boolean
  loading: boolean
}

const POLL_MS = 60000

export function useMatchDetail(match: Match): MatchDetail {
  const staticLineup = useLineup(match)
  const [live, setLive] = useState<{
    detail: FlashscoreDetail
    score: [number, number] | null
    minute: string | null
  } | null>(null)
  const [attempted, setAttempted] = useState(false)

  const isLiveStatus = match.status === 'live' || match.status === 'half-time'

  useEffect(() => {
    if (!isLiveStatus) {
      setLive(null)
      setAttempted(true)
      return
    }
    setAttempted(false)
    const hn = match.home?.nameEn ?? match.home?.name
    const an = match.away?.nameEn ?? match.away?.name
    let cancelled = false

    const tick = async () => {
      try {
        const day = await fetchLiveDay()
        const m = day.find((d) => sameTeam(d.home, hn) && sameTeam(d.away, an))
        if (!m || cancelled) return
        const detail = await fetchDetail(m.id)
        if (cancelled) return
        setLive({
          detail,
          score: m.scoreH != null && m.scoreA != null ? [m.scoreH, m.scoreA] : null,
          minute: m.minute,
        })
      } finally {
        if (!cancelled) setAttempted(true)
      }
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [match, isLiveStatus])

  const events = live?.detail.events ?? staticLineup?.events ?? null
  const stats = live?.detail.stats ?? staticLineup?.stats ?? null
  const lineup = live?.detail.lineup ?? staticLineup?.lineups ?? null
  const hasData = !!(events?.length || stats?.length || lineup)

  return {
    lineup,
    stats,
    events,
    liveScore: live?.score ?? null,
    liveMinute: live?.minute ?? null,
    isLive: !!live,
    loading: isLiveStatus && !attempted && !hasData,
  }
}
