export async function onRequest(context) {
  const { request } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const raw = await request.json()
    const { matchId, supabaseUrl, supabaseKey } = raw


    const homeScore = raw.homeScore ?? raw.home_score ?? null
    const awayScore = raw.awayScore ?? raw.away_score ?? null
    const homePens  = raw.homePens  ?? raw.home_pens  ?? null
    const awayPens  = raw.awayPens  ?? raw.away_pens  ?? null
    const resetOnly = raw.resetOnly === true

    if (!supabaseUrl || !supabaseKey) {
      return respond({ error: 'Supabase configuration missing' }, 500)
    }

    const url = `${supabaseUrl}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=*`

    const patchBody = resetOnly
      ? {
          home_score: null,
          away_score: null,
          home_pens: null,
          away_pens: null,
          status: 'scheduled',
          updated_at: new Date().toISOString(),
        }
      : {
          home_score: homeScore,
          away_score: awayScore,
          home_pens: homePens,
          away_pens: awayPens,
          status: 'finished',
          updated_at: new Date().toISOString(),
        }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patchBody),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return respond({ error: `Supabase PATCH failed: ${response.status}`, detail: text }, response.status)
    }

    const text = await response.text()
    if (!text) return respond([], 200)

    const data = JSON.parse(text)
    return respond(Array.isArray(data) ? data : [], 200)
  } catch (err) {
    return respond({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
}

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}