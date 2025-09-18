import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data: jobAlerts, error } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Database error: ' + error.message }, { status: 500 })
    }

    return Response.json({ jobAlerts })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { 
      userId, 
      name, 
      keywords, 
      region, 
      industry, 
      classification, 
      salary, 
      frequency 
    } = await request.json()
    
    if (!userId || !name || !frequency) {
      return Response.json({ 
        error: 'User ID, alert name, and frequency are required' 
      }, { status: 400 })
    }

    // Safely parse salary values
    let minSalary = null
    let maxSalary = null
    
    if (salary && salary.trim() && salary.includes('-')) {
      const salaryParts = salary.split('-')
      const minPart = salaryParts[0]?.replace(/[$\s]/g, '')
      const maxPart = salaryParts[1]?.replace(/[$\s]/g, '')
      
      if (minPart && !isNaN(minPart)) {
        minSalary = parseInt(minPart)
      }
      if (maxPart && !isNaN(maxPart)) {
        maxSalary = parseInt(maxPart)
      }
    }

    // Create the job alert with all fields
    const { data: jobAlert, error: createError } = await supabase
      .from('job_alerts')
      .insert([{
        user_id: userId,
        name: name.trim(),
        keywords: keywords?.trim() || '',
        region: region?.trim() || '',
        industry: industry?.trim() || '',
        classification: classification?.trim() || '',
        min_salary: minSalary,
        max_salary: maxSalary,
        frequency: frequency,
        active: true,
        last_sent: null,
        matches_count: 0,
        total_sent: 0
      }])
      .select()
      .single()

    if (createError) {
      console.error('Error creating job alert:', createError)
      return Response.json({ 
        error: 'Error creating job alert: ' + createError.message 
      }, { status: 500 })
    }

    return Response.json({ 
      success: true, 
      jobAlert,
      message: 'Job alert created successfully! You\'ll receive notifications when matching jobs are posted.' 
    })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { 
      alertId, 
      userId,
      name, 
      keywords, 
      region, 
      industry, 
      classification, 
      salary, 
      frequency,
      active 
    } = await request.json()
    
    if (!alertId || !userId) {
      return Response.json({ 
        error: 'Alert ID and User ID are required' 
      }, { status: 400 })
    }

    const updateData = {}
    
    if (name !== undefined) updateData.name = name.trim()
    if (keywords !== undefined) updateData.keywords = keywords?.trim() || ''
    if (region !== undefined) updateData.region = region?.trim() || ''
    if (industry !== undefined) updateData.industry = industry?.trim() || ''
    if (classification !== undefined) updateData.classification = classification?.trim() || ''
    if (frequency !== undefined) updateData.frequency = frequency
    if (active !== undefined) updateData.active = active
    
    // Handle salary safely
    if (salary !== undefined) {
      let minSalary = null
      let maxSalary = null
      
      if (salary && salary.trim() && salary.includes('-')) {
        const salaryParts = salary.split('-')
        const minPart = salaryParts[0]?.replace(/[$\s]/g, '')
        const maxPart = salaryParts[1]?.replace(/[$\s]/g, '')
        
        if (minPart && !isNaN(minPart)) {
          minSalary = parseInt(minPart)
        }
        if (maxPart && !isNaN(maxPart)) {
          maxSalary = parseInt(maxPart)
        }
      }
      
      updateData.min_salary = minSalary
      updateData.max_salary = maxSalary
    }

    const { data: jobAlert, error: updateError } = await supabase
      .from('job_alerts')
      .update(updateData)
      .eq('id', alertId)
      .eq('user_id', userId) // Security: only update user's own alerts
      .select()
      .single()

    if (updateError) {
      console.error('Error updating job alert:', updateError)
      return Response.json({ 
        error: 'Error updating job alert: ' + updateError.message 
      }, { status: 500 })
    }

    return Response.json({ success: true, jobAlert })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('alertId')
    const userId = searchParams.get('userId')
    
    if (!alertId || !userId) {
      return Response.json({ 
        error: 'Alert ID and User ID are required' 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('job_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userId) // Security: only delete user's own alerts

    if (error) {
      console.error('Error deleting job alert:', error)
      return Response.json({ 
        error: 'Error deleting job alert: ' + error.message 
      }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}