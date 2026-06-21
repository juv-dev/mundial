import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let url = process.env.VITE_SUPABASE_URL
let key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  try {
    const envContent = readFileSync(join(__dirname, '../.env'), 'utf8')
    for (const line of envContent.split('\n')) {
      const [k, ...rest] = line.split('=')
      const v = rest.join('=').trim()
      if (k?.trim() === 'VITE_SUPABASE_URL') url = v
      if (k?.trim() === 'VITE_SUPABASE_ANON_KEY') key = v
    }
  } catch {}
}

if (!url || !key) {
  process.stderr.write('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY\n')
  process.exit(1)
}

const supabase = createClient(url, key)

const GROUP_MATCHES = [
  ['A', 1, 'MEX', 'RSA', '2026-06-11T14:35:00-05'],
  ['A', 1, 'KOR', 'CZE', '2026-06-11T14:32:00-05'],
  ['A', 2, 'CZE', 'RSA', '2026-06-18T13:00:00-05'],
  ['A', 2, 'MEX', 'KOR', '2026-06-18T13:56:00-05'],
  ['A', 3, 'RSA', 'KOR', '2026-06-24T20:00:00-05'],
  ['A', 3, 'CZE', 'MEX', '2026-06-24T20:00:00-05'],
  ['B', 1, 'CAN', 'BIH', '2026-06-12T06:52:00-05'],
  ['B', 1, 'QAT', 'SUI', '2026-06-13T14:32:00-05'],
  ['B', 2, 'SUI', 'BIH', '2026-06-18T16:21:00-05'],
  ['B', 2, 'CAN', 'QAT', '2026-06-18T15:54:00-05'],
  ['B', 3, 'SUI', 'CAN', '2026-06-24T14:00:00-05'],
  ['B', 3, 'BIH', 'QAT', '2026-06-24T14:00:00-05'],
  ['C', 1, 'BRA', 'MAR', '2026-06-13T12:40:00-05'],
  ['C', 1, 'HAI', 'SCO', '2026-06-13T10:52:00-05'],
  ['C', 2, 'SCO', 'MAR', '2026-06-19T10:24:00-05'],
  ['C', 2, 'BRA', 'HAI', '2026-06-19T13:25:00-05'],
  ['C', 3, 'MAR', 'HAI', '2026-06-24T17:00:00-05'],
  ['C', 3, 'SCO', 'BRA', '2026-06-24T17:00:00-05'],
  ['D', 1, 'USA', 'PAR', '2026-06-12T06:05:00-05'],
  ['D', 1, 'AUS', 'TUR', '2026-06-13T13:26:00-05'],
  ['D', 2, 'USA', 'AUS', '2026-06-19T01:40:00-05'],
  ['D', 2, 'TUR', 'PAR', '2026-06-19T13:39:00-05'],
  ['D', 3, 'TUR', 'USA', '2026-06-25T21:00:00-05'],
  ['D', 3, 'PAR', 'AUS', '2026-06-25T21:00:00-05'],
  ['E', 1, 'GER', 'CUW', '2026-06-14T14:58:00-05'],
  ['E', 1, 'CIV', 'ECU', '2026-06-14T15:56:00-05'],
  ['E', 2, 'GER', 'CIV', '2026-06-20T14:00:00-05'],
  ['E', 2, 'ECU', 'CUW', '2026-06-20T19:00:00-05'],
  ['E', 3, 'CUW', 'CIV', '2026-06-25T15:00:00-05'],
  ['E', 3, 'ECU', 'GER', '2026-06-25T15:00:00-05'],
  ['F', 1, 'NED', 'JPN', '2026-06-14T03:29:00-05'],
  ['F', 1, 'SWE', 'TUN', '2026-06-14T16:31:00-05'],
  ['F', 2, 'NED', 'SWE', '2026-06-20T15:32:00-05'],
  ['F', 2, 'TUN', 'JPN', '2026-06-20T23:00:00-05'],
  ['F', 3, 'TUN', 'NED', '2026-06-25T18:00:00-05'],
  ['F', 3, 'JPN', 'SWE', '2026-06-25T18:00:00-05'],
  ['G', 1, 'BEL', 'EGY', '2026-06-15T16:14:00-05'],
  ['G', 1, 'IRN', 'NZL', '2026-06-15T15:26:00-05'],
  ['G', 2, 'BEL', 'IRN', '2026-06-21T14:00:00-05'],
  ['G', 2, 'NZL', 'EGY', '2026-06-21T20:00:00-05'],
  ['G', 3, 'NZL', 'BEL', '2026-06-26T22:00:00-05'],
  ['G', 3, 'EGY', 'IRN', '2026-06-26T22:00:00-05'],
  ['H', 1, 'ESP', 'CPV', '2026-06-15T11:48:00-05'],
  ['H', 1, 'KSA', 'URU', '2026-06-15T15:25:00-05'],
  ['H', 2, 'ESP', 'KSA', '2026-06-21T11:00:00-05'],
  ['H', 2, 'URU', 'CPV', '2026-06-21T17:00:00-05'],
  ['H', 3, 'CPV', 'KSA', '2026-06-26T19:00:00-05'],
  ['H', 3, 'URU', 'ESP', '2026-06-26T19:00:00-05'],
  ['I', 1, 'FRA', 'SEN', '2026-06-16T17:05:00-05'],
  ['I', 1, 'IRQ', 'NOR', '2026-06-16T14:41:00-05'],
  ['I', 2, 'FRA', 'IRQ', '2026-06-22T16:00:00-05'],
  ['I', 2, 'NOR', 'SEN', '2026-06-22T19:00:00-05'],
  ['I', 3, 'NOR', 'FRA', '2026-06-26T14:00:00-05'],
  ['I', 3, 'SEN', 'IRQ', '2026-06-26T14:00:00-05'],
  ['J', 1, 'ARG', 'ALG', '2026-06-16T14:25:00-05'],
  ['J', 1, 'AUT', 'JOR', '2026-06-16T14:59:00-05'],
  ['J', 2, 'ARG', 'AUT', '2026-06-22T12:00:00-05'],
  ['J', 2, 'JOR', 'ALG', '2026-06-22T22:00:00-05'],
  ['J', 3, 'ALG', 'AUT', '2026-06-27T21:00:00-05'],
  ['J', 3, 'JOR', 'ARG', '2026-06-27T21:00:00-05'],
  ['K', 1, 'POR', 'COD', '2026-06-17T12:41:00-05'],
  ['K', 1, 'UZB', 'COL', '2026-06-17T15:35:00-05'],
  ['K', 2, 'POR', 'UZB', '2026-06-23T12:00:00-05'],
  ['K', 2, 'COL', 'COD', '2026-06-23T21:00:00-05'],
  ['K', 3, 'COL', 'POR', '2026-06-27T18:30:00-05'],
  ['K', 3, 'COD', 'UZB', '2026-06-27T18:30:00-05'],
  ['L', 1, 'ENG', 'CRO', '2026-06-17T16:41:00-05'],
  ['L', 1, 'GHA', 'PAN', '2026-06-17T15:19:00-05'],
  ['L', 2, 'ENG', 'GHA', '2026-06-23T15:00:00-05'],
  ['L', 2, 'PAN', 'CRO', '2026-06-23T18:00:00-05'],
  ['L', 3, 'PAN', 'ENG', '2026-06-27T16:00:00-05'],
  ['L', 3, 'CRO', 'GHA', '2026-06-27T16:00:00-05'],
]

