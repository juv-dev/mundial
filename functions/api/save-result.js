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
    const {
      matchId,
      homeScore,
      awayScore,
      homePens,
      awayPens,
      expectedUpdatedAt,
      supabaseUrl,
      supabaseKey,
    } = await request.json()

    if (!supabaseUrl || !supabaseKey) {
      return respond({ error: 'Supabase configuration missing' }, 500)
    }

    const url = `${supabaseUrl}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}&select=*`

    const body = {
      home_score: homeScore,
      away_score: awayScore,
      home_pens: homePens ?? null,
      away_pens: awayPens ?? null,
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
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    return respond(data, response.status)
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
