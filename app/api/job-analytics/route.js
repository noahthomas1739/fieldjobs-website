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
    
    console.log('🔍 Analytics: Looking for jobs for userId:', userId) 
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user's jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, created_at')
      .eq('employer_id', userId)
      .eq('is_active', true)
    
    console.log('🔍 Analytics: Found jobs:', jobs) 
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return Response.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    const analytics = {
      totalViews: 0,
      totalApplications: 0,
      activeJobs: jobs?.length || 0,
      jobDetails: []
    }
    
    for (const job of jobs || []) {
      console.log('🔍 Analytics: Processing job:', job.id, job.title)
      
      // Get application count for this job
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('id, created_at, status')
        .eq('job_id', job.id)
      
      if (appError) {
        console.error('Error fetching applications:', appError)
        continue
      }

      // Get view count for this job
      let jobViews = 0
      try {
        const { data: views, error: viewsError } = await supabase
          .from('job_views')
          .select('id, viewed_at')
          .eq('job_id', job.id)
        
        if (viewsError) {
          console.log('⚠️ Job views table not found or error:', viewsError.message)
          // If table doesn't exist, just use 0 views
          jobViews = 0
        } else {
          jobViews = views?.length || 0
          console.log('🔍 Analytics: Found views for job', job.id, ':', jobViews)
        }
      } catch (error) {
        console.log('⚠️ Job views table not available:', error.message)
        jobViews = 0
      }

      const jobApplications = applications?.length || 0

      analytics.totalViews += jobViews
      analytics.totalApplications += jobApplications
      
      analytics.jobDetails.push({
        jobId: job.id,
        jobTitle: job.title,
        views: jobViews,
        applications: jobApplications,
        applicationRate: jobViews > 0 ? Math.round((jobApplications / jobViews) * 100) : 0
      })
    }
    
    console.log('📊 Final analytics:', analytics)
    
    return Response.json({ 
      success: true, 
      analytics 
    })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}