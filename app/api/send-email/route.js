import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.Resend_API_KEY)

export async function POST(request) {
  try {
    const { to, subject, message, fromEmail = 'support@field-jobs.co' } = await request.json()

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: to, subject, message' 
      }, { status: 400 })
    }

    // Determine the appropriate sender email based on context
    let senderEmail = 'support@field-jobs.co' // Default
    let senderName = 'FieldJobs Support'
    
    // You can customize this based on the email type
    if (subject.toLowerCase().includes('job') || subject.toLowerCase().includes('employer')) {
      senderEmail = 'Employers@field-jobs.co'
      senderName = 'FieldJobs Employer Support'
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">FieldJobs</h1>
        </div>
        
        <div style="padding: 20px;">
          <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">📧 From: ${senderName}</h3>
            <p style="margin: 0; font-weight: bold; color: #1976d2;">Subject: ${subject}</p>
          </div>
          
          <div style="white-space: pre-wrap; line-height: 1.6;">
${message}
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>Sent from FieldJobs at ${new Date().toLocaleString()}</p>
            <p>This email was sent from ${senderEmail}</p>
          </div>
        </div>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: to,
      subject: subject,
      html: emailContent
    })

    if (error) {
      console.error('Email send failed:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log('Email sent successfully:', data?.id)
    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      emailId: data?.id 
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
