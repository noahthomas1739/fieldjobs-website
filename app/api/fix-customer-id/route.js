// Create this as: /app/api/fix-customer-id/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { userId, correctCustomerId } = await request.json()

    if (!userId || !correctCustomerId) {
      return NextResponse.json({ error: 'Missing userId or correctCustomerId' }, { status: 400 })
    }

    console.log('🔧 Fixing customer ID for user:', { userId, correctCustomerId })

    // Update the user's customer ID
    const { data, error } = await supabase
      .from('users')
      .update({ stripe_customer_id: correctCustomerId })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Error updating customer ID:', error)
      return NextResponse.json({ error: 'Failed to update customer ID' }, { status: 500 })
    }

    console.log('✅ Customer ID updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Customer ID updated successfully',
      updatedUser: data[0]
    })

  } catch (error) {
    console.error('Fix customer ID error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}