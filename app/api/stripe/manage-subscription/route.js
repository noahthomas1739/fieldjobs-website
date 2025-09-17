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

    // ENHANCED: Get user's LATEST subscription (active or most recent)
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !currentSub) {
      console.error('❌ Subscription not found:', subError)
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    console.log('📊 Current subscription:', currentSub)

    // ENHANCED: Check actual Stripe subscription status and sync if needed
    if (currentSub.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
        console.log('📋 Stripe subscription status:', stripeSubscription.status)
        
        // Sync database with Stripe reality
        await syncSubscriptionStatus(currentSub, stripeSubscription)

        // Handle canceled subscriptions - redirect to new subscription creation
        if (stripeSubscription.status === 'canceled') {
          return NextResponse.json({
            success: false,
            error: 'Subscription is canceled',
            action: 'create_new_subscription',
            message: 'Your subscription was canceled. Please create a new subscription instead of upgrading.',
            shouldCreateNew: true
          }, { status: 400 })
        }
      } catch (stripeError) {
        console.error('⚠️ Error checking Stripe subscription:', stripeError)
        // Continue anyway - might be a network issue
      }
    }

    switch (action) {
      case 'cancel':
        return await cancelSubscription(currentSub)
      
      case 'upgrade_immediate':
        return await upgradeSubscriptionImmediate(currentSub, newPriceId, newPlanType, userId)
      
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

// ENHANCED: Sync database subscription status with Stripe
async function syncSubscriptionStatus(currentSub, stripeSubscription) {
  const stripeStatus = stripeSubscription.status
  const dbStatus = currentSub.status
  
  if (stripeStatus !== dbStatus) {
    console.log(`🔄 Syncing status: DB=${dbStatus} -> Stripe=${stripeStatus}`)
    
    const updateData = {
      status: stripeStatus === 'canceled' ? 'cancelled' : stripeStatus,
      updated_at: new Date().toISOString()
    }
    
    if (stripeStatus === 'canceled' && !currentSub.cancelled_at) {
      updateData.cancelled_at = new Date(stripeSubscription.canceled_at * 1000).toISOString()
    }
    
    await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', currentSub.id)
    
    console.log('✅ Database status synced with Stripe')
  }
}

// ENHANCED: Immediate upgrade with cleanup and proration
async function upgradeSubscriptionImmediate(currentSub, newPriceId, newPlanType, userId) {
  try {
    console.log('⬆️ Starting immediate upgrade...', { newPriceId, newPlanType })

    if (!currentSub.stripe_subscription_id) {
      throw new Error('No Stripe subscription ID found')
    }

    // Get current Stripe subscription and double-check status
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    console.log('📋 Retrieved Stripe subscription:', subscription.id, 'Status:', subscription.status)

    // Final check - cannot upgrade canceled subscriptions
    if (subscription.status === 'canceled') {
      return NextResponse.json({
        success: false,
        error: 'Cannot upgrade canceled subscription',
        shouldCreateNew: true,
        message: 'Your subscription is canceled. Please create a new subscription instead.'
      }, { status: 400 })
    }

    if (!subscription.items?.data?.[0]) {
      throw new Error('No subscription items found')
    }

    // ENHANCED: Clean up old subscriptions before upgrading
    await cleanupOldSubscriptions(userId, currentSub.stripe_subscription_id)

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
        status: 'active', // Ensure it's marked as active
        cancelled_at: null, // Clear any cancellation
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentSub.user_id)

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      throw new Error('Failed to update database: ' + updateError.message)
    }

    // ENHANCED: Update credit balance for new plan
    await updateCreditBalance(userId, planDetails.planType)

    console.log('✅ Database updated successfully')

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planDetails.planType} plan! You'll be charged the prorated difference.`,
      newPlan: planDetails
    })

  } catch (error) {
    console.error('❌ Upgrade subscription error:', error)
    
    // Handle specific Stripe errors
    if (error.message.includes('canceled subscription can only update')) {
      return NextResponse.json({
        success: false,
        error: 'Cannot upgrade canceled subscription',
        shouldCreateNew: true,
        message: 'Your subscription is canceled. Please create a new subscription instead.'
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: false,
      error: 'Failed to upgrade subscription', 
      details: error.message 
    }, { status: 500 })
  }
}

