import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the resume URL from query parameters
    const { searchParams } = new URL(request.url)
    const resumeUrl = searchParams.get('url')
    
    if (!resumeUrl) {
      return NextResponse.json({ error: 'Resume URL is required' }, { status: 400 })
    }

    // Check user metadata first, then profiles table
    const userMetadata = user.user_metadata
    let isEmployer = userMetadata?.account_type === 'employer'
    
    if (!isEmployer) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single()
      
      isEmployer = profile?.account_type === 'employer'
    }

    if (!isEmployer) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch the PDF from Supabase storage
    const response = await fetch(resumeUrl)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const pdfBuffer = await response.arrayBuffer()

    // Return the PDF with security headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="resume.pdf"', // inline prevents download
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block'
      }
    })

  } catch (error) {
    console.error('Error serving secure resume:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
