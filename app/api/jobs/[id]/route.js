import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request, { params }) {
  const { id } = await params  // Added await
  console.log('GET request for id:', id)
  return Response.json({ message: `Testing route for job ${id}` })
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    const { id } = await params  // Added await for Next.js 15
    
    console.log('DELETE request received for id:', id)
    
    if (!id) {
      return Response.json({ 
        error: 'Job ID is required' 
      }, { status: 400 })
    }

    // Get the job first to find the employer_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', id)
      .single()
    
    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return Response.json({ 
        error: 'Job not found' 
      }, { status: 404 })
    }
    
    console.log('Found job with employer_id:', job.employer_id)

    // Soft delete the job - use 'inactive' instead of 'deleted'
    const { error } = await supabase
      .from('jobs')
      .update({ 
        active: false,
        status: 'deleted',  // This will now work
        deactivated_date: new Date().toISOString()
      })
      .eq('id', id)
      .eq('employer_id', job.employer_id)

    if (error) {
      console.error('Error deleting job:', error)
      return Response.json({ 
        error: 'Error deleting job: ' + error.message 
      }, { status: 500 })
    }

    console.log('Job deleted successfully:', id)
    return Response.json({ success: true })

  } catch (error) {
    console.error('Server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}