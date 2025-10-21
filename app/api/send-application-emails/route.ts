import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { render } from '@react-email/render'
import ApplicationConfirmationEmail from '@/emails/ApplicationConfirmation'
import NewApplicationAlertEmail from '@/emails/NewApplicationAlert'

const sgMail = require('@sendgrid/mail')

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { applicationId } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get application details with job and user info
    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          id,
          title,
          company,
          employer_id
        ),
        profiles!applications_applicant_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', applicationId)
      .single()

    if (error || !application) {
      console.error('Error fetching application:', error)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const applicantName = `${application.profiles.first_name} ${application.profiles.last_name}`
    const applicantEmail = application.profiles.email
    const jobTitle = application.jobs.title
    const company = application.jobs.company
    const appliedDate = new Date(application.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Get employer details
    const { data: employerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', application.jobs.employer_id)
      .single()

    const employerName = employerProfile 
      ? `${employerProfile.first_name} ${employerProfile.last_name}`
      : 'Employer'
    const employerEmail = employerProfile?.email

    // Send confirmation email to applicant
    if (process.env.SENDGRID_API_KEY && applicantEmail) {
      try {
        const confirmationHtml = render(
          ApplicationConfirmationEmail({
            applicantName,
            jobTitle,
            company,
            appliedDate,
            jobUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://field-jobs.co'}/jobs/${application.jobs.id}`
          })
        )

        await sgMail.send({
          to: applicantEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@field-jobs.co',
          subject: `Application Submitted: ${jobTitle} at ${company}`,
          html: confirmationHtml,
        })

        console.log('✅ Confirmation email sent to applicant:', applicantEmail)
      } catch (emailError) {
        console.error('❌ Failed to send confirmation email:', emailError)
      }
    }

    // Send alert email to employer
    if (process.env.SENDGRID_API_KEY && employerEmail) {
      try {
        const alertHtml = render(
          NewApplicationAlertEmail({
            employerName,
            applicantName,
            jobTitle,
            appliedDate,
            dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://field-jobs.co'}/employer`
          })
        )

        await sgMail.send({
          to: employerEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@field-jobs.co',
          subject: `New Application: ${jobTitle}`,
          html: alertHtml,
        })

        console.log('✅ Alert email sent to employer:', employerEmail)
      } catch (emailError) {
        console.error('❌ Failed to send alert email:', emailError)
      }
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

