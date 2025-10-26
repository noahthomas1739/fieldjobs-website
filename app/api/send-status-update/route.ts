import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { render } from '@react-email/render'
import ApplicationStatusUpdateEmail from '@/emails/ApplicationStatusUpdate'
import ApplicationRejectedEmail from '@/emails/ApplicationRejected'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { applicationId, newStatus } = await request.json()

    if (!applicationId || !newStatus) {
      return NextResponse.json(
        { error: 'Application ID and status required' },
        { status: 400 }
      )
    }

    // Only send emails for specific status changes
    if (newStatus === 'submitted') {
      return NextResponse.json({ 
        success: true, 
        message: 'No email sent for submitted status' 
      })
    }

    // Only send rejection emails to applicants (per user request)
    if (newStatus !== 'rejected') {
      return NextResponse.json({ 
        success: true, 
        message: 'No email sent for this status change' 
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
    const appliedDate = new Date(application.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Send rejection email to applicant
    if (process.env.Resend_API_KEY && applicantEmail) {
      try {
        const rejectionHtml = await render(
          ApplicationRejectedEmail({
            applicantName,
            jobTitle,
            company,
            appliedDate,
            rejectionReason: undefined // Could be added later if needed
          })
        )

        await sendEmail({
          to: applicantEmail,
          from: 'noreply@field-jobs.co',
          subject: `Application Update: ${jobTitle} at ${company}`,
          html: rejectionHtml,
        })

        console.log('✅ Rejection email sent to applicant:', applicantEmail)
      } catch (emailError) {
        console.error('❌ Failed to send rejection email:', emailError)
      }
    } else {
      console.log('❌ Not sending rejection email - missing Resend API key or applicant email')
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

