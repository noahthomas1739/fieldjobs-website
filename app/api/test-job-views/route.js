import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    console.log('🔍 Testing job_views table...')

    // Test if job_views table exists and has data
    const { data: views, error: viewsError } = await supabase
      .from('job_views')
      .select('*')
      .limit(5)
    
    if (viewsError) {
      console.error('❌ Job views table error:', viewsError)
      return Response.json({ 
        success: false, 
        error: viewsError.message,
        code: viewsError.code,
        details: viewsError.details
      })
    }

    console.log('✅ Job views table accessible, found', views?.length || 0, 'records')
    
    return Response.json({ 
      success: true, 
      count: views?.length || 0,
      sample: views?.slice(0, 3) || []
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
