import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { render } from '@react-email/render'
import ApplicationConfirmationEmail from '@/emails/ApplicationConfirmation'
import NewApplicationAlertEmail from '@/emails/NewApplicationAlert'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { applicationId } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 })
    }

    console.log('📧 Email API: Looking for application ID:', applicationId)

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Use service role to bypass RLS for email API
    const { createClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, let's verify the application exists with a simple count query using admin client
    const { count, error: countError } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('id', applicationId)

    if (countError) {
      console.error('❌ Error checking application count:', countError)
    } else {
      console.log('📧 Application count for ID:', applicationId, 'is:', count)
    }

    // Let's also check if there are any applications at all using admin client
    const { count: totalCount, error: totalCountError } = await supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })

    if (totalCountError) {
      console.error('❌ Error checking total applications:', totalCountError)
    } else {
      console.log('📧 Total applications in database:', totalCount)
    }

    // First, try to get just the application without joins using admin client
    console.log('📧 Email API: Fetching application without joins first...')
    const { data: simpleApplication, error: simpleError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (simpleError || !simpleApplication) {
      console.error('❌ Could not fetch application at all:', simpleError)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    console.log('✅ Found application:', simpleApplication.id)

    // Now try to get the full application with joins using admin client
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        jobs (
          id,
          title,
          company,
          user_id
        ),
        profiles!applications_applicant_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', applicationId)
      .single()

    let finalApplication = application

    if (error || !application) {
      console.error('❌ Error with joins, trying fallback approach:', error)
      
      // Fallback: fetch data separately using admin client
      const { data: jobData } = await supabaseAdmin
        .from('jobs')
        .select('id, title, company, user_id')
        .eq('id', simpleApplication.job_id)
        .single()
      
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', simpleApplication.applicant_id)
        .single()
      
      if (!jobData || !profileData) {
        console.error('❌ Could not fetch job or profile data')
        return NextResponse.json({ error: 'Could not fetch related data' }, { status: 404 })
      }
      
      // Create application object manually
      finalApplication = {
        ...simpleApplication,
        jobs: jobData,
        profiles: profileData
      }
      
      console.log('✅ Using fallback data approach')
    }

    const applicantName = `${finalApplication.profiles.first_name} ${finalApplication.profiles.last_name}`
    const applicantEmail = finalApplication.profiles.email
    const jobTitle = finalApplication.jobs.title
    const company = finalApplication.jobs.company
    const appliedDate = new Date(finalApplication.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Get employer details using admin client
    const { data: employerProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', finalApplication.jobs.user_id)
      .single()

    const employerName = employerProfile 
      ? `${employerProfile.first_name} ${employerProfile.last_name}`
      : 'Employer'
    const employerEmail = employerProfile?.email

    console.log('📧 Email Debug Info:')
    console.log('  - Resend API Key configured:', !!process.env.Resend_API_KEY)
    console.log('  - Applicant Email:', applicantEmail)
    console.log('  - Employer Email:', employerEmail)
    console.log('  - Applicant Name:', applicantName)
    console.log('  - Employer Name:', employerName)
    console.log('  - Job Title:', jobTitle)
    console.log('  - Company:', company)

    // Send confirmation email to applicant
    if (process.env.Resend_API_KEY && applicantEmail) {
      console.log('📧 Attempting to send confirmation email to:', applicantEmail)
      try {
        const confirmationHtml = await render(
          ApplicationConfirmationEmail({
            applicantName,
            jobTitle,
            company,
            appliedDate,
            jobUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://field-jobs.co'}/jobs/${finalApplication.jobs.id}`
          })
        )
        
        console.log('📧 Confirmation HTML type:', typeof confirmationHtml)
        console.log('📧 Confirmation HTML length:', confirmationHtml?.length)

        await sendEmail({
          to: applicantEmail,
          from: 'noreply@field-jobs.co',
          subject: `Application Submitted: ${jobTitle} at ${company}`,
          html: confirmationHtml,
        })

        console.log('✅ Confirmation email sent to applicant:', applicantEmail)
      } catch (emailError) {
        console.error('❌ Failed to send confirmation email:', emailError)
      }
    } else {
      console.log('❌ Not sending confirmation email - missing Resend API key or applicant email')
    }

    // Send alert email to employer
    if (process.env.Resend_API_KEY && employerEmail) {
      console.log('📧 Attempting to send alert email to employer:', employerEmail)
      try {
        const alertHtml = await render(
          NewApplicationAlertEmail({
            employerName,
            applicantName,
            jobTitle,
            appliedDate,
            dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://field-jobs.co'}/employer`
          })
        )
        
        console.log('📧 Alert HTML type:', typeof alertHtml)
        console.log('📧 Alert HTML length:', alertHtml?.length)

        await sendEmail({
          to: employerEmail,
          from: 'noreply@field-jobs.co',
          subject: `New Application: ${jobTitle}`,
          html: alertHtml,
        })

        console.log('✅ Alert email sent to employer:', employerEmail)
      } catch (emailError) {
        console.error('❌ Failed to send alert email:', emailError)
      }
    } else {
      console.log('❌ Not sending alert email - missing Resend API key or employer email')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Application emails sent' 
    })

  } catch (error) {
    console.error('Error sending application emails:', error)
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    )
  }
}

