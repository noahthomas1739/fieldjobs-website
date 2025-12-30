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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (!profile || profile.account_type !== 'employer') {
      return NextResponse.json({ error: 'Access denied - employers only' }, { status: 403 })
    }

    // Get the resume URL from query parameters
    const { searchParams } = new URL(request.url)
    const resumeUrl = searchParams.get('url')
    
    if (!resumeUrl) {
      return NextResponse.json({ error: 'Resume URL is required' }, { status: 400 })
    }

    // Encode the resume URL for Google Docs Viewer
    const encodedUrl = encodeURIComponent(resumeUrl)
    
    // Google Docs Viewer URL - displays PDFs and Word docs without download option
    const viewerUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=false`

    // Redirect to the Google Docs Viewer
    return NextResponse.redirect(viewerUrl)

  } catch (error) {
    console.error('View resume error:', error)
    return NextResponse.json({ error: 'Failed to open resume' }, { status: 500 })
  }
}

