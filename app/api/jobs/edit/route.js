// app/api/jobs/edit/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    console.log('✅ PUT route reached successfully')
    
    const { jobId, jobData, userId } = await request.json()
    console.log('📦 Request data:', { jobId, userId, jobDataKeys: Object.keys(jobData) })

    if (!jobId || !userId) {
      return NextResponse.json({ 
        error: 'Missing jobId or userId' 
      }, { status: 400 })
    }

    // Verify the job belongs to the user
    const { data: existingJob, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('employer_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Database fetch error:', fetchError)
      return NextResponse.json({ 
        error: 'Database error: ' + fetchError.message 
      }, { status: 500 })
    }

    if (!existingJob) {
      return NextResponse.json({ 
        error: 'Job not found or access denied' 
      }, { status: 404 })
    }

    // Prepare update data - only include columns that exist in database
    const updateData = {
      title: jobData.title,
      company: jobData.company,
      region: jobData.region,
      primary_industry: jobData.primaryIndustry,
      job_type: jobData.jobType,
      hourly_rate: jobData.hourlyRate,
      description: jobData.description,
      contact_email: jobData.contactEmail,
      updated_at: new Date().toISOString()
    }

    // Only update status if provided
    if (jobData.status) {
      updateData.status = jobData.status
      
      if (jobData.status === 'active') {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 30)
        updateData.expiry_date = expiryDate.toISOString()  // Use expiry_date not expires_at
      }
    }

    console.log('📝 Updating job with simplified data:', updateData)
    
    // Update the job in database
    const { data: updatedJob, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('employer_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Database update error:', error)
      return NextResponse.json({ 
        error: 'Failed to update job: ' + error.message
      }, { status: 500 })
    }

    console.log('✅ Job updated successfully:', updatedJob.id)

    return NextResponse.json({
      success: true,
      message: 'Job updated successfully',
      job: updatedJob
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try { {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    console.log('✅ PATCH route reached successfully')
    
    const { jobId, status, userId } = await request.json()
    console.log('📦 Status update data:', { jobId, status, userId })

    // Verify the job belongs to the user
    const { data: existingJob, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('employer_id', userId)
      .single()

    if (fetchError || !existingJob) {
      return NextResponse.json({ 
        error: 'Job not found or access denied' 
      }, { status: 404 })
    }

    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    }

    // Handle specific status changes
    if (status === 'active') {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 30)
      updateData.expiry_date = expiryDate.toISOString()  // Use expiry_date not expires_at
    } else if (status === 'expired') {
      updateData.expiry_date = new Date().toISOString()
    }

    // Update job status
    const { data: updatedJob, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('employer_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ 
        error: 'Failed to update job status: ' + error.message 
      }, { status: 500 })
    }

    console.log('✅ Job status updated successfully')

    return NextResponse.json({
      success: true,
      message: `Job ${status === 'active' ? 'activated' : status === 'paused' ? 'paused' : 'expired'} successfully`,
      job: updatedJob
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}