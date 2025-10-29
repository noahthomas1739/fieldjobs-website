// app/api/debug-webhook/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.text()
    const headers = Object.fromEntries(request.headers.entries())
    
    console.log('🔍 WEBHOOK DEBUG - Headers:', headers)
    console.log('🔍 WEBHOOK DEBUG - Body:', body)
    
    // Try to parse as JSON
    let parsedBody
    try {
      parsedBody = JSON.parse(body)
      console.log('🔍 WEBHOOK DEBUG - Parsed Body:', JSON.stringify(parsedBody, null, 2))
    } catch (parseError) {
      console.log('🔍 WEBHOOK DEBUG - Could not parse body as JSON:', parseError.message)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook debug info logged to console',
      headers: Object.keys(headers),
      bodyLength: body.length,
      hasJsonBody: !!parsedBody
    })
    
  } catch (error) {
    console.error('❌ Webhook debug error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Debug failed', 
      details: error.message 
    }, { status: 500 })
  }
}