const KO_DEFS = [
  { n: 73, stage: 'r32', homeSlot: '2° A', awaySlot: '2° B', kickoff: '2026-06-28T14:00:00-05' },
  { n: 74, stage: 'r32', homeSlot: '1° E', awaySlot: '3° (A/B/C/D/F)', kickoff: '2026-06-29T12:00:00-05' },
  { n: 75, stage: 'r32', homeSlot: '1° F', awaySlot: '2° C', kickoff: '2026-06-29T15:30:00-05' },
  { n: 76, stage: 'r32', homeSlot: '1° C', awaySlot: '2° F', kickoff: '2026-06-29T20:00:00-05' },
  { n: 77, stage: 'r32', homeSlot: '1° I', awaySlot: '3° (C/D/F/G/H)', kickoff: '2026-06-30T12:00:00-05' },
  { n: 78, stage: 'r32', homeSlot: '2° E', awaySlot: '2° I', kickoff: '2026-06-30T16:00:00-05' },
  { n: 79, stage: 'r32', homeSlot: '1° A', awaySlot: '3° (C/E/F/H/I)', kickoff: '2026-06-30T20:00:00-05' },
  { n: 80, stage: 'r32', homeSlot: '1° L', awaySlot: '3° (E/H/I/J/K)', kickoff: '2026-07-01T11:00:00-05' },
  { n: 81, stage: 'r32', homeSlot: '1° D', awaySlot: '3° (B/E/F/I/J)', kickoff: '2026-07-01T15:00:00-05' },
  { n: 82, stage: 'r32', homeSlot: '1° G', awaySlot: '3° (A/E/H/I/J)', kickoff: '2026-07-01T19:00:00-05' },
  { n: 83, stage: 'r32', homeSlot: '2° K', awaySlot: '2° L', kickoff: '2026-07-02T14:00:00-05' },
  { n: 84, stage: 'r32', homeSlot: '1° H', awaySlot: '2° J', kickoff: '2026-07-02T18:00:00-05' },
  { n: 85, stage: 'r32', homeSlot: '1° B', awaySlot: '3° (B/E/F/I/J)', kickoff: '2026-07-02T22:00:00-05' },
  { n: 86, stage: 'r32', homeSlot: '1° J', awaySlot: '2° H', kickoff: '2026-07-03T13:00:00-05' },
  { n: 87, stage: 'r32', homeSlot: '1° K', awaySlot: '3° (D/E/I/J/L)', kickoff: '2026-07-03T17:00:00-05' },
  { n: 88, stage: 'r32', homeSlot: '2° D', awaySlot: '2° G', kickoff: '2026-07-03T20:30:00-05' },
  { n: 89, stage: 'r16', homeSlot: 'Gan. P74', awaySlot: 'Gan. P77', kickoff: '2026-07-04T12:00:00-05' },
  { n: 90, stage: 'r16', homeSlot: 'Gan. P73', awaySlot: 'Gan. P75', kickoff: '2026-07-04T16:00:00-05' },
  { n: 91, stage: 'r16', homeSlot: 'Gan. P76', awaySlot: 'Gan. P78', kickoff: '2026-07-05T15:00:00-05' },
  { n: 92, stage: 'r16', homeSlot: 'Gan. P79', awaySlot: 'Gan. P80', kickoff: '2026-07-05T19:00:00-05' },
  { n: 93, stage: 'r16', homeSlot: 'Gan. P83', awaySlot: 'Gan. P84', kickoff: '2026-07-06T14:00:00-05' },
  { n: 94, stage: 'r16', homeSlot: 'Gan. P81', awaySlot: 'Gan. P82', kickoff: '2026-07-06T19:00:00-05' },
  { n: 95, stage: 'r16', homeSlot: 'Gan. P86', awaySlot: 'Gan. P88', kickoff: '2026-07-07T11:00:00-05' },
  { n: 96, stage: 'r16', homeSlot: 'Gan. P85', awaySlot: 'Gan. P87', kickoff: '2026-07-07T15:00:00-05' },
  { n: 97, stage: 'qf', homeSlot: 'Gan. P89', awaySlot: 'Gan. P90', kickoff: '2026-07-09T15:00:00-05' },
  { n: 98, stage: 'qf', homeSlot: 'Gan. P93', awaySlot: 'Gan. P94', kickoff: '2026-07-10T14:00:00-05' },
  { n: 99, stage: 'qf', homeSlot: 'Gan. P91', awaySlot: 'Gan. P92', kickoff: '2026-07-11T16:00:00-05' },
  { n: 100, stage: 'qf', homeSlot: 'Gan. P95', awaySlot: 'Gan. P96', kickoff: '2026-07-11T20:00:00-05' },
  { n: 101, stage: 'sf', homeSlot: 'Gan. P97', awaySlot: 'Gan. P98', kickoff: '2026-07-14T14:00:00-05' },
  { n: 102, stage: 'sf', homeSlot: 'Gan. P99', awaySlot: 'Gan. P100', kickoff: '2026-07-15T14:00:00-05' },
  { n: 103, stage: 'sf', homeSlot: 'Per. P101', awaySlot: 'Per. P102', kickoff: '2026-07-18T16:00:00-05', isThird: true },
  { n: 104, stage: 'final', homeSlot: 'Gan. P101', awaySlot: 'Gan. P102', kickoff: '2026-07-19T14:00:00-05' },
]

