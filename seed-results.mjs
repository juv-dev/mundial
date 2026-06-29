import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wkefzuwjtamofzidadfq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZWZ6dXdqdGFtb2Z6aWRhZGZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MjIxNCwiZXhwIjoyMDk3NTM4MjE0fQ.q4UpsNr1ULv-r9FNfbXpg2rvAeFFxQv4FUEpM1b289c'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// Resultados fase de grupos
// Formato: [home_code, away_code, home_score, away_score]
const results = [
  // Jue 11/6
  ['MEX', 'RSA', 2, 0],
  ['KOR', 'CZE', 2, 1],
  // Vie 12/6
  ['CAN', 'BIH', 1, 1],
  ['USA', 'PRY', 4, 1],
  // Sáb 13/6
  ['QAT', 'SUI', 1, 1],
  ['BRA', 'MAR', 1, 1],
  ['HAI', 'SCO', 0, 1],
  ['AUS', 'TUR', 2, 0],
  // Dom 14/6
  ['GER', 'CUW', 7, 1],
  ['NED', 'JPN', 2, 2],
  ['CIV', 'ECU', 1, 0],
  ['SWE', 'TUN', 5, 1],
  // Lun 15/6
  ['ESP', 'CPV', 0, 0],
  ['BEL', 'EGY', 1, 1],
  ['KSA', 'URU', 1, 1],
  ['IRN', 'NZL', 2, 2],
  // Mar 16/6
  ['FRA', 'SEN', 3, 1],
  ['IRQ', 'NOR', 1, 4],
  ['ARG', 'ALG', 3, 0],
  ['AUT', 'JOR', 3, 1],
  // Mié 17/6
  ['POR', 'COD', 1, 1],
  ['ENG', 'CRO', 4, 2],
  ['GHA', 'PAN', 1, 0],
  ['UZB', 'COL', 1, 3],
  // Jue 18/6
  ['CZE', 'RSA', 1, 1],
  ['SUI', 'BIH', 4, 1],
  ['CAN', 'QAT', 6, 0],
  ['MEX', 'KOR', 1, 0],
  // Vie 19/6
  ['USA', 'AUS', 2, 0],
  ['SCO', 'MAR', 0, 1],
  ['BRA', 'HAI', 3, 0],
  ['TUR', 'PRY', 0, 1],
  // Sáb 20/6
  ['NED', 'SWE', 5, 1],
  ['GER', 'CIV', 2, 1],
  ['ECU', 'CUW', 0, 0],
  ['TUN', 'JPN', 0, 4],
  // Dom 21/6
  ['ESP', 'KSA', 4, 0],
  ['BEL', 'IRN', 0, 0],
  ['URU', 'CPV', 2, 2],
  ['NZL', 'EGY', 1, 3],
  // Lun 22/6
  ['ARG', 'AUT', 2, 0],
  ['FRA', 'IRQ', 3, 0],
  ['NOR', 'SEN', 3, 2],
  ['JOR', 'ALG', 1, 2],
  // Mar 23/6
  ['POR', 'UZB', 5, 0],
  ['ENG', 'GHA', 0, 0],
  ['PAN', 'CRO', 0, 1],
  ['COL', 'COD', 1, 0],
  // Mié 24/6 — Jornada 3 (Grupos A, B, C)
  ['RSA', 'KOR', 1, 0],
  ['CZE', 'MEX', 0, 3],
  ['SUI', 'CAN', 2, 1],
  ['BIH', 'QAT', 3, 1],
  ['MAR', 'HAI', 4, 2],
  ['SCO', 'BRA', 0, 3],
  // Jue 25/6 — Jornada 3 (Grupos D, E, F)
  ['TUR', 'USA', 3, 2],
  ['PAR', 'AUS', 0, 0],
  ['CUW', 'CIV', 0, 2],
  ['ECU', 'GER', 2, 1],
  ['TUN', 'NED', 1, 3],
  ['JPN', 'SWE', 1, 1],
  // Vie 26/6 — Jornada 3 (Grupos G, H, I)
  ['NZL', 'BEL', 1, 5],
  ['EGY', 'IRN', 1, 1],
  ['CPV', 'KSA', 0, 0],
  ['URU', 'ESP', 0, 1],
  ['NOR', 'FRA', 1, 4],
  ['SEN', 'IRQ', 5, 0],
  // Sáb 27/6 — Jornada 3 (Grupos J, K, L)
  ['ALG', 'AUT', 3, 3],
  ['JOR', 'ARG', 1, 3],
  ['COL', 'POR', 0, 0],
  ['COD', 'UZB', 3, 1],
  ['PAN', 'ENG', 0, 2],
  ['CRO', 'GHA', 2, 1],
]

// Resultados eliminatorias (por ID, porque home_code/away_code son null)
const koResults = [
  ['KO-73', 0, 1], // Sudáfrica 0-1 Canadá (28 jun)
]

async function run() {
  // Primero traer todos los partidos de grupo
  const { data: matches, error } = await sb
    .from('matches')
    .select('id,home_code,away_code,status')
    .eq('stage', 'group')
    .order('kickoff')

  if (error) { console.error('Error fetching matches:', error); process.exit(1) }

  console.log(`Encontrados ${matches.length} partidos de fase de grupos`)

  let updated = 0
  let notFound = 0

  for (const [home, away, hs, as_] of results) {
    const match = matches.find(m => m.home_code === home && m.away_code === away)
    if (!match) {
      console.warn(`⚠️  No encontrado: ${home} vs ${away}`)
      notFound++
      continue
    }

    const { error: err } = await sb
      .from('matches')
      .update({
        home_score: hs,
        away_score: as_,
        home_pens: null,
        away_pens: null,
        status: 'finished',
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id)

    if (err) {
      console.error(`❌ Error ${home} vs ${away}:`, err.message)
    } else {
      console.log(`✅ ${home} ${hs}-${as_} ${away}`)
      updated++
    }
  }

  console.log(`\nListo: ${updated} actualizados, ${notFound} no encontrados`)

  // Actualizar eliminatorias
  let koUpdated = 0
  for (const [id, hs, as_] of koResults) {
    const { error: err } = await sb
      .from('matches')
      .update({
        home_score: hs,
        away_score: as_,
        home_pens: null,
        away_pens: null,
        status: 'finished',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (err) {
      console.error(`❌ Error ${id}:`, err.message)
    } else {
      console.log(`✅ ${id}: ${hs}-${as_}`)
      koUpdated++
    }
  }

  console.log(`Eliminatorias: ${koUpdated} actualizadas`)
}

run()
