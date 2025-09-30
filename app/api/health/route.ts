import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const start = Date.now()
    
    // Test database connection
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (error) {
      throw error
    }
    
    const dbLatency = Date.now() - start
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'up',
          latency: `${dbLatency}ms`,
        },
        api: {
          status: 'up',
          latency: `${Date.now() - start}ms`,
        },
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: process.env.NODE_ENV,
      },
      { status: 503 }
    )
  }
}
