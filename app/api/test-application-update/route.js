import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(request) {
  try {
    console.log('🧪 TEST: Updating application status (bypassing employer check)')
    
    const { applicationId, status, userId } = await request.json()
    console.log('📥 TEST Request body:', { applicationId, status, userId })

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: 'Missing applicationId or status' },
        { status: 400 }
      )
    }

    // BYPASS employer verification for testing
    console.log('🧪 TEST: Directly updating application without employer check')

    // Update application status directly
    const { data: updatedApplications, error: updateError } = await supabase
      .from('applications')
      .update({ 
        status: status
      })
      .eq('id', applicationId)
      .select()

    const updatedApplication = updatedApplications?.[0]

    if (updateError) {
      console.error('❌ TEST: Error updating application:', updateError)
      return NextResponse.json(
        { error: 'Failed to update application: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ TEST: Application updated successfully:', updatedApplication)

    return NextResponse.json({
      success: true,
      message: 'TEST: Application status updated successfully',
      application: updatedApplication
    })

  } catch (error) {
    console.error('❌ TEST: Server error:', error)
    return NextResponse.json(
      { error: 'TEST: Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}
