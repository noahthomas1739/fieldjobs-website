import { createSupabaseRouteClient } from '@/lib/supabase-server'
import { ensureProfileRow } from '@/lib/profile'
import { NextResponse } from 'next/server'


export async function GET(request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('has_used_free_job')
      .eq('id', userId)
      .single()

    // Defensive fix for the "profiles row missing" bug - create one on the
    // fly instead of reporting ineligible/not-found for a user who simply
    // never got a profiles row (see lib/profile.js for the root-cause
    // writeup).
    if (profileError?.code === 'PGRST116') {
      console.log('⚠️ No profiles row found for', userId, '- creating one before giving up')
      try {
        const { data: { user: sessionUser } } = await supabase.auth.getUser()
        await ensureProfileRow(supabase, sessionUser?.id === userId ? sessionUser : { id: userId, email: null })
      } catch (err) {
        console.log('⚠️ Could not create profiles row:', err?.message)
      }
      ;({ data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('has_used_free_job')
        .eq('id', userId)
        .single())
    }

    if (profileError) {
      console.error('Error checking profile:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isEligible = !profile.has_used_free_job

    return NextResponse.json({
      success: true,
      eligible: isEligible,
      reason: isEligible ? 'Eligible for free job' : 'User has already used free job'
    })

  } catch (error) {
    console.error('Error checking free job eligibility:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
