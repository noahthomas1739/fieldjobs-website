import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, stack, context, timestamp } = body
    
    // Log the error (in production you might want to send to external service)
    console.error('Client Error Logged:', {
      message,
      stack,
      context,
      timestamp,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    })
    
    // You can integrate with external error tracking services here:
    // - Sentry
    // - LogRocket  
    // - Bugsnag
    // - DataDog
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in error logging:', error)
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    )
  }
}
