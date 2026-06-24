import { supabase } from './supabaseClient'
import { ListenerSet } from './ListenerSet'
import type { PredictionSource, SavePrediction } from './PredictionSource'
import type { Prediction } from '../types'
import { rowToPrediction, type DbPrediction } from './predictionMapper'

type ChannelRef = ReturnType<typeof supabase.channel>

export class SupabasePredictionSource implements PredictionSource {
  private predictions: Prediction[] = []
  private bus = new ListenerSet()
  private channel: ChannelRef | null = null

  getAll(): Prediction[] {
    return this.predictions
  }

  subscribe = this.bus.subscribe.bind(this.bus)

  private notify(): void {
    this.bus.notify()
  }

  private async load(): Promise<void> {
    const { data, error } = await supabase.from('predictions').select('*')
    if (error || !data) return
    this.predictions = (data as DbPrediction[]).map(rowToPrediction)
    this.notify()
  }

  start(): void {
    void this.load()
    this.channel = supabase
      .channel('predictions-main')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        () => void this.load(),
      )
      .subscribe()
  }

  stop(): void {
    if (this.channel) {
      void supabase.removeChannel(this.channel)
      this.channel = null
    }
  }

  async upsert(
    participant: string,
    matchId: string,
    homeScore: number,
    awayScore: number,
    penalties: [number, number] | undefined,
  ): Promise<SavePrediction> {
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          participant,
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          home_pens: penalties?.[0] ?? null,
          away_pens: penalties?.[1] ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'participant,match_id' },
      )
      .select()
    if (error) return { ok: false, error: error.message }

    if (data && data.length > 0) {
      const saved = rowToPrediction(data[0] as DbPrediction)
      const others = this.predictions.filter(
        (p) => !(p.participant === saved.participant && p.matchId === saved.matchId),
      )
      this.predictions = [...others, saved]
      this.notify()
    }

    return { ok: true }
  }
}
