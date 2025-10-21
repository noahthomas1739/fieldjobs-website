import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { jobId, userId, userAgent, referrer } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    console.log('📊 Tracking job view:', { jobId, userId, userAgent, referrer })

    // Get client IP from headers
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    request.headers.get('cf-connecting-ip') || 
                    'unknown'

    // Create view record
    const { data: viewRecord, error: viewError } = await supabase
      .from('job_views')
      .insert({
        job_id: jobId,
        user_id: userId || null,
        ip_address: clientIP,
        user_agent: userAgent || null,
        referrer: referrer || null,
        viewed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (viewError) {
      console.error('❌ Error creating view record:', viewError)
      return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
    }

    console.log('✅ Job view tracked:', viewRecord.id)

    return NextResponse.json({ 
      success: true, 
      viewId: viewRecord.id 
    })

  } catch (error) {
    console.error('❌ Track job view error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
