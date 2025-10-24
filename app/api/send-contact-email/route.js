import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.Resend_API_KEY)

export async function POST(request) {
  try {
    const { name, email, subject, message, recipientEmail } = await request.json()

    // Create a more direct email that appears to come from the client
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">📧 Contact Form Submission</h1>
        </div>
        
        <div style="padding: 20px;">
          <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">📧 From: ${name} (${email})</h3>
            <p style="margin: 0; font-weight: bold; color: #1976d2;">Subject: ${subject}</p>
          </div>
          
          <h3>Message:</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; white-space: pre-wrap;">
${message}
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p><strong>To reply to this message, email:</strong> ${email}</p>
            <p>Sent from FieldJobs contact form at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    `

    // Try to send from the client's email (this might fail due to domain verification)
    try {
      const { data, error } = await resend.emails.send({
        from: `${name} <${email}>`,
        to: recipientEmail,
        subject: `Contact Form: ${subject}`,
        html: emailContent
      })

      if (error) {
        console.log('Failed to send from client email, falling back to noreply:', error)
        throw error
      }

      console.log('Email sent from client address:', data?.id)
      return NextResponse.json({ success: true, message: 'Email sent from client address' })

    } catch (error) {
      console.log('Falling back to noreply@field-jobs.co due to domain verification')
      
      // Fallback: send from noreply but with clear instructions
      const { data: fallbackData, error: fallbackError } = await resend.emails.send({
        from: 'noreply@field-jobs.co',
        to: recipientEmail,
        replyTo: email,
        subject: `[${name}] Contact Form: ${subject}`,
        html: emailContent
      })

      if (fallbackError) {
        console.error('Email send failed:', fallbackError)
        return NextResponse.json({ success: false, error: fallbackError.message }, { status: 500 })
      }

      console.log('Email sent from noreply with reply-to:', fallbackData?.id)
      return NextResponse.json({ success: true, message: 'Email sent with reply-to header' })
    }

  } catch (error) {
    console.error('Contact email error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
