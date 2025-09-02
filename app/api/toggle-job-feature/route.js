// /app/api/toggle-job-feature/route.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { jobId, featureType, isEnabled, userId } = await request.json()

    // Validate inputs
    if (!jobId || !featureType || typeof isEnabled !== 'boolean' || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify job belongs to user
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('employer_id', userId)
      .single()

    if (jobError || !job) {
      return Response.json({ error: 'Job not found or access denied' }, { status: 404 })
    }

    // Prepare update data based on feature type
    let updateData = {}
    
    if (featureType === 'featured') {
      updateData = {
        is_featured: isEnabled,
        featured_until: isEnabled ? null : null // Remove expiration when disabling
      }
    } else if (featureType === 'urgent') {
      updateData = {
        is_urgent: isEnabled,
        urgent_until: isEnabled ? null : null // Remove expiration when disabling
      }
    } else {
      return Response.json({ error: 'Invalid feature type' }, { status: 400 })
    }

    // Update the job
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()

    if (updateError) {
      console.error('Error updating job feature:', updateError)
      return Response.json({ error: 'Failed to update job feature' }, { status: 500 })
    }

    return Response.json({ 
      success: true,
      message: `Job ${featureType} ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      job: updatedJob[0]
    })

  } catch (error) {
    console.error('Error toggling job feature:', error)
    return Response.json({ 
      error: 'Failed to toggle job feature',
      details: error.message 
    }, { status: 500 })
  }
}