// ENHANCED: End-of-cycle downgrade with better validation
async function downgradeSubscriptionEndCycle(currentSub, newPriceId, newPlanType) {
  try {
    console.log('⬇️ Starting end-cycle downgrade...', { newPriceId, newPlanType })

    if (!currentSub.stripe_subscription_id) {
      throw new Error('No Stripe subscription ID found')
    }

    // Get current Stripe subscription and check status
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    
    if (subscription.status === 'canceled') {
      return NextResponse.json({
        success: false,
        error: 'Cannot downgrade canceled subscription',
        shouldCreateNew: true,
        message: 'Your subscription is canceled. Please create a new subscription instead.'
      }, { status: 400 })
    }

    const currentPeriodEnd = subscription.current_period_end

    console.log('📅 Current period ends:', new Date(currentPeriodEnd * 1000))

    // ENHANCED: Check if there's already a scheduled downgrade
    const { data: existingSchedule } = await supabase
      .from('subscription_schedule_changes')
      .select('*')
      .eq('user_id', currentSub.user_id)
      .eq('status', 'scheduled')
      .single()

    if (existingSchedule) {
      return NextResponse.json({
        success: false,
        error: 'Downgrade already scheduled',
        message: `You already have a scheduled downgrade to ${existingSchedule.new_plan} plan on ${new Date(existingSchedule.effective_date).toLocaleDateString()}.`
      }, { status: 400 })
    }

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

    // Store scheduled change in database
    const { error: scheduleError } = await supabase
      .from('subscription_schedule_changes')
      .insert({
        user_id: currentSub.user_id,
        subscription_id: currentSub.id,
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

// ENHANCED: Cancel subscription with cleanup
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

    // Cancel any scheduled changes
    await supabase
      .from('subscription_schedule_changes')
      .update({ status: 'cancelled' })
      .eq('user_id', currentSub.user_id)
      .eq('status', 'scheduled')

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

// ENHANCED: Reactivate with validation
async function reactivateSubscription(currentSub) {
  try {
    console.log('🔄 Reactivating subscription...')

    // Check if it's actually canceled
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    
    if (subscription.status === 'canceled') {
      return NextResponse.json({
        success: false,
        error: 'Cannot reactivate fully canceled subscription',
        shouldCreateNew: true,
        message: 'This subscription is permanently canceled. Please create a new subscription.'
      }, { status: 400 })
    }

    // Only works for subscriptions that are set to cancel at period end
    const updatedSubscription = await stripe.subscriptions.update(
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

// ENHANCED: Cleanup old subscriptions function
async function cleanupOldSubscriptions(userId, currentStripeSubscriptionId) {
  console.log('🧹 Cleaning up old subscriptions for user:', userId)
  
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'replaced',
      cancelled_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('stripe_subscription_id', currentStripeSubscriptionId)
  
  if (error) {
    console.error('⚠️ Error cleaning up old subscriptions:', error)
  } else {
    console.log('✅ Cleaned up old subscriptions')
  }
}

// ENHANCED: Update credit balance for plan changes
async function updateCreditBalance(userId, planType) {
  const monthlyCredits = {
    'starter': 0,
    'growth': 5,
    'professional': 25,
    'enterprise': 100
  }[planType] || 0

  const { error } = await supabase
    .from('credit_balances')
    .upsert({
      user_id: userId,
      monthly_credits: monthlyCredits,
      last_monthly_refresh: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('⚠️ Error updating credit balance:', error)
  } else {
    console.log(`✅ Updated credit balance: ${monthlyCredits} monthly credits`)
  }
}

// Helper function using environment variables
function getPlanDetailsFromPriceId(priceId, planType) {
  console.log('🔍 Getting plan details for:', { priceId, planType })

  // Use environment variables for price ID matching
  const envPriceIds = {
    starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    growth: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID,
    professional: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
    enterprise: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID
  }

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
      price: 19900,
      jobLimit: 3,
      credits: 0
    },
    growth: {
      planType: 'growth',
      price: 29900,
      jobLimit: 6,
      credits: 5
    },
    professional: {
      planType: 'professional', 
      price: 59900,
      jobLimit: 15,
      credits: 25
    },
    enterprise: {
      planType: 'enterprise',
      price: 199900,
      jobLimit: 999999,
      credits: 100
    }
  }

  const details = planMapping[detectedPlan] || planMapping['starter']
  console.log('📊 Final plan details:', details)
  
  return details
}
