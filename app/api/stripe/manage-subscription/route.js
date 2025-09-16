// app/api/stripe/manage-subscription/route.js
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { action, userId, newPriceId, newPlanType, subscriptionId } = await request.json()
    
    console.log('🔧 Managing subscription:', { action, userId, newPriceId, newPlanType, subscriptionId })

    // Validate required parameters
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user's current subscription from database
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (subError || !currentSub) {
      console.error('❌ Active subscription not found:', subError)
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    console.log('📊 Current subscription:', currentSub)

    switch (action) {
      case 'cancel':
        return await cancelSubscription(currentSub)
      
      case 'upgrade_immediate':
        return await upgradeSubscriptionImmediate(currentSub, newPriceId, newPlanType)
      
      case 'downgrade_end_cycle':
        return await downgradeSubscriptionEndCycle(currentSub, newPriceId, newPlanType)
      
      case 'reactivate':
        return await reactivateSubscription(currentSub)
      
      case 'get_billing_portal':
        return await createBillingPortalSession(currentSub.stripe_customer_id)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Subscription management error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Immediate upgrade with proration
async function upgradeSubscriptionImmediate(currentSub, newPriceId, newPlanType) {
  try {
    console.log('⬆️ Starting immediate upgrade...', { newPriceId, newPlanType })

    if (!currentSub.stripe_subscription_id) {
      throw new Error('No Stripe subscription ID found')
    }

    // Get current Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    console.log('📋 Retrieved Stripe subscription:', subscription.id)

    if (!subscription.items?.data?.[0]) {
      throw new Error('No subscription items found')
    }

    // Immediate upgrade with proration
    console.log('💰 Updating Stripe subscription with proration...')
    const updatedSubscription = await stripe.subscriptions.update(
      currentSub.stripe_subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations'
      }
    )

    console.log('✅ Stripe subscription updated successfully')

    // Get plan details
    const planDetails = getPlanDetailsFromPriceId(newPriceId, newPlanType)
    console.log('📊 Plan details:', planDetails)
    
    // Update subscriptions table
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_type: planDetails.planType,
        price: planDetails.price,
        active_jobs_limit: planDetails.jobLimit,
        credits: planDetails.credits,
        current_period_start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentSub.user_id)

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      throw new Error('Failed to update database: ' + updateError.message)
    }

    console.log('✅ Database updated successfully')

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planDetails.planType} plan! You'll be charged the prorated difference.`,
      newPlan: planDetails
    })

  } catch (error) {
    console.error('❌ Upgrade subscription error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to upgrade subscription', 
      details: error.message 
    }, { status: 500 })
  }
}

// End-of-cycle downgrade using subscription schedules
async function downgradeSubscriptionEndCycle(currentSub, newPriceId, newPlanType) {
  try {
    console.log('⬇️ Starting end-cycle downgrade...', { newPriceId, newPlanType })

    if (!currentSub.stripe_subscription_id) {
      throw new Error('No Stripe subscription ID found')
    }

    // Get current Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    const currentPeriodEnd = subscription.current_period_end

    console.log('📅 Current period ends:', new Date(currentPeriodEnd * 1000))

    // Create subscription schedule for end-of-cycle change
    console.log('📅 Creating subscription schedule...')
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: currentSub.stripe_subscription_id,
      phases: [
        {
          // Current phase - keep current plan until end of period
          items: [{
            price: subscription.items.data[0].price.id,
            quantity: 1
          }],
          start_date: subscription.current_period_start,
          end_date: currentPeriodEnd
        },
        {
          // New phase - downgraded plan starts next cycle
          items: [{
            price: newPriceId,
            quantity: 1
          }],
          start_date: currentPeriodEnd
        }
      ]
    })

    console.log('✅ Subscription schedule created:', schedule.id)

    // Get plan details
    const planDetails = getPlanDetailsFromPriceId(newPriceId, newPlanType)
    const effectiveDate = new Date(currentPeriodEnd * 1000).toISOString()

    // Store scheduled change in your existing subscription_schedule_changes table
    const { error: scheduleError } = await supabase
      .from('subscription_schedule_changes')
      .insert({
        user_id: currentSub.user_id,
        subscription_id: currentSub.id, // Using the UUID from subscriptions table
        stripe_schedule_id: schedule.id,
        current_plan: currentSub.plan_type,
        new_plan: planDetails.planType,
        effective_date: effectiveDate,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (scheduleError) {
      console.error('❌ Schedule tracking error:', scheduleError)
      // Continue anyway - the Stripe schedule was created successfully
    } else {
      console.log('✅ Schedule change tracked in database')
    }

    return NextResponse.json({
      success: true,
      message: `Downgrade scheduled to ${planDetails.planType} plan! Your current plan benefits continue until ${new Date(currentPeriodEnd * 1000).toLocaleDateString()}.`,
      effectiveDate: effectiveDate,
      newPlan: planDetails,
      scheduleId: schedule.id
    })

  } catch (error) {
    console.error('❌ Downgrade subscription error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to schedule downgrade', 
      details: error.message 
    }, { status: 500 })
  }
}

