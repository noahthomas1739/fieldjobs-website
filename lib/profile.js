/**
 * Shared helper for making sure a `profiles` row exists for an
 * authenticated Supabase user.
 *
 * Root cause context ("profile not found" bug): this app has no reviewable,
 * app-level code path that creates a `profiles` row on signup. Several
 * routes (create-subscription, free-job/create, etc.) simply assume the row
 * already exists and hard-fail with a confusing 404 (Postgres error
 * PGRST116 - "no rows returned") when it doesn't. Whatever previously
 * created these rows for most users (most likely a Supabase database
 * trigger on `auth.users` that lives outside this repo and isn't reviewable
 * or testable here) evidently doesn't run for every signup path (e.g. some
 * OAuth signups, or a race between auth signup and whatever else creates
 * the row).
 *
 * Rather than depend on that opaque, unreviewable mechanism, this helper
 * lets application code explicitly guarantee the invariant itself. It's
 * intentionally framework/runtime agnostic (no `next/headers` or other
 * server-only imports) so it can be called from both client components
 * (signup/callback/account-type pages, using the browser Supabase client)
 * and server route handlers (using the server Supabase client) with
 * whichever Supabase client they already have.
 *
 * Safe to call on every request - uses `ignoreDuplicates` so it only ever
 * inserts a missing row and never overwrites an existing one.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string, email?: string | null, user_metadata?: Record<string, any>, app_metadata?: Record<string, any> }} user
 * @param {string} [accountTypeOverride] - use this account type instead of reading it from user metadata
 * @returns {Promise<boolean>} true if the upsert ran without error, false otherwise
 */
export async function ensureProfileRow(supabase, user, accountTypeOverride) {
  if (!supabase || !user?.id) return false

  const accountType =
    accountTypeOverride ||
    user.user_metadata?.account_type ||
    user.app_metadata?.account_type ||
    user.user_metadata?.accountType ||
    null

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email || null,
          ...(accountType ? { account_type: accountType } : {}),
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    if (error) {
      console.error('ensureProfileRow: failed to upsert profiles row for', user.id, error)
      return false
    }

    return true
  } catch (err) {
    console.error('ensureProfileRow: unexpected error for', user?.id, err)
    return false
  }
}
