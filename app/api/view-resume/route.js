import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { searchParams } = new URL(request.url)
    const applicantUserId = searchParams.get('userId')
    const employerId = searchParams.get('employerId')
    const jobId = searchParams.get('jobId') // Optional: if viewing from application
    
    if (!applicantUserId || !employerId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Check if employer is viewing from their own job application (FREE)
    let isFreeAccess = false
    if (jobId) {
      const { data: application } = await supabase
        .from('applications')
        .select('*, jobs!inner(*)')
        .eq('user_id', applicantUserId)
        .eq('job_id', jobId)
        .eq('jobs.user_id', employerId)
        .single()
      
      if (application) {
        isFreeAccess = true
      }
    }
    
    // If not free access, check if already unlocked OR deduct a token
    if (!isFreeAccess) {
      // Check if already unlocked
      const { data: existingUnlock } = await supabase
        .from('resume_unlocks')
        .select('*')
        .eq('employer_id', employerId)
        .eq('applicant_id', applicantUserId)
        .single()
      
      if (!existingUnlock) {
        // Check employer has credits
        const { data: employer } = await supabase
          .from('profiles')
          .select('resume_credits')
          .eq('id', employerId)
          .single()
        
        if (!employer || employer.resume_credits < 1) {
          return NextResponse.json({ error: 'Insufficient resume credits' }, { status: 403 })
        }
        
        // Deduct credit and record unlock
        const { error: deductError } = await supabase
          .from('profiles')
          .update({ resume_credits: employer.resume_credits - 1 })
          .eq('id', employerId)
        
        if (deductError) throw deductError
        
        // Record the unlock
        await supabase
          .from('resume_unlocks')
          .insert({
            employer_id: employerId,
            applicant_id: applicantUserId,
            created_at: new Date().toISOString()
          })
      }
    }
    
    // Get the resume file path
    const { data: profile } = await supabase
      .from('profiles')
      .select('resume_url')
      .eq('id', applicantUserId)
      .single()
    
    if (!profile?.resume_url) {
      return NextResponse.json({ error: 'No resume found' }, { status: 404 })
    }
    
    // Extract filename from URL
    const urlParts = profile.resume_url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    // Get the file from storage using service role (bypasses RLS)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(`${applicantUserId}/${fileName}`)
    
    if (downloadError) {
      console.error('Download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download resume' }, { status: 500 })
    }
    
    // Return the file
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
    
  } catch (error) {
    console.error('Resume viewing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