const STAGE_LABEL = {
  r32: '16avos',
  r16: '8avos',
  qf: 'Cuartos',
  sf: 'Semifinal',
  final: 'Final',
}

const rows = []

for (const [group, matchday, home, away, kickoff] of GROUP_MATCHES) {
  rows.push({
    id: `g${group}-md${matchday}-${home}-${away}`,
    stage: 'group',
    group_name: group,
    label: `Grupo ${group} · Jornada ${matchday}`,
    home_code: home,
    away_code: away,
    home_slot: null,
    away_slot: null,
    home_score: 0,
    away_score: 0,
    home_pens: null,
    away_pens: null,
    status: 'scheduled',
    kickoff,
    matchday,
  })
}

for (const ko of KO_DEFS) {
  const id = ko.isThird ? 'TP-1' : `KO-${ko.n}`
  const stageLabel = ko.isThird ? 'Tercer Puesto' : ko.stage === 'final' ? 'Final' : `${STAGE_LABEL[ko.stage]} · P${ko.n}`
  rows.push({
    id,
    stage: ko.stage,
    group_name: null,
    label: stageLabel,
    home_code: null,
    away_code: null,
    home_slot: ko.homeSlot,
    away_slot: ko.awaySlot,
    home_score: 0,
    away_score: 0,
    home_pens: null,
    away_pens: null,
    status: 'scheduled',
    kickoff: ko.kickoff,
    matchday: null,
  })
}

const groupRows = rows.filter((r) => r.stage === 'group')
const koRows = rows.filter((r) => r.stage !== 'group')

process.stdout.write(`Seeding ${groupRows.length} group matches and ${koRows.length} knockout matches...\n`)

const BATCH = 20
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase.from('matches').upsert(batch, { onConflict: 'id' })
  if (error) {
    process.stderr.write(`Error upserting batch ${i}-${i + BATCH}: ${error.message}\n`)
    process.exit(1)
  }
  inserted += batch.length
  process.stdout.write(`Upserted ${inserted}/${rows.length}\n`)
}

process.stdout.write(`Done. ${groupRows.length} group + ${koRows.length} knockout = ${rows.length} total rows.\n`)
