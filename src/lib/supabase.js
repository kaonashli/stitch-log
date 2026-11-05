// One shared Supabase client for the whole app.
// The URL and key come from the .env file (Vite exposes variables that start with VITE_).
// The publishable/anon key is safe to ship to the browser: Row Level Security
// in the database decides what each user can actually read or change.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
