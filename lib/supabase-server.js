/**
 * Supabase server-side client for Next.js 15 App Router route handlers.
 *
 * @supabase/auth-helpers-nextjs is deprecated and incompatible with Next.js 15's
 * async cookies() API. This replaces createRouteHandlerClient() everywhere.
 *
 * Usage in a route handler:
 *   import { createSupabaseRouteClient } from '@/lib/supabase-server'
 *   export async function POST(request) {
 *     const supabase = await createSupabaseRouteClient()
 *     ...
 *   }
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client scoped to the current request's cookies.
 * Uses the ANON key + RLS — same trust level as createRouteHandlerClient().
 * Must be called inside an async route handler (await is required).
 */
export async function createSupabaseRouteClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Route handlers can't always set cookies (e.g. in middleware).
            // Ignore — reads still work correctly.
          }
        },
      },
    }
  )
}

/**
 * Determines whether an authenticated Supabase user is an employer account.
 *
 * Mirrors the multi-location client-side check used throughout the app (see
 * handleFreeJobClick in app/employers/page.tsx): checks user_metadata /
 * app_metadata first (no extra query needed), then falls back to the
 * `profiles.account_type` column for accounts where metadata isn't set but
 * the profiles row is (same fallback pattern already used in
 * app/api/secure-resume/route.js and app/api/view-resume-secure/route.js).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string, user_metadata?: Record<string, any>, app_metadata?: Record<string, any> }} user
 * @returns {Promise<boolean>}
 */
export async function isEmployerAccount(supabase, user) {
  if (!user?.id) return false

  const isEmployerFromMetadata =
    user.user_metadata?.account_type === 'employer' ||
    user.app_metadata?.account_type === 'employer' ||
    user.user_metadata?.accountType === 'employer'

  if (isEmployerFromMetadata) {
    return true
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  return profile?.account_type === 'employer'
}

/**
 * Creates a Supabase admin client with the service role key.
 * Bypasses RLS — only use for server-only operations that need elevated access.
 * Must be called inside an async route handler.
 */
export async function createSupabaseAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )
}
