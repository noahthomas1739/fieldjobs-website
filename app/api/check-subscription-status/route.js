// /app/api/check-subscription-status/route.js - NEW endpoint to check before showing upgrade buttons
import { NextResponse } from 'next/server'
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
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check for active subscriptions
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')

    const hasActiveSubscription = activeSubscriptions && activeSubscriptions.length > 0
    const currentPlan = hasActiveSubscription ? activeSubscriptions[0].plan_type : 'free'

    return NextResponse.json({
      hasActiveSubscription,
      currentPlan,
      canPurchaseNew: !hasActiveSubscription,
      shouldShowUpgradeOptions: hasActiveSubscription,
      subscription: hasActiveSubscription ? activeSubscriptions[0] : null
    })

  } catch (error) {
    console.error('❌ Error checking subscription status:', error)
    return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 })
  }
}