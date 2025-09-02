// /app/api/applied-jobs/route.js - Fixed format for dashboard
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    console.log('Fetching applied jobs for user:', userId)

    // Get applications for this user with job details
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        applied_at,
        created_at,
        status,
        first_name,
        last_name,
        email,
        phone,
        classification,
        jobs (
          id,
          title,
          company,
          region,
          hourly_rate,
          job_type,
          description
        )
      `)
      .eq('applicant_id', userId)
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching applied jobs:', error)
      return Response.json({ error: 'Failed to fetch applied jobs: ' + error.message }, { status: 500 })
    }

    console.log(`Found ${applications?.length || 0} applications for user ${userId}`)

    // Return in the format your dashboard expects
    return Response.json({ 
      success: true, 
      appliedJobs: applications || []
    })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}