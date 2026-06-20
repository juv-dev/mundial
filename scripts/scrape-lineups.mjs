import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = 'https://2.flashscore.ninja/2/x/feed'
const HEADERS = {
  'x-fsign': 'SW9D1eZo',
  Referer: 'https://www.flashscore.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
}
const IMG = 'https://www.flashscore.com/res/image/data/'

function parseRecords(raw) {
  return raw.split('~').map((rec) => {
    const f = {}
    for (const p of rec.split('¬')) {
      const i = p.indexOf('÷')
      if (i > 0) f[p.slice(0, i)] = p.slice(i + 1)
    }
    return f
  })
}

async function feed(path) {
  const res = await fetch(`${BASE}/${path}`, { headers: HEADERS })
  if (!res.ok) return ''
  return res.text()
}

async function scanDay(offset, matches, teams, seen) {
  const raw = await feed(`f_1_${offset}_3_es_1`)
  if (!raw || raw === '0') return
  let tour = ''
  for (const f of parseRecords(raw)) {
    if (f.ZA) tour = f.ZA
    if (f.AA && tour.includes('World Championship')) {
      if (f.PX && f.AE) teams.set(f.PX, { name: f.AE, code: f.WM || '' })
      if (f.PY && f.AF) teams.set(f.PY, { name: f.AF, code: f.WN || '' })
      if (!seen.has(f.AA)) {
        seen.add(f.AA)
        matches.push({ id: f.AA, home: f.AE, away: f.AF, ts: f.AD ? Number(f.AD) : 0 })
      }
    }
  }
}

function mapPlayer(f) {
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

function parseOrdered(rec) {
  const out = []
  for (const p of rec.split('¬')) {
    const i = p.indexOf('÷')
    if (i > 0) out.push([p.slice(0, i), p.slice(i + 1)])
  }
  return out
}

async function eventsFor(matchId) {
  const raw = await feed(`df_sui_1_${matchId}`)
  if (!raw || raw === '0') return null
  const events = []
  for (const rec of raw.split('~')) {
    let team = null
    let minute = null
    let scoreH = null
    let scoreA = null
    const segs = []
    let curIF = null
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

async function statsFor(matchId) {
  const raw = await feed(`df_st_1_${matchId}`)
  if (!raw || raw === '0') return null
  const sections = []
  let cur = null
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

async function lineupFor(matchId) {
  const raw = await feed(`df_li_1_${matchId}`)
  if (!raw || raw === '0') return null
  const teams = { 1: { formation: '', starters: [], subs: [] }, 2: { formation: '', starters: [], subs: [] } }
  let section = null
  let team = null
  for (const f of parseRecords(raw)) {
    if (f.LB === 'Starting Lineups') section = 'starters'
    else if (f.LB === 'Substitutes') section = 'subs'
    else if (f.LB === 'Coaches') section = 'coaches'
    if (f.LC) team = f.LC
    if (f.LD && team) teams[team].formation = f.LD
    if ((f.LN || f.LI) && team && (section === 'starters' || section === 'subs')) {
      teams[team][section].push(mapPlayer(f))
    }
  }
  if (teams['1'].starters.length === 0 && teams['2'].starters.length === 0) return null
  return { home: teams['1'], away: teams['2'] }
}

async function squadFor(teamId) {
  const raw = await feed(`sq_1_${teamId}`)
  if (!raw || raw === '0') return null
  const groups = []
  let cur = null
  for (const f of parseRecords(raw)) {
    if (f.GN) {
      cur = { type: f.GN, players: [] }
      groups.push(cur)
    } else if (f.PN && cur) {
      cur.players.push({
        name: f.PN,
        number: f.PJ ? Number(f.PJ) : null,
        photo: f.PPU ? IMG + f.PPU : null,
        clubLogo: f.TLU ? IMG + f.TLU : null,
      })
    }
  }
  if (groups.every((g) => g.players.length === 0)) return null
  return groups
}

function dayKey(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

async function run() {
  const matches = []
  const teams = new Map()
  const seen = new Set()
  for (let off = -12; off <= 16; off++) await scanDay(off, matches, teams, seen)
  console.log(`Partidos del Mundial: ${matches.length} · Equipos: ${teams.size}`)

  const now = Date.now() / 1000
  const lineups = []
  for (const m of matches) {
    if (m.ts > now + 3600) continue
    const data = await lineupFor(m.id)
    if (!data) continue
    const stats = await statsFor(m.id)
    const events = await eventsFor(m.id)
    lineups.push({ date: dayKey(m.ts), home: m.home, away: m.away, lineups: data, stats, events })
  }
  console.log(`Alineaciones: ${lineups.length}`)

  const squads = []
  for (const [id, info] of teams) {
    const groups = await squadFor(id)
    if (!groups) continue
    squads.push({ name: info.name, code: info.code, groups })
  }
  console.log(`Plantillas: ${squads.length}`)

  mkdirSync('public', { recursive: true })
  writeFileSync('public/lineups.json', JSON.stringify({ updatedAt: dayKey(now), matches: lineups }, null, 0))
  writeFileSync('public/squads.json', JSON.stringify({ updatedAt: dayKey(now), teams: squads }, null, 0))
  console.log('Guardado public/lineups.json y public/squads.json')
}

run().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
