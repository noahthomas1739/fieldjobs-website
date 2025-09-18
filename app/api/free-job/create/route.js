import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    console.log('🚀 Free job creation started')
    
    const body = await request.json()
    console.log('📝 Request body:', JSON.stringify(body, null, 2))
    
    const { userId, jobData } = body

    if (!userId) {
      console.error('❌ Missing userId')
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!jobData) {
      console.error('❌ Missing jobData')
      return NextResponse.json({ error: 'Job data is required' }, { status: 400 })
    }

    const requiredFields = ['title', 'company', 'description']
    const missingFields = requiredFields.filter(field => !jobData[field])
    
    if (missingFields.length > 0) {
      console.error('❌ Missing job fields:', missingFields)
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 })
    }

    console.log('✅ Input validation passed')

    // Check user eligibility
    console.log('🔍 Checking user eligibility...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('has_used_free_job, id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile lookup error:', profileError)
      return NextResponse.json({ 
        error: 'User not found or database error',
        details: profileError.message 
      }, { status: 404 })
    }

    console.log('👤 Profile found:', profile)

    if (profile.has_used_free_job) {
      console.error('❌ User already used free job')
      return NextResponse.json({ 
        error: 'You have already used your free job posting' 
      }, { status: 403 })
    }

    console.log('✅ User is eligible for free job')

    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + 30)
    console.log('📅 Expiration date:', expirationDate.toISOString())

    // Helper function to get valid job type
    const getValidJobType = (inputJobType) => {
      const validJobTypes = ['in-house', 'project-hire']
      
      if (!inputJobType) return 'in-house'
      
      const lowerInput = inputJobType.toLowerCase()
      
      if (validJobTypes.includes(lowerInput)) {
        return lowerInput
      }
      
      const mappings = {
        'full time': 'in-house',
        'full-time': 'in-house', 
        'fulltime': 'in-house',
        'permanent': 'in-house',
        'employee': 'in-house',
        'staff': 'in-house',
        'contract': 'project-hire',
        'contractor': 'project-hire',
        'freelance': 'project-hire',
        'project': 'project-hire',
        'temp': 'project-hire',
        'temporary': 'project-hire',
        'part time': 'project-hire',
        'part-time': 'project-hire'
      }
      
      return mappings[lowerInput] || 'in-house'
    }

    // Helper function to get valid payment type (based on your database constraint)
    const getValidPaymentType = (inputPaymentType) => {
      // Your database only allows these pricing model values
      const validPaymentTypes = ['free', 'single', 'sub']
      
      if (!inputPaymentType) return 'single' // Default fallback for regular jobs
      
      const lowerInput = inputPaymentType.toLowerCase()
      
      // Direct match
      if (validPaymentTypes.includes(lowerInput)) {
        return lowerInput
      }
      
      // For free jobs, always use 'free'
      // For regular paid jobs, use 'single' (one-time payment)
      // For subscription-based jobs, use 'sub'
      const mappings = {
        'free': 'free',
        'single': 'single',
        'sub': 'sub',
        'subscription': 'sub',
        'one-time': 'single',
        'onetime': 'single',
        'once': 'single',
        'pay-per-post': 'single',
        'per-post': 'single'
      }
      
      return mappings[lowerInput] || 'single' // Default to single payment
    }

    // Prepare job data with multiple fallback attempts
    const baseJobData = {
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      employer_id: userId,
      is_free_job: true,
      free_job_expires_at: expirationDate.toISOString(),
      status: 'active',
      active: true,
      created_at: new Date().toISOString(),
      contact_email: jobData.contactEmail || jobData.contact_email || '',
      hourly_rate: jobData.hourlyRate || jobData.hourly_rate || jobData.salary_range || 'Competitive',
      region: jobData.region || jobData.location || '',
      primary_industry: jobData.industry || jobData.primary_industry || jobData.category || 'Technical',
      cost_description: jobData.cost_description || '',
      views: 0,
      urgent: false,
      high_pay: false,
      popular: false,
      is_featured: false,
      is_urgent: false
    }

    // Multiple attempts with different valid values
    const attemptConfigurations = [
      {
        job_type: getValidJobType(jobData.job_type || jobData.jobType),
        payment_type: 'free' // Since this is a free job, use 'free' payment type
      },
      {
        job_type: 'in-house',
        payment_type: 'free'
      },
      {
        job_type: 'project-hire', 
        payment_type: 'free'
      },
      {
        job_type: 'in-house',
        payment_type: 'single' // Fallback to single payment
      },
      {
        job_type: 'project-hire',
        payment_type: 'single'
      }
    ]

    let finalJob = null
    let lastError = null

    for (let i = 0; i < attemptConfigurations.length; i++) {
      const config = attemptConfigurations[i]
      const jobInsertData = { ...baseJobData, ...config }
      
      console.log(`💼 Attempt ${i + 1}: Creating job with data:`, JSON.stringify(jobInsertData, null, 2))

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert(jobInsertData)
        .select()
        .single()

      if (jobError) {
        console.error(`❌ Attempt ${i + 1} failed:`, jobError)
        lastError = jobError
        
        // If this is a constraint error, continue to next attempt
        if (jobError.code === '23514') {
          console.log(`🔄 Constraint error, trying next configuration...`)
          continue
        } else {
          // If it's not a constraint error, this is a different problem
          return NextResponse.json({ 
            error: 'Failed to create job posting',
            details: jobError.message,
            hint: jobError.hint
          }, { status: 500 })
        }
      } else {
        console.log(`✅ Job created successfully on attempt ${i + 1}:`, job)
        finalJob = job
        break
      }
    }

    // If all attempts failed
    if (!finalJob) {
      console.error('❌ All job creation attempts failed. Last error:', lastError)
      return NextResponse.json({ 
        error: 'Failed to create job posting - all configurations failed',
        details: lastError?.message || 'Unknown database constraint error',
        hint: 'Please check database constraints for job_type and payment_type fields'
      }, { status: 500 })
    }

    // Update user profile to mark free job as used
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ has_used_free_job: true })
      .eq('id', userId)

    if (updateError) {
      console.error('⚠️ Profile update error (job still created):', updateError)
    } else {
      console.log('✅ User profile updated')
    }

    console.log('🎉 Free job creation completed successfully')

    return NextResponse.json({
      success: true,
      job: finalJob,
      expiresAt: expirationDate.toISOString(),
      message: 'Congratulations! Your first job is now posted FREE for 30 days!'
    })

  } catch (error) {
    console.error('💥 Unexpected error in free job creation:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}