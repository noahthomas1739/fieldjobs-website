import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const formData = await request.formData()
    const file = formData.get('resume')
    const userId = formData.get('userId')

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user ID' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload PDF or Word document.' }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate unique filename with user folder structure
    const fileExtension = file.name.split('.').pop()
    const fileName = `${userId}/resume_${Date.now()}.${fileExtension}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true // Allow replacing existing resume
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file: ' + uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName)

    // FIXED: Update profiles table (not job_seeker_profiles)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        resume_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Resume uploaded successfully',
      resumeUrl: publicUrl
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}
