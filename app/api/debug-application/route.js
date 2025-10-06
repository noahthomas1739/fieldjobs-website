import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    // Test query to see what's in the applications table
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applicant_id,
        job_id,
        jobs!inner(id, title, employer_id)
      `)
      .limit(5)

    if (error) {
      return NextResponse.json({
        error: 'Database error',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Debug info',
      applications: applications,
      count: applications?.length || 0
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
