import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message, honeypot } = body

    // Basic bot protection - honeypot field
    if (honeypot) {
      console.log('🤖 Bot detected, ignoring submission')
      return NextResponse.json({ success: true, message: 'Message sent' })
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Determine recipient based on subject
    let recipientEmail = 'support@field-jobs.co' // Default
    if (subject === 'Job Posting Issue' || subject === 'Partnership Opportunity') {
      recipientEmail = 'Employers@field-jobs.co'
    }

    // Send email using Resend
    try {
      const emailTemplate = emailTemplates.contactForm(name, email, subject, message)
      
      const result = await sendEmail({
        to: recipientEmail,
        from: 'noreply@field-jobs.co',
        replyTo: email, // Set reply-to to the actual sender
        subject: emailTemplate.subject,
        html: emailTemplate.html
      })
      
      if (result.success) {
        console.log('📧 Contact form email sent successfully:', result)
      } else {
        console.error('📧 Contact form email failed:', result)
      }
    } catch (emailError) {
      console.error('📧 Failed to send contact form email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
