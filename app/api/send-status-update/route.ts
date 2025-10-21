import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { render } from '@react-email/render'
import ApplicationStatusUpdateEmail from '@/emails/ApplicationStatusUpdate'

const sgMail = require('@sendgrid/mail')

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { applicationId, newStatus } = await request.json()

    if (!applicationId || !newStatus) {
      return NextResponse.json(
        { error: 'Application ID and status required' },
        { status: 400 }
      )
    }

    // Don't send emails for 'submitted' status (that's handled by send-application-emails)
    if (newStatus === 'submitted') {
      return NextResponse.json({ 
        success: true, 
        message: 'No email sent for submitted status' 
      })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get application details
    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          title,
          company
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

    // Send status update email
    if (process.env.SENDGRID_API_KEY && applicantEmail) {
      try {
        const statusHtml = render(
          ApplicationStatusUpdateEmail({
            applicantName,
            jobTitle,
            company,
            status: newStatus,
            dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://field-jobs.co'}/dashboard`
          })
        )

        const statusTitles: Record<string, string> = {
          shortlisted: 'You\'ve Been Shortlisted',
          interviewed: 'Interview Scheduled',
          rejected: 'Application Update',
          hired: 'Congratulations!',
        }

        await sgMail.send({
          to: applicantEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@field-jobs.co',
          subject: `${statusTitles[newStatus] || 'Application Update'}: ${jobTitle}`,
          html: statusHtml,
        })

        console.log('✅ Status update email sent to:', applicantEmail)
      } catch (emailError) {
        console.error('❌ Failed to send status update email:', emailError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Status update email sent' 
    })

  } catch (error) {
    console.error('Error sending status update email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

