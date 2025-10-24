const { Resend } = require('resend')

// Initialize Resend
let resend = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
  console.log('✅ Resend API key configured')
} else {
  console.log('⚠️ RESEND_API_KEY not found in environment variables')
}

async function sendEmail({
  to,
  subject,
  html,
  from = 'noreply@field-jobs.co',
  replyTo = 'support@field-jobs.co'
}) {
  try {
    if (!resend) {
      console.log('Resend not configured, email would be sent:', { to, subject })
      return { success: true, message: 'Email logged (Resend not configured)' }
    }

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      reply_to: replyTo
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully to:', to, 'ID:', data?.id)
    return { success: true, message: 'Email sent successfully', id: data?.id }
  } catch (error) {
    console.error('Email send failed:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code
    })
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to FieldJobs! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">FieldJobs</h1>
      </div>
        
        <div style="padding: 30px 20px;">
          <h2>Welcome, ${name}! 🎉</h2>
          
          <p>Thank you for joining FieldJobs, the premier platform for technical careers in energy, construction, and industrial sectors.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚀 Get Started:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Complete your profile</li>
              <li>Upload your resume</li>
              <li>Browse available positions</li>
              <li>Set up job alerts</li>
          </ul>
        </div>
          
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://field-jobs.co/dashboard" 
               style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Your Profile
            </a>
          </div>
          
          <p>If you have any questions, reply to this email or contact us at <a href="mailto:support@field-jobs.co">support@field-jobs.co</a>.</p>
          
          <p>Best regards,<br>The FieldJobs Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© ${new Date().getFullYear()} FieldJobs. All rights reserved.</p>
          <p>
            <a href="https://field-jobs.co/privacy" style="color: #666;">Privacy Policy</a> | 
            <a href="https://field-jobs.co/terms" style="color: #666;">Terms of Service</a>
        </p>
      </div>
    </div>
  `
  }),

  contactForm: (name, email, subject, message) => ({
    subject: `Contact Form: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">📧 New Contact Form Submission</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Contact Details:</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          
          <h3>Message:</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; white-space: pre-wrap;">
${message}
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>Sent from FieldJobs contact form at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    `
  }),

  jobApplication: (jobTitle, applicantName, employerName) => ({
    subject: `New Application: ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">💼 New Job Application</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Application Details:</h2>
          <p><strong>Position:</strong> ${jobTitle}</p>
          <p><strong>Applicant:</strong> ${applicantName}</p>
          <p><strong>Employer:</strong> ${employerName}</p>
          
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://field-jobs.co/employer" 
               style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Application
          </a>
        </div>
          
          <p style="font-size: 12px; color: #666;">
            Log in to your employer dashboard to review the full application and candidate details.
        </p>
      </div>
    </div>
  `
  }),

  passwordReset: (resetLink) => ({
    subject: 'Reset Your FieldJobs Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b35; margin: 0;">🔒 Password Reset</h1>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2>Reset Your Password</h2>
          
          <p>You requested a password reset for your FieldJobs account. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            This link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.
          </p>
          
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${resetLink}</span>
          </p>
        </div>
      </div>
    `
  })
}

module.exports = {
  sendEmail,
  emailTemplates
}