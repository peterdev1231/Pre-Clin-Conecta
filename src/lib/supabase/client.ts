import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types' // Assumindo que você tem este arquivo de tipos

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 