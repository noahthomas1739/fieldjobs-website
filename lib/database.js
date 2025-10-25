import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

// Get or create user profile - FIXED to match actual schema
export async function getOrCreateProfile(user) {
  try {
    // First, try to get existing profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      return { data: profile, error: null }
    }

    // If no profile exists, create one - REMOVED email field
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        account_type: 'employer',
        first_name: user.user_metadata?.first_name || user.email.split('@')[0],
        last_name: user.user_metadata?.last_name || '',
        company_name: user.user_metadata?.company_name || ''
      })
      .select()
      .single()

    return { data: newProfile, error: createError }
  } catch (error) {
    console.error('Error with profile:', error)
    return { data: null, error }
  }
}

// Get user subscription
export async function getUserSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no subscription exists, create a free one
    if (!data) {
      const { data: newSub, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'free',
          status: 'active',
          credits: 0,
          jobs_posted: 0,
          price: 0
        })
        .select()
        .single()

      return { data: newSub, error: createError }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error getting subscription:', error)
    return { data: null, error }
  }
}

// Get user's jobs
export async function getUserJobs(userId) {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    console.error('Error getting jobs:', error)
    return { data: [], error }
  }
}

// Create a new job - FIXED job_type constraint
export async function createJob(userId, jobData) {
  try {
    console.log('Creating job with data:', jobData)
    
    // Calculate expiry date (30 days from now)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        employer_id: userId,
        title: jobData.title,
        company: jobData.company,
        location: jobData.region,
        salary_range: jobData.hourlyRate,
        job_type: jobData.jobType || 'in-house', // CHANGED: Use 'in-house' as default
        category: jobData.primaryIndustry,
        description: `Duration: ${jobData.duration || 'Not specified'}
Industry: ${jobData.primaryIndustry}${jobData.secondaryIndustry ? ` / ${jobData.secondaryIndustry}` : ''}
Classification: ${jobData.classification || 'Not specified'}
Discipline: ${jobData.discipline || 'Not specified'}
Per Diem: ${jobData.perDiem || 'Not specified'}
Travel: ${jobData.travel || 'Not specified'}%
Overtime: ${jobData.overtime || 'Not specified'}

${jobData.description}`,
        contact_email: jobData.contactEmail,
        expiry_date: expiryDate.toISOString(),
        payment_type: jobData.paymentType || 'free',
        cost_description: jobData.costDescription || 'Free (First Job)',
        status: 'active',
        active: true
      })
      .select()
      .single()

    console.log('Job creation result:', { data, error })
    return { data, error }
  } catch (error) {
    console.error('Error creating job:', error)
    return { data: null, error }
  }
}

// Update job status
export async function updateJobStatus(jobId, status, deactivatedDate = null) {
  try {
    const updateData = { 
      status,
      active: status === 'active'
    }

    if (deactivatedDate) {
      updateData.deactivated_date = deactivatedDate
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error updating job status:', error)
    return { data: null, error }
  }
}

// Update subscription
export async function updateSubscription(userId, subscriptionData) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error updating subscription:', error)
    return { data: null, error }
  }
}

// Check for expired jobs and update them
export async function checkExpiredJobs(userId) {
  try {
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('jobs')
      .update({ 
        status: 'expired',
        active: false 
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('expiry_date', now)
      .not('payment_type', 'eq', 'subscription')
      .select()

    return { data: data || [], error }
  } catch (error) {
    console.error('Error checking expired jobs:', error)
    return { data: [], error }
  }
}
