import type { MatchEvent, ScrapedPlayer, ScrapedTeamLineup, StatSection } from '../hooks/useLineup'

const IMG = 'https://www.flashscore.com/res/image/data/'
const FL = '/fl'

function parseRecords(raw: string): Record<string, string>[] {
  return raw.split('~').map((rec) => {
    const f: Record<string, string> = {}
    for (const p of rec.split('¬')) {
      const i = p.indexOf('÷')
      if (i > 0) f[p.slice(0, i)] = p.slice(i + 1)
    }
    return f
  })
}

function parseOrdered(rec: string): [string, string][] {
  const out: [string, string][] = []
  for (const p of rec.split('¬')) {
    const i = p.indexOf('÷')
    if (i > 0) out.push([p.slice(0, i), p.slice(i + 1)])
  }
  return out
}

function mapPlayer(f: Record<string, string>): ScrapedPlayer {
  return {
    name: f.LI || f.LN || '',
    number: f.LJ ? Number(f.LJ) : null,
    club: f.LUN || null,
    gk: f.LR === '(G)' || f.LS === 'Goalkeeper',
    photo: f.LPI ? IMG + f.LPI : null,
    pos: f.LL ? Number(f.LL) : null,
    clubLogo: f.LUL ? IMG + f.LUL : null,
  }
}

export function parseLineup(raw: string): { home: ScrapedTeamLineup; away: ScrapedTeamLineup } | null {
  if (!raw || raw === '0') return null
  const teams: Record<string, ScrapedTeamLineup> = {
    '1': { formation: '', starters: [], subs: [] },
    '2': { formation: '', starters: [], subs: [] },
  }
  let section: 'starters' | 'subs' | 'coaches' | null = null
  let team: string | null = null
  for (const f of parseRecords(raw)) {
    if (f.LB === 'Starting Lineups') section = 'starters'
    else if (f.LB === 'Substitutes') section = 'subs'
    else if (f.LB === 'Coaches') section = 'coaches'
    if (f.LC) team = f.LC
    if (f.LD && team) teams[team].formation = f.LD
    if ((f.LN || f.LI) && team && (section === 'starters' || section === 'subs')) {
      const t = teams[team]
      if (section === 'starters') t.starters.push(mapPlayer(f))
      else t.subs.push(mapPlayer(f))
    }
  }
  if (teams['1'].starters.length === 0 && teams['2'].starters.length === 0) return null
  return { home: teams['1'], away: teams['2'] }
}

export function parseStats(raw: string): StatSection[] | null {
  if (!raw || raw === '0') return null
  const sections: StatSection[] = []
  let cur: StatSection | null = null
  let period = 0
  for (const f of parseRecords(raw)) {
    if (f.SE) period++
    if (period > 1) break
    if (f.SF) {
      cur = { title: f.SF, rows: [] }
      sections.push(cur)
    }
    if (f.SG && cur) cur.rows.push({ name: f.SG, home: f.SH ?? '', away: f.SI ?? '' })
  }
  const filled = sections.filter((s) => s.rows.length > 0)
  return filled.length ? filled : null
}

export function parseEvents(raw: string): MatchEvent[] | null {
  if (!raw || raw === '0') return null
  const events: MatchEvent[] = []
  for (const rec of raw.split('~')) {
    let team: number | null = null
    let minute: string | null = null
    let scoreH: string | null = null
    let scoreA: string | null = null
    const segs: { type: string; player: string | null }[] = []
    let curIF: string | null = null
    for (const [k, v] of parseOrdered(rec)) {
      if (k === 'IA') team = Number(v)
      else if (k === 'IB') minute = v
      else if (k === 'INX') scoreH = v
      else if (k === 'IOX') scoreA = v
      else if (k === 'IF') curIF = v
      else if (k === 'IK') {
        segs.push({ type: v, player: curIF })
        curIF = null
      }
    }
    if (!segs.length || !minute || !team) continue
    const goal = segs.find((s) => s.type === 'Goal')
    const subOut = segs.find((s) => s.type === 'Substitution - Out')
    const subIn = segs.find((s) => s.type === 'Substitution - In')
    const card = segs.find((s) => /Card/.test(s.type))
    if (goal) {
      const assist = segs.find((s) => s.type === 'Assistance')
      events.push({
        type: 'goal',
        minute,
        team,
        player: goal.player,
        assist: assist ? assist.player : null,
        score: scoreH != null ? `${scoreH}-${scoreA}` : null,
      })
    } else if (subOut || subIn) {
      events.push({ type: 'sub', minute, team, out: subOut ? subOut.player : null, in: subIn ? subIn.player : null })
    } else if (card) {
      events.push({ type: /Red/.test(card.type) ? 'red' : 'yellow', minute, team, player: card.player })
    }
  }
  return events.length ? events : null
}

export interface LiveMatch {
  id: string
  home: string
  away: string
  scoreH: number | null
  scoreA: number | null
  status: 'scheduled' | 'live' | 'finished'
  minute: string | null
}

export function parseLiveDay(raw: string): LiveMatch[] {
  if (!raw || raw === '0') return []
  let tour = ''
  const out: LiveMatch[] = []
  for (const f of parseRecords(raw)) {
    if (f.ZA) tour = f.ZA
    if (f.AA && tour.includes('World Championship')) {
      const ac = f.AC
      const status = ac === '1' ? 'scheduled' : ac === '3' ? 'finished' : 'live'
      out.push({
        id: f.AA,
        home: f.AE,
        away: f.AF,
        scoreH: f.AG != null ? Number(f.AG) : null,
        scoreA: f.AH != null ? Number(f.AH) : null,
        status,
        minute: f.AM ?? null,
      })
    }
  }
  return out
}

async function text(feed: string): Promise<string> {
  try {
    const r = await fetch(`${FL}/${feed}`)
    if (!r.ok) return ''
    return await r.text()
  } catch {
    return ''
  }
}

export async function fetchLiveDay(): Promise<LiveMatch[]> {
  return parseLiveDay(await text('f_1_0_3_es_1'))
}

export interface FlashscoreDetail {
  lineup: { home: ScrapedTeamLineup; away: ScrapedTeamLineup } | null
  stats: StatSection[] | null
  events: MatchEvent[] | null
}

export async function fetchDetail(fsid: string): Promise<FlashscoreDetail> {
  const [li, st, su] = await Promise.all([
    text(`df_li_1_${fsid}`),
    text(`df_st_1_${fsid}`),
    text(`df_sui_1_${fsid}`),
  ])
  return { lineup: parseLineup(li), stats: parseStats(st), events: parseEvents(su) }
}
