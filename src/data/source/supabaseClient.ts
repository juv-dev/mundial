import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !key) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.',
  )
}

// In development, route ALL Supabase HTTP requests through the Vite dev server
// to avoid CORS preflight issues with the Supabase/Cloudflare gateway.
// The proxy rewrites /__supabase/… → /… and targets the Supabase origin.
// Auth and Realtime WebSocket connections also go through the proxy.
const url = import.meta.env.DEV ? `${window.location.origin}/__supabase` : supabaseUrl

export const supabase = createClient(url, key)
