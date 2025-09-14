// /app/api/check-subscription-status/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Get user's current subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking subscription:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const hasActiveSubscription = subscription && 
      subscription.status === 'active' && 
      subscription.plan_type !== 'free'

    return NextResponse.json({
      hasActiveSubscription,
      currentPlan: subscription?.plan_type || 'free',
      canPurchaseNew: !hasActiveSubscription,
      subscription: subscription || null
    })

  } catch (error) {
    console.error('Error in check-subscription-status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
