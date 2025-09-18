import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const now = new Date()
    
    // Update expired free jobs to inactive status
    const { data: expiredJobs, error } = await supabase
      .from('jobs')
      .update({ 
        status: 'expired',
        active: false
      })
      .eq('is_free_job', true)
      .eq('active', true)
      .lte('free_job_expires_at', now.toISOString())
      .select('id, title, employer_id')

    if (error) {
      console.error('Error expiring free jobs:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`✅ Expired ${expiredJobs?.length || 0} free jobs`)

    return NextResponse.json({
      success: true,
      expiredCount: expiredJobs?.length || 0,
      message: `Expired ${expiredJobs?.length || 0} free jobs`
    })

  } catch (error) {
    console.error('Error in free job expiration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}