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
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get job seeker profile using user_id
    const { data: profile, error } = await supabase
      .from('job_seeker_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error)
      return Response.json({ profile: null }, { status: 200 })
    }

    return Response.json({ 
      success: true, 
      profile: profile || null
    })

  } catch (error) {
    console.error('API Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { 
      userId, 
      firstName, 
      lastName, 
      phone, 
      location, 
      classification, 
      specialization 
    } = await request.json()

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update job seeker profile using user_id
    const { data: profile, error } = await supabase
      .from('job_seeker_profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        location: location,
        classification: classification,
        specialization: specialization,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return Response.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return Response.json({ 
      success: true, 
      profile: profile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('API Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}