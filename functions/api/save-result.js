export async function onRequest(context) {
  const { request } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '8644600',
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

    const hasFilter = expectedUpdatedAt != null && expectedUpdatedAt !== ''
    const filterParam = hasFilter
      ? `&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`
      : ''

    const url = `${supabaseUrl}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}${filterParam}&select=*`

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
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      let detail = ''
      try { detail = JSON.parse(text) } catch { detail = text }
      return respond({ error: `Supabase PATCH failed: ${response.status}`, detail }, response.status)
    }

    const text = await response.text()
    if (!text) return respond([], 200)

    const data = JSON.parse(text)
    if (!Array.isArray(data) || data.length === 0) return respond([], 200)

    return respond(data, 200)
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
