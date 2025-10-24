import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function GET() {
  try {
    console.log('🧪 Testing SendGrid API...')
    
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email</p>'
    })
    
    console.log('🧪 Test result:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test completed',
      result 
    })
  } catch (error) {
    console.error('🧪 Test failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
