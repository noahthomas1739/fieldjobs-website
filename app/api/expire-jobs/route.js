import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST() {
  try {
    const today = new Date()
    
    // Get all active jobs from free users
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        created_at,
        profiles!inner(plan_type)
      `)
      .eq('status', 'active')
      .eq('profiles.plan_type', 'free')
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }
    
    const jobsToExpire = []
    
    // Find jobs older than 30 days
    for (const job of jobs || []) {
      const jobCreated = new Date(job.created_at)
      const daysActive = Math.floor((today - jobCreated) / (1000 * 60 * 60 * 24))
      
      if (daysActive >= 30) {
        jobsToExpire.push(job.id)
      }
    }
    
    // Expire the jobs
    if (jobsToExpire.length > 0) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'expired' })
        .in('id', jobsToExpire)
      
      if (updateError) {
        console.error('Error expiring jobs:', updateError)
        return Response.json({ error: 'Update error' }, { status: 500 })
      }
      
      console.log(`✅ Expired ${jobsToExpire.length} jobs`)
    }
    
    return Response.json({ 
      success: true, 
      message: `Expired ${jobsToExpire.length} jobs`,
      expiredCount: jobsToExpire.length 
    })
  } catch (error) {
    console.error('Error in job expiration:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}