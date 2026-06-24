import { supabase } from './supabaseClient'
import { ListenerSet } from './ListenerSet'
import { GROUPS, T } from '../worldcup2026'
import type { DataSource, SaveResult } from './DataSource'
import type { Match, Stage, Team, TournamentSnapshot } from '../types'

interface DbRow {
  id: string
  stage: string
  group_name: string | null
  label: string | null
  home_code: string | null
  away_code: string | null
  home_slot: string | null
  away_slot: string | null
  home_score: number
  away_score: number
  home_pens: number | null
  away_pens: number | null
  status: string
  kickoff: string
  matchday: number | null
  updated_at: string
}

function team(code: string | null): Team | null {
  if (!code) return null
  return T[code] ?? null
}

function rowToMatch(row: DbRow): Match {
  return {
    id: row.id,
    stage: row.stage as Stage,
    group: row.group_name ?? undefined,
    label: row.label ?? undefined,
    home: team(row.home_code),
    away: team(row.away_code),
    homeSlot: row.home_slot ?? undefined,
    awaySlot: row.away_slot ?? undefined,
    homeScore: row.home_score,
    awayScore: row.away_score,
    homePens: row.home_pens ?? undefined,
    awayPens: row.away_pens ?? undefined,
    status: row.status as Match['status'],
    kickoff: row.kickoff,
    utcDate: row.kickoff,
    matchday: row.matchday ?? undefined,
    updatedAt: row.updated_at,
  }
}

type ChannelRef = ReturnType<typeof supabase.channel>

export class SupabaseDataSource implements DataSource {
  private snapshot: TournamentSnapshot = { groups: GROUPS, matches: [], updatedAt: 0 }
  private bus = new ListenerSet()
  private mainChannel: ChannelRef | null = null

  getSnapshot(): TournamentSnapshot {
    return this.snapshot
  }

  subscribe = this.bus.subscribe.bind(this.bus)

  private notify(): void {
    this.bus.notify()
  }

  private async load(): Promise<void> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff', { ascending: true })
    if (error || !data) return
    this.snapshot = {
      groups: GROUPS,
      matches: (data as DbRow[]).map(rowToMatch),
      updatedAt: Date.now(),
    }
    this.notify()
  }

  start(): void {
    void this.load()
    this.mainChannel = supabase
      .channel('matches-main')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => void this.load(),
      )
      .subscribe()
  }

  stop(): void {
    if (this.mainChannel) {
      void supabase.removeChannel(this.mainChannel)
      this.mainChannel = null
    }
  }

  async saveResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
    penalties: [number, number] | undefined,
    expectedUpdatedAt: string,
  ): Promise<SaveResult> {
    const { data: updated, error: updateError } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        home_pens: penalties?.[0] ?? null,
        away_pens: penalties?.[1] ?? null,
        status: 'finished',
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .eq('updated_at', expectedUpdatedAt)
      .select()

    if (updateError) return { ok: false, conflict: false, error: updateError.message }

    if (!updated || updated.length === 0) {
      const { data: current } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()
      if (!current) return { ok: false, conflict: false, error: 'Match not found' }
      return { ok: false, conflict: true, current: rowToMatch(current as DbRow) }
    }

    const saved = rowToMatch(updated[0] as DbRow)
    this.snapshot = {
      ...this.snapshot,
      matches: this.snapshot.matches.map((m) => (m.id === saved.id ? saved : m)),
      updatedAt: Date.now(),
    }
    this.notify()

    return { ok: true }
  }

}
