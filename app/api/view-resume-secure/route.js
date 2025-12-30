// app/api/view-resume-secure/route.js
// Opens resumes in Google Docs Viewer (read-only, no download)

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    // Check user metadata first (most reliable), then fall back to profiles table
    const userMetadata = user.user_metadata
    let isEmployer = userMetadata?.account_type === 'employer'
    
    // If not found in metadata, check profiles table
    if (!isEmployer) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single()
      
      isEmployer = profile?.account_type === 'employer'
    }

    if (!isEmployer) {
      return NextResponse.json({ error: 'Access denied - employers only' }, { status: 403 })
    }

    // Get the resume URL from query parameters
    const { searchParams } = new URL(request.url)
    const resumeUrl = searchParams.get('url')
    
    if (!resumeUrl) {
      return NextResponse.json({ error: 'Resume URL is required' }, { status: 400 })
    }

    // Redirect to our custom secure viewer page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://field-jobs.co'
    const viewerUrl = `${baseUrl}/resume-viewer?url=${encodeURIComponent(resumeUrl)}`

    // Redirect to our secure viewer
    return NextResponse.redirect(viewerUrl)

  } catch (error) {
    console.error('View resume error:', error)
    return NextResponse.json({ error: 'Failed to open resume' }, { status: 500 })
  }
}

