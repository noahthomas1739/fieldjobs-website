import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters for filtering
    const userId = searchParams.get('userId') // Added for dashboard support
    const search = searchParams.get('search') || ''
    const region = searchParams.get('region') || ''
    const jobType = searchParams.get('jobType') || ''
    const industry = searchParams.get('industry') || ''
    const minSalary = searchParams.get('minSalary')
    const maxSalary = searchParams.get('maxSalary')
    const urgent = searchParams.get('urgent')
    const limit = parseInt(searchParams.get('limit')) || 50

    // Build the query - include new featured/urgent columns
    let query = supabase
      .from('jobs')
      .select('*, is_featured, featured_until, is_urgent, urgent_until')

    // Handle userId for dashboard vs public listings
    if (userId) {
      // For employer dashboard - get user's jobs regardless of status
      query = query.eq('employer_id', userId)
      // Sort by creation date for dashboard
      query = query.order('created_at', { ascending: false })
    } else {
      // For public listings - only active jobs
      query = query.eq('active', true)
      // Sort featured jobs first, then by creation date for public
      query = query
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
    }

    // Apply filters (only for public listings)
    if (!userId) {
      if (search) {
        query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`)
      }
      
      if (region) {
        query = query.eq('region', region)
      }
      
      if (jobType) {
        query = query.eq('job_type', jobType)
      }
      
      if (industry) {
        query = query.eq('primary_industry', industry)
      }
      
      if (urgent === 'true') {
        // Check both old urgent column and new is_urgent column
        query = query.or('urgent.eq.true,is_urgent.eq.true')
      }
    }
    
    // Apply limit
    query = query.limit(limit)

    const { data: jobs, error } = await query

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Database error: ' + error.message }, { status: 500 })
    }

    // Transform the data to match homepage format
    const now = new Date()
    const transformedJobs = jobs.map(job => {
      // Check if featured/urgent periods have expired
      const isFeaturedActive = job.is_featured && 
        (!job.featured_until || new Date(job.featured_until) > now)
      
      const isUrgentActive = job.is_urgent && 
        (!job.urgent_until || new Date(job.urgent_until) > now)

      // Build badges array including featured/urgent status
      const badges = []
      
      if (isFeaturedActive) badges.push('featured')
      if (isUrgentActive) badges.push('urgent')
      if (job.urgent && !isUrgentActive) badges.push('urgent') // Fallback to old urgent system
      if (job.high_priority) badges.push('high-pay')
      if (job.popular) badges.push('popular')

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        region: job.region,
        hourlyRate: job.hourly_rate,
        hourly_rate: job.hourly_rate, // Keep both for compatibility
        description: job.description,
        requirements: job.requirements || '', // Add for dashboard compatibility
        benefits: job.benefits || '', // Add for dashboard compatibility
        contactEmail: job.contact_email,
        contact_email: job.contact_email, // Keep both for compatibility
        contactPhone: job.contact_phone,
        contact_phone: job.contact_phone, // Keep both for compatibility
        jobType: job.job_type,
        primaryIndustry: job.primary_industry,
        type: job.primary_industry, // For filtering
        industry: job.primary_industry, // For dashboard compatibility
        classification: job.classification || 'intermediate', // Default for dashboard
        discipline: 'general', // Default since not in your schema
        duration: job.duration || '', // Add for dashboard compatibility
        start_date: job.start_date, // Add for dashboard compatibility
        startDate: job.start_date, // Keep both for compatibility
        postedDays: Math.floor((new Date() - new Date(job.created_at)) / (1000 * 60 * 60 * 24)),
        badges: badges,
        status: job.status,
        expiresAt: job.expiry_date,
        createdAt: job.created_at,
        created_at: job.created_at, // Keep both for compatibility
        location: job.region, // Fallback
        views: job.views || 0,
        employer_id: job.employer_id, // Add for dashboard compatibility
        // Add featured/urgent status for frontend
        isFeatured: isFeaturedActive,
        isUrgent: isUrgentActive,
        featuredUntil: job.featured_until,
        urgentUntil: job.urgent_until
      }
    })

    return Response.json({ 
      jobs: transformedJobs,
      success: true, // Add for dashboard compatibility
      total: transformedJobs.length,
      count: transformedJobs.length // Add for dashboard compatibility
    })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const jobData = await request.json()

    // Helper function to get valid job type
    function getValidJobType(inputJobType) {
      const validJobTypes = ['in-house', 'project-hire']
      
      if (!inputJobType) return 'project-hire' // Default
      
      const lowerInput = inputJobType.toLowerCase()
      
      // Direct match
      if (validJobTypes.includes(lowerInput)) {
        return lowerInput
      }
      
      // Map common variants to valid types
      const mappings = {
        'full time': 'in-house',
        'full-time': 'in-house', 
        'fulltime': 'in-house',
        'permanent': 'in-house',
        'employee': 'in-house',
        'staff': 'in-house',
        'contract': 'project-hire',
        'contractor': 'project-hire',
        'freelance': 'project-hire',
        'project': 'project-hire',
        'temp': 'project-hire',
        'temporary': 'project-hire',
        'part time': 'project-hire',
        'part-time': 'project-hire'
      }
      
      return mappings[lowerInput] || 'project-hire'
    }

    // Handle both formats (existing and dashboard)
    const {
      employerId,
      userId, // Dashboard format
      title,
      company,
      description,
      requirements,
      contactEmail,
      contactPhone,
      region,
      hourlyRate,
      duration,
      startDate,
      endDate, // Added for date handling
      applicationDeadline, // Added for date handling
      jobType,
      primaryIndustry,
      industry, // Dashboard format
      classification,
      benefits,
      urgent = false,
      highPriority = false,
      expiresAt,
      // New featured/urgent parameters
      isFeatured = false,
      featuredUntil = null,
      isUrgent = false,
      urgentUntil = null
    } = jobData

    // Use either employerId or userId
    const finalEmployerId = employerId || userId
    const finalIndustry = primaryIndustry || industry

    // Validate required fields
    if (!finalEmployerId || !title || !company || !description || !contactEmail || !region || !hourlyRate) {
      return Response.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert([{
        employer_id: finalEmployerId,
        title: title.trim(),
        company: company.trim(),
        description: description.trim(),
        requirements: requirements || '',
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone || '',
        region: region,
        hourly_rate: hourlyRate,
        duration: duration || '',
        start_date: startDate || null, // FIXED: null instead of empty string
        end_date: endDate || null, // FIXED: null instead of empty string
        application_deadline: applicationDeadline || null, // FIXED: null instead of empty string
        industry: finalIndustry || '',
        classification: classification || '',
        benefits: benefits || '',
        job_type: getValidJobType(jobType), // FIXED: use helper function instead of 'contract'
        primary_industry: finalIndustry || '',
        active: true,
        urgent: urgent, // Keep old urgent for backward compatibility
        high_priority: highPriority,
        popular: false,
        expiry_date: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        payment_type: 'single', // FIXED: use 'single' instead of 'hourly'
        cost_description: hourlyRate,
        status: 'active',
        views: 0,
        // New featured/urgent columns
        is_featured: isFeatured,
        featured_until: featuredUntil,
        is_urgent: isUrgent,
        urgent_until: urgentUntil
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating job:', error)
      return Response.json({ 
        error: 'Error creating job: ' + error.message 
      }, { status: 500 })
    }

    return Response.json({ 
      success: true, 
      job,
      message: 'Job posted successfully!' 
    })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const jobData = await request.json()
    
    // Helper function for job type validation in updates too
    function getValidJobType(inputJobType) {
      const validJobTypes = ['in-house', 'project-hire']
      
      if (!inputJobType) return 'project-hire'
      
      const lowerInput = inputJobType.toLowerCase()
      
      if (validJobTypes.includes(lowerInput)) {
        return lowerInput
      }
      
      const mappings = {
        'full time': 'in-house', 'full-time': 'in-house', 'permanent': 'in-house',
        'contract': 'project-hire', 'freelance': 'project-hire', 'temp': 'project-hire'
      }
      
      return mappings[lowerInput] || 'project-hire'
    }
    
    const {
      jobId,
      id, // Dashboard format
      employerId,
      userId, // Dashboard format
      title,
      company,
      description,
      requirements,
      contactEmail,
      contactPhone,
      region,
      hourlyRate,
      duration,
      startDate,
      endDate,
      applicationDeadline,
      industry,
      classification,
      benefits,
      jobType,
      primaryIndustry,
      urgent,
      highPriority,
      active,
      status,
      // New featured/urgent parameters
      isFeatured,
      featuredUntil,
      isUrgent,
      urgentUntil
    } = jobData

    // Use either format
    const finalJobId = jobId || id
    const finalEmployerId = employerId || userId

    if (!finalJobId || !finalEmployerId) {
      return Response.json({ 
        error: 'Job ID and Employer ID are required' 
      }, { status: 400 })
    }

    const updateData = {}
    
    if (title !== undefined) updateData.title = title.trim()
    if (company !== undefined) updateData.company = company.trim()
    if (description !== undefined) updateData.description = description.trim()
    if (requirements !== undefined) updateData.requirements = requirements
    if (contactEmail !== undefined) updateData.contact_email = contactEmail.trim()
    if (contactPhone !== undefined) updateData.contact_phone = contactPhone
    if (region !== undefined) updateData.region = region
    if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate
    if (duration !== undefined) updateData.duration = duration
    if (startDate !== undefined) updateData.start_date = startDate || null // FIXED: null handling
    if (endDate !== undefined) updateData.end_date = endDate || null // FIXED: null handling
    if (applicationDeadline !== undefined) updateData.application_deadline = applicationDeadline || null // FIXED: null handling
    if (industry !== undefined) {
      updateData.industry = industry
      updateData.primary_industry = industry
    }
    if (classification !== undefined) updateData.classification = classification
    if (benefits !== undefined) updateData.benefits = benefits
    if (jobType !== undefined) updateData.job_type = getValidJobType(jobType) // FIXED: use helper function
    if (primaryIndustry !== undefined) updateData.primary_industry = primaryIndustry
    if (urgent !== undefined) updateData.urgent = urgent
    if (highPriority !== undefined) updateData.high_priority = highPriority
    if (active !== undefined) updateData.active = active
    if (status !== undefined) updateData.status = status
    
    // New featured/urgent updates
    if (isFeatured !== undefined) updateData.is_featured = isFeatured
    if (featuredUntil !== undefined) updateData.featured_until = featuredUntil
    if (isUrgent !== undefined) updateData.is_urgent = isUrgent
    if (urgentUntil !== undefined) updateData.urgent_until = urgentUntil
    
    updateData.updated_at = new Date().toISOString()

    const { data: job, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', finalJobId)
      .eq('employer_id', finalEmployerId) // Security: only update own jobs
      .select()
      .single()

    if (error) {
      console.error('Error updating job:', error)
      return Response.json({ 
        error: 'Error updating job: ' + error.message 
      }, { status: 500 })
    }

    return Response.json({ success: true, job })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Handle both formats: path parameter and query parameter
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const jobIdFromPath = pathSegments[pathSegments.length - 1]
    
    const jobId = searchParams.get('jobId') || jobIdFromPath
    const employerId = searchParams.get('employerId') || searchParams.get('userId')
    
    console.log('DELETE request:', { jobId, employerId, url: request.url })
    
    if (!jobId || !employerId) {
      return Response.json({ 
        error: 'Job ID and Employer ID are required' 
      }, { status: 400 })
    }

    // Soft delete - set to inactive instead of hard delete
    const { error } = await supabase
      .from('jobs')
      .update({ 
        active: false, 
        status: 'deleted',
        deactivated_date: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('employer_id', employerId) // Security: only delete own jobs

    if (error) {
      console.error('Error deleting job:', error)
      return Response.json({ 
        error: 'Error deleting job: ' + error.message 
      }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}