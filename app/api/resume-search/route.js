// app/api/resume-search/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { searchParams } = new URL(request.url)
    
    // Extract search parameters
    const keywords = searchParams.get('keywords') || ''
    const location = searchParams.get('location') || ''
    const classification = searchParams.get('classification') || ''

    console.log('🔍 Resume search parameters:', { keywords, location, classification })

    // Build the query - search profiles table for job seekers with resumes
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('account_type', 'job_seeker')
      .not('resume_url', 'is', null) // Only profiles with resumes uploaded
      .order('updated_at', { ascending: false })

    // Apply filters
    if (keywords) {
      // Search in multiple fields for keywords
      query = query.or(`first_name.ilike.%${keywords}%,last_name.ilike.%${keywords}%,specialization.ilike.%${keywords}%,skills.ilike.%${keywords}%,bio.ilike.%${keywords}%`)
    }

    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    if (classification) {
      query = query.eq('classification', classification)
    }

    // Execute query with limit
    const { data: profiles, error } = await query.limit(50)

    if (error) {
      console.error('❌ Resume search error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to search resumes: ' + error.message 
      }, { status: 500 })
    }

    console.log(`✅ Found ${profiles?.length || 0} matching profiles`)

    return NextResponse.json({
      success: true,
      profiles: profiles || [],
      count: profiles?.length || 0
    })

  } catch (error) {
    console.error('❌ Resume search server error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error during resume search' 
    }, { status: 500 })
  }
}