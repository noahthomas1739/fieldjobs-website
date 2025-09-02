import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.SMTP_PASS,
  },
})

export const sendJobExpirationWarning = async (employerEmail, jobTitle, daysLeft) => {
  const subject = `⚠️ Your job "${jobTitle}" expires in ${daysLeft} days`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ff6b35; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; color: white;">Job Expiration Warning</h2>
      </div>
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
        <p>Hi there,</p>
        <p>Your job posting <strong>"${jobTitle}"</strong> will expire in <strong>${daysLeft} days</strong>.</p>
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">⚡ Keep Your Job Active</h4>
          <p style="margin-bottom: 0;">To continue receiving applications:</p>
          <ul style="margin: 10px 0;">
            <li><strong>Upgrade to a subscription plan</strong> for unlimited 30-day job postings</li>
            <li><strong>Pay $79</strong> to extend this job for another 30 days</li>
            <li><strong>Repost for free</strong> after it expires (but you'll lose current applications)</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/employer?tab=billing" 
             style="background-color: #ff6b35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Manage Your Job
          </a>
        </div>
        <p style="color: #6c757d; font-size: 14px;">
          Best regards,<br>
          The FieldJobs Team
        </p>
      </div>
    </div>
  `
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: employerEmail,
      subject,
      html,
    })
    console.log(`✅ Expiration warning sent to ${employerEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending expiration warning:', error)
    return { success: false, error }
  }
}

export const sendNewApplicationNotification = async (employerEmail, applicantName, jobTitle, applicationId) => {
  const subject = `🎉 New Application: ${applicantName} applied to ${jobTitle}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; color: white;">🎉 New Job Application!</h2>
      </div>
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
        <p>Great news! You've received a new application for one of your job postings.</p>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p style="margin: 5px 0;"><strong>Applicant:</strong> ${applicantName}</p>
          <p style="margin: 5px 0;"><strong>Job:</strong> ${jobTitle}</p>
          <p style="margin: 5px 0;"><strong>Applied:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/employer?tab=applications" 
             style="background-color: #ff6b35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Review Application
          </a>
        </div>
        <p style="color: #6c757d; font-size: 14px;">
          Best regards,<br>
          The FieldJobs Team
        </p>
      </div>
    </div>
  `
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: employerEmail,
      subject,
      html,
    })
    console.log(`✅ Application notification sent to ${employerEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending application notification:', error)
    return { success: false, error }
  }
}

// Test email function
export const sendTestEmail = async (toEmail) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: toEmail,
      subject: 'FieldJobs Email Test',
      html: '<p>✅ Your email setup is working correctly!</p>',
    })
    console.log(`✅ Test email sent to ${toEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending test email:', error)
    return { success: false, error }
  }
}