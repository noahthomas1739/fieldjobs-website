// app/api/debug-payments/route.js
import { NextResponse } from 'next/server'
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
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    console.log('🔍 Debug: Checking payments for user:', userId)

    // Check one_time_payments table
    const { data: oneTimePayments, error: paymentsError } = await supabase
      .from('one_time_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('❌ Error fetching one-time payments:', paymentsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error', 
        details: paymentsError.message 
      }, { status: 500 })
    }

    // Check subscriptions table
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError)
    }

    // Check job_feature_purchases table
    const { data: featurePurchases, error: featureError } = await supabase
      .from('job_feature_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false })

    if (featureError) {
      console.error('❌ Error fetching feature purchases:', featureError)
    }

    console.log('📊 Debug Results:')
    console.log('  - One-time payments:', oneTimePayments?.length || 0)
    console.log('  - Subscriptions:', subscriptions?.length || 0)
    console.log('  - Feature purchases:', featurePurchases?.length || 0)

    return NextResponse.json({
      success: true,
      userId,
      oneTimePayments: oneTimePayments || [],
      subscriptions: subscriptions || [],
      featurePurchases: featurePurchases || [],
      summary: {
        totalOneTimePayments: oneTimePayments?.length || 0,
        totalSubscriptions: subscriptions?.length || 0,
        totalFeaturePurchases: featurePurchases?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
