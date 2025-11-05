import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Helper function to get plan limits
function getPlanLimits(planType) {
  const limits = {
    starter: { active_jobs_limit: 3, credits: 0 },
    growth: { active_jobs_limit: 6, credits: 5 },
    professional: { active_jobs_limit: 15, credits: 25 },
    enterprise: { active_jobs_limit: 20, credits: 25 },
    unlimited: { active_jobs_limit: 999999, credits: 100 }
  }
  return limits[planType] || limits.starter
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 Fixing subscription limits for user:', user.id)

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    console.log('📋 Current subscription:', {
      id: subscription.id,
      plan_type: subscription.plan_type,
      active_jobs_limit: subscription.active_jobs_limit,
      credits: subscription.credits
    })

    // Get correct limits for the plan
    const planLimits = getPlanLimits(subscription.plan_type)
    
    console.log('🎯 Plan limits for', subscription.plan_type, ':', planLimits)

    // Update subscription with correct limits
    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        active_jobs_limit: planLimits.active_jobs_limit,
        credits: planLimits.credits,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    console.log('✅ Subscription updated:', {
      id: updatedSub.id,
      plan_type: updatedSub.plan_type,
      active_jobs_limit: updatedSub.active_jobs_limit,
      credits: updatedSub.credits
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription limits updated successfully',
      subscription: updatedSub
    })

  } catch (error) {
    console.error('❌ Fix subscription limits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
