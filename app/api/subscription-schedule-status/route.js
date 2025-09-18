// /app/api/subscription-schedule-status/route.js
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
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    console.log('📅 Checking subscription schedule status for user:', userId)

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      return NextResponse.json({
        success: true,
        hasActiveSubscription: false,
        scheduledChanges: []
      })
    }

    // Get any scheduled changes
    const { data: scheduledChanges, error: scheduleError } = await supabase
      .from('subscription_schedule_changes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .order('effective_date', { ascending: true })

    if (scheduleError) {
      console.error('❌ Error fetching scheduled changes:', scheduleError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch scheduled changes' 
      }, { status: 500 })
    }

    console.log(`✅ Found ${scheduledChanges?.length || 0} scheduled changes`)

    return NextResponse.json({
      success: true,
      hasActiveSubscription: true,
      currentSubscription: {
        id: subscription.id,
        plan_type: subscription.plan_type,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        active_jobs_limit: subscription.active_jobs_limit,
        credits: subscription.credits
      },
      scheduledChanges: scheduledChanges?.map(change => ({
        id: change.id,
        currentPlan: change.current_plan,
        newPlan: change.new_plan,
        effectiveDate: change.effective_date,
        status: change.status,
        createdAt: change.created_at
      })) || []
    })

  } catch (error) {
    console.error('❌ Subscription schedule status error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error while fetching subscription schedule status' 
    }, { status: 500 })
  }
}