import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !key) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.',
  )
}

const url = import.meta.env.DEV ? `${window.location.origin}/__supabase` : supabaseUrl

export { supabaseUrl }
export const supabase = createClient(url, key)
