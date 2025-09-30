import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

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

    // Send email to support team
    const emailTemplate = emailTemplates.contactForm(name, email, subject, message)
    const result = await sendEmail({
      to: 'support@field-jobs.co',
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      replyTo: email, // Allow direct reply to the person who contacted
    })

    if (!result.success) {
      console.error('Failed to send contact email:', result.error)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      )
    }

    // Send confirmation email to the person who contacted
    const confirmationResult = await sendEmail({
      to: email,
      subject: 'We received your message - FieldJobs Support',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #ff6b35; margin: 0;">✅ Message Received</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2>Thank you, ${name}!</h2>
            
            <p>We've received your message and will get back to you within 24-48 hours.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Your Message:</h3>
              <p><strong>Subject:</strong> ${subject}</p>
              <div style="margin-top: 10px; white-space: pre-wrap;">${message}</div>
            </div>
            
            <p>If you have any urgent questions, you can also reach us at <a href="mailto:support@field-jobs.co">support@field-jobs.co</a>.</p>
            
            <p>Best regards,<br>The FieldJobs Support Team</p>
          </div>
        </div>
      `,
    })

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
