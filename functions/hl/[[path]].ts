interface Env {
  HIGHLIGHTLY_KEY: string
}

const UPSTREAM = 'https://soccer.highlightly.net'

function ttlFor(path: string): number {
  if (path.includes('/standings')) return 3600
  if (path.includes('/matches')) return 600
  return 900
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(context.request.url)
  const path = url.pathname.replace(/^\/hl/, '')
  const key = context.env.HIGHLIGHTLY_KEY

  if (!key) {
    return new Response(JSON.stringify({ error: 'HIGHLIGHTLY_KEY not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const ttl = ttlFor(path)
  const target = `${UPSTREAM}${path}${url.search}`

  let upstream: Response
  try {
    upstream = await fetch(target, {
      headers: { 'X-RapidAPI-Key': key },
      cf: { cacheTtl: ttl, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } })
  } catch {
    return new Response(JSON.stringify({ error: 'upstream fetch failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }

  const body = await upstream.text()
  const maxAge = upstream.ok ? ttl : 30
  return new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': `public, max-age=${maxAge}`,
      'access-control-allow-origin': '*',
    },
  })
}
