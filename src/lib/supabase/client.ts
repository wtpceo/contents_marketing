import { createBrowserClient } from '@supabase/ssr'

// NOTE: DB 스키마 적용 후 Database 타입 활성화
// import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
