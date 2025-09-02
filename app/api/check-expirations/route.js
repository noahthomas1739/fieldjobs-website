import { createClient } from '@supabase/supabase-js'
import { sendJobExpirationWarning } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST() {
  try {
    const today = new Date()
    
    // Get all active jobs from free users
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        created_at,
        employer_id,
        profiles!inner(email, plan_type)
      `)
      .eq('status', 'active')
      .eq('profiles.plan_type', 'free')
    
    if (error) {
      console.error('Error fetching jobs:', error)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }
    
    let emailsSent = 0
    
    for (const job of jobs || []) {
      const jobCreated = new Date(job.created_at)
      const daysActive = Math.floor((today - jobCreated) / (1000 * 60 * 60 * 24))
      const daysLeft = 30 - daysActive
      
      // Send email 7 days before expiration AND 1 day before expiration
      if (daysLeft === 7 || daysLeft === 1) {
        await sendJobExpirationWarning(
          job.profiles.email,
          job.title,
          daysLeft
        )
        emailsSent++
        console.log(`📧 Warning sent: ${job.title} expires in ${daysLeft} days`)
      }
    }
    
    return Response.json({ 
      success: true, 
      message: `Sent ${emailsSent} expiration warnings`,
      emailsSent 
    })
  } catch (error) {
    console.error('Error in expiration check:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}