// Cancel subscription at period end
async function cancelSubscription(currentSub) {
  try {
    console.log('❌ Cancelling subscription at period end...')

    const subscription = await stripe.subscriptions.update(
      currentSub.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    )

    // Update database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('user_id', currentSub.user_id)

    if (updateError) {
      throw new Error('Failed to update database: ' + updateError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription will cancel at the end of your billing period',
      cancelAt: new Date(subscription.current_period_end * 1000).toISOString()
    })

  } catch (error) {
    console.error('❌ Cancel subscription error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to cancel subscription',
      details: error.message
    }, { status: 500 })
  }
}

// Reactivate cancelled subscription
async function reactivateSubscription(currentSub) {
  try {
    console.log('🔄 Reactivating subscription...')

    const subscription = await stripe.subscriptions.update(
      currentSub.stripe_subscription_id,
      {
        cancel_at_period_end: false
      }
    )

    // Update database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentSub.user_id)

    if (updateError) {
      throw new Error('Failed to update database: ' + updateError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully'
    })

  } catch (error) {
    console.error('❌ Reactivate subscription error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to reactivate subscription',
      details: error.message
    }, { status: 500 })
  }
}

// Create Stripe billing portal session
async function createBillingPortalSession(customerId) {
  try {
    console.log('🏢 Creating billing portal session...')

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?tab=billing`
    })

    return NextResponse.json({
      success: true,
      url: session.url
    })

  } catch (error) {
    console.error('❌ Billing portal error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create billing portal',
      details: error.message
    }, { status: 500 })
  }
}

// Helper function using environment variables and fallback plan detection
function getPlanDetailsFromPriceId(priceId, planType) {
  console.log('🔍 Getting plan details for:', { priceId, planType })

  // Use environment variables for price ID matching
  const envPriceIds = {
    starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    growth: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID,
    professional: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
    enterprise: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID
  }

  console.log('🔑 Environment price IDs:', envPriceIds)

  // Match by environment variables first, then fallback to planType
  let detectedPlan = planType || 'starter'

  // Try to match by price ID to environment variables
  Object.entries(envPriceIds).forEach(([plan, envPriceId]) => {
    if (priceId === envPriceId) {
      detectedPlan = plan
    }
  })

  const planMapping = {
    starter: {
      planType: 'starter',
      price: 19900, // $199
      jobLimit: 3,
      credits: 0
    },
    growth: {
      planType: 'growth',
      price: 29900, // $299
      jobLimit: 6,
      credits: 5
    },
    professional: {
      planType: 'professional', 
      price: 59900, // $599
      jobLimit: 15,
      credits: 25
    },
    enterprise: {
      planType: 'enterprise',
      price: 199900, // $1,999
      jobLimit: 999999,
      credits: 100
    }
  }

  const details = planMapping[detectedPlan] || planMapping['starter']
  console.log('📊 Final plan details:', details)
  
  return details
}
