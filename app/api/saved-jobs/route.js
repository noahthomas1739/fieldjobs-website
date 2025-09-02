import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data: savedJobs, error } = await supabase
      .from('saved_jobs')
      .select(`
        *,
        jobs (
          id,
          title,
          company,
          region,
          hourly_rate,
          job_type,
          primary_industry,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return Response.json({ error: 'Database error: ' + error.message }, { status: 500 })
    }

    return Response.json({ savedJobs })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { userId, jobId, jobData } = await request.json()
    
    if (!userId || !jobId) {
      return Response.json({ error: 'User ID and Job ID required' }, { status: 400 })
    }

    // First, ensure the job exists in the jobs table
    let { data: existingJob, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single()

    if (jobError && jobError.code === 'PGRST116') {
      // Job doesn't exist, create it
      const { data: newJob, error: createJobError } = await supabase
        .from('jobs')
        .insert([{
          id: jobId,
          title: jobData.title,
          company: jobData.company,
          region: jobData.region,
          hourly_rate: jobData.hourlyRate,
          job_type: jobData.jobType,
          primary_industry: jobData.primaryIndustry || jobData.type,
          description: jobData.description,
          contact_email: jobData.contactEmail || 'contact@company.com',
          status: 'active'
        }])
        .select()
        .single()

      if (createJobError) {
        console.error('Error creating job:', createJobError)
        return Response.json({ error: 'Error creating job: ' + createJobError.message }, { status: 500 })
      }
    }

    // Now save the job for the user
    const { data: savedJob, error: saveError } = await supabase
      .from('saved_jobs')
      .insert([{
        user_id: userId,
        job_id: jobId
      }])
      .select()
      .single()

    if (saveError) {
      if (saveError.code === '23505') {
        return Response.json({ error: 'Job already saved' }, { status: 409 })
      }
      console.error('Error saving job:', saveError)
      return Response.json({ error: 'Error saving job: ' + saveError.message }, { status: 500 })
    }

    return Response.json({ success: true, savedJob })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const jobId = searchParams.get('jobId')
    
    if (!userId || !jobId) {
      return Response.json({ error: 'User ID and Job ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId)

    if (error) {
      console.error('Error removing saved job:', error)
      return Response.json({ error: 'Error removing saved job: ' + error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}