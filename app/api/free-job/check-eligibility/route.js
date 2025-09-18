import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('has_used_free_job')
      .eq('id', userId)
      .single()

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
