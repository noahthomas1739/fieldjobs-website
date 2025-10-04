import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Function to trigger first application prompt for free jobs
const triggerFirstApplicationPrompt = async (jobId, employerId) => {
  try {
    console.log(`🔔 Checking if first application prompt needed for job ${jobId}`)
    
    // Check if job is a free job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('is_free_job, title, employer_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Error fetching job for prompt:', jobError)
      return
    }

    if (!job.is_free_job) {
      console.log('Job is not a free job, skipping prompt')
      return
    }

    // Check if this is the first application
    const { data: existingApplications, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)

    if (appError) {
      console.error('Error checking existing applications:', appError)
      return
    }

    const applicationCount = existingApplications?.length || 0
    console.log(`📊 Application count for job ${jobId}: ${applicationCount}`)

    if (applicationCount === 1) { // This is the first application
      // Check if prompt already exists
      const { data: existingPrompt, error: promptError } = await supabase
        .from('upgrade_prompts')
        .select('id')
        .eq('job_id', jobId)
        .eq('prompt_type', 'first_application')
        .single()

      if (promptError && promptError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing prompt:', promptError)
        return
      }

      if (!existingPrompt) {
        // Create first application prompt
        const { error: insertError } = await supabase
          .from('upgrade_prompts')
          .insert({
            user_id: employerId,
            job_id: jobId,
            prompt_type: 'first_application',
            triggered_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Error creating upgrade prompt:', insertError)
        } else {
          console.log(`✅ Created first application prompt for job ${jobId}`)
        }
      }
    }
  } catch (error) {
    console.error('Error in triggerFirstApplicationPrompt:', error)
  }
}

export async function GET(request) {
  try {
    console.log('🔍 Applications API called')
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const employerId = searchParams.get('employerId')

    console.log('📋 Parameters:', { userId, employerId })

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    if (!userId && !employerId) {
      return NextResponse.json(
        { error: 'User ID or Employer ID required' },
        { status: 400 }
      )
    }

    let applications = []

    if (userId) {
      console.log('👤 Fetching applications for job seeker:', userId)
      
      // Use correct column name: applicant_id
      const { data: userApps, error: userError } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner(id, title, company, employer_id, status)
        `)
        .eq('applicant_id', userId)
        .order('applied_at', { ascending: false })

      if (userError) {
        console.error('❌ Error fetching user applications:', userError)
        return NextResponse.json({
          error: 'Failed to fetch user applications',
          details: userError.message
        }, { status: 500 })
      }

      applications = userApps || []
      console.log('📊 Found', applications.length, 'applications for user')

    } else if (employerId) {
      console.log('🏢 Fetching applications for employer:', employerId)
      
      // Get applications for employer's jobs using employer_id
      const { data: employerApps, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner(id, title, company, employer_id, status)
        `)
        .eq('jobs.employer_id', employerId)
        .order('applied_at', { ascending: false })

      if (appsError) {
        console.error('❌ Error fetching employer applications:', appsError)
        return NextResponse.json({
          error: 'Failed to fetch employer applications',
          details: appsError.message
        }, { status: 500 })
      }

      applications = employerApps || []
      console.log('📊 Found', applications.length, 'applications for employer')
    }

    console.log('✅ Applications fetched successfully')

    return NextResponse.json({
      success: true,
      applications: applications,
      count: applications.length
    })

  } catch (error) {
    console.error('💥 Unexpected error in applications API:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    console.log('📝 Creating new application')
    
    const { jobId, userId, firstName, lastName, email, phone, classification } = await request.json()

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    if (!jobId || !userId || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user has already applied to this job using correct column name
    const { data: existingApplication, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', userId) // Using correct column name
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing application:', checkError)
      return NextResponse.json(
        { error: 'Database error while checking application' },
        { status: 500 }
      )
    }

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 409 }
      )
    }

    // Get job details including employer_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company, employer_id, is_free_job')
      .eq('id', jobId)
      .single()

    if (jobError) {
      console.error('Error fetching job:', jobError)
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Create the application with correct schema
    const applicationData = {
      job_id: jobId,
      applicant_id: userId, // Using correct column name
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      classification: classification || '',
      status: 'pending',
      applied_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single()

    if (applicationError) {
      console.error('Error creating application:', applicationError)
      return NextResponse.json(
        { error: 'Failed to submit application',
          details: applicationError.message },
        { status: 500 }
      )
    }

    console.log('✅ Application created successfully')

    // Trigger first application prompt for free jobs
    if (job.is_free_job && job.employer_id) {
      await triggerFirstApplicationPrompt(jobId, job.employer_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        job_title: job.title,
        company: job.company,
        applied_at: application.applied_at
      }
    })

  } catch (error) {
    console.error('Error submitting application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    console.log('🔄 Updating application status')
    
    const { applicationId, status, userId } = await request.json()

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    if (!applicationId || !status || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: applicationId, status, userId' },
        { status: 400 }
      )
    }

    // Verify the application belongs to the employer
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select(`
        *,
        jobs!inner(employer_id)
      `)
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      console.error('Error fetching application:', fetchError)
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Check if user is the employer of the job
    if (application.jobs.employer_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update applications for your jobs' },
        { status: 403 }
      )
    }

    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('applications')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating application status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update application status' },
        { status: 500 }
      )
    }

    console.log('✅ Application status updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Application status updated successfully',
      application: updatedApplication
    })

  } catch (error) {
    console.error('Error updating application status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}