// app/api/resume-search/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract search parameters
    const keywords = searchParams.get('keywords') || ''
    const location = searchParams.get('location') || ''
    const classification = searchParams.get('classification') || ''
    const specialization = searchParams.get('specialization') || ''
    const minExperience = searchParams.get('minExperience') || ''
    const clearance = searchParams.get('clearance') || ''
    const minRate = searchParams.get('minRate') || ''

    console.log('🔍 Resume search parameters:', {
      keywords, location, classification, specialization, minExperience, clearance, minRate
    })

    // Build the query
    let query = supabase
      .from('job_seeker_profiles')
      .select('*')
      .eq('resume_uploaded', true) // Only show profiles with resumes
      .order('updated_at', { ascending: false })

    // Apply filters
    if (keywords) {
      // Search in multiple fields for keywords
      query = query.or(`first_name.ilike.%${keywords}%,last_name.ilike.%${keywords}%,specialization.ilike.%${keywords}%,certifications.ilike.%${keywords}%,skills.cs.{${keywords}}`)
    }

    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    if (classification) {
      query = query.eq('classification', classification)
    }

    if (specialization) {
      query = query.ilike('specialization', `%${specialization}%`)
    }

    if (minExperience) {
      query = query.gte('years_experience', parseInt(minExperience))
    }

    if (clearance === 'true') {
      query = query.eq('has_security_clearance', true)
    } else if (clearance === 'false') {
      query = query.eq('has_security_clearance', false)
    }

    if (minRate) {
      // Extract numeric value from rate string like "$50/hr"
      const rateMatch = minRate.match(/\d+/)
      if (rateMatch) {
        const rateNum = parseInt(rateMatch[0])
        query = query.ilike('desired_rate', `%${rateNum}%`)
      }
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

    console.log(`✅ Found ${profiles.length} matching profiles`)

    return NextResponse.json({
      success: true,
      profiles: profiles || [],
      count: profiles.length
    })

  } catch (error) {
    console.error('❌ Resume search server error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error during resume search' 
    }, { status: 500 })
  }
}