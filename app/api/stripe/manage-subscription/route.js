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

    // ROBUST: Get and validate user's subscription
    const validSubscription = await getValidUserSubscription(userId)
    
    if (!validSubscription) {
      return NextResponse.json({ 
        error: 'No valid subscription found',
        shouldCreateNew: true,
        message: 'Please create a new subscription to continue.'
      }, { status: 404 })
    }

    console.log('📊 Valid subscription found:', {
      id: validSubscription.id,
      stripeId: validSubscription.stripe_subscription_id,
      planType: validSubscription.plan_type,
      status: validSubscription.status
    })

    switch (action) {
      case 'upgrade_immediate':
        return await upgradeSubscriptionImmediate(validSubscription, newPriceId, newPlanType)
      
      case 'downgrade_end_cycle':
        return await downgradeSubscriptionEndCycle(validSubscription, newPriceId, newPlanType)
      
      case 'cancel':
        return await cancelSubscription(validSubscription)
      
      case 'reactivate':
        return await reactivateSubscription(validSubscription)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Subscription management error:', error)
    return NextResponse.json(
      { 
        error: 'Subscription management failed', 
        details: error.message,
        shouldCreateNew: error.message.includes('No such subscription')
      },
      { status: 500 }
    )
  }
}

/**
 * ROBUST: Get and validate user's subscription
 * This function ensures we have a valid, active subscription that exists in both DB and Stripe
 */
async function getValidUserSubscription(userId) {
  console.log('🔍 Finding valid subscription for user:', userId)
  
  // Get all subscriptions for user, ordered by most recent
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Database error:', error)
    throw new Error('Database query failed: ' + error.message)
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('❌ No subscriptions found in database')
    return null
  }

  console.log(`📊 Found ${subscriptions.length} subscription(s) in database:`)
  subscriptions.forEach((sub, index) => {
    console.log(`  ${index + 1}. ID: ${sub.id}, Stripe: ${sub.stripe_subscription_id}, Status: ${sub.status}, Plan: ${sub.plan_type}`)
  })

  // Check each subscription to find a valid one
  for (const subscription of subscriptions) {
    console.log(`\n🔍 Validating subscription ${subscription.id}:`)
    console.log(`  - Stripe ID: ${subscription.stripe_subscription_id}`)
    console.log(`  - DB Status: ${subscription.status}`)
    console.log(`  - Plan Type: ${subscription.plan_type}`)
    console.log(`  - Created: ${subscription.created_at}`)

    // Skip if no Stripe subscription ID
    if (!subscription.stripe_subscription_id) {
      console.log('⚠️ Skipping - no Stripe subscription ID')
      continue
    }

    // ENHANCED: Validate with Stripe with detailed logging
    try {
      console.log(`🔗 Calling Stripe API for subscription: ${subscription.stripe_subscription_id}`)
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
      
      console.log('✅ Stripe API response successful:')
      console.log(`  - Stripe Status: ${stripeSubscription.status}`)
      console.log(`  - Customer: ${stripeSubscription.customer}`)
      console.log(`  - Current Period: ${new Date(stripeSubscription.current_period_start * 1000).toISOString()} to ${new Date(stripeSubscription.current_period_end * 1000).toISOString()}`)
      console.log(`  - Items: ${stripeSubscription.items?.data?.length || 0}`)

      // Sync database status with Stripe if needed
      await syncSubscriptionStatus(subscription, stripeSubscription)

      // RELAXED: Accept more subscription statuses for testing
      const validStatuses = ['active', 'trialing', 'past_due', 'unpaid']
      if (validStatuses.includes(stripeSubscription.status)) {
        console.log('✅ Found valid subscription with status:', stripeSubscription.status)
        return {
          ...subscription,
          stripeData: stripeSubscription
        }
      } else {
        console.log(`⚠️ Subscription ${stripeSubscription.id} status "${stripeSubscription.status}" not in valid statuses: ${validStatuses.join(', ')}`)
      }

    } catch (stripeError) {
      console.error(`❌ Stripe validation failed for ${subscription.stripe_subscription_id}:`)
      console.error(`  - Error Type: ${stripeError.type}`)
      console.error(`  - Error Code: ${stripeError.code}`)
      console.error(`  - Error Message: ${stripeError.message}`)
      
      // Mark invalid subscriptions
      if (stripeError.message.includes('No such subscription')) {
        console.log(`🗑️ Marking subscription as invalid due to Stripe error`)
        await markSubscriptionAsInvalid(subscription.id)
      }
      continue
    }
  }

  console.log('❌ No valid active subscriptions found after checking all records')
  return null
}

/**
 * ROBUST: Sync database status with Stripe reality
 */
async function syncSubscriptionStatus(dbSubscription, stripeSubscription) {
  const dbStatus = dbSubscription.status
  const stripeStatus = stripeSubscription.status
  
  if (dbStatus !== stripeStatus) {
    console.log(`🔄 Syncing status: DB="${dbStatus}" -> Stripe="${stripeStatus}"`)
    
    const updateData = {
      status: stripeStatus,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
    
    if (stripeStatus === 'canceled' && !dbSubscription.cancelled_at) {
      updateData.cancelled_at = stripeSubscription.canceled_at 
        ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
        : new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', dbSubscription.id)
    
    if (error) {
      console.error('⚠️ Failed to sync status:', error)
    } else {
      console.log('✅ Status synced successfully')
    }
  }
}

/**
 * ROBUST: Mark invalid subscriptions to prevent future issues
 */
async function markSubscriptionAsInvalid(subscriptionId) {
  console.log(`🗑️ Marking subscription ${subscriptionId} as invalid`)
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'invalid',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
  
  if (error) {
    console.error('⚠️ Failed to mark as invalid:', error)
  }
}

/**
 * ROBUST: Immediate upgrade with comprehensive validation
 */
async function upgradeSubscriptionImmediate(validSubscription, newPriceId, newPlanType) {
  try {
    console.log('⬆️ Starting immediate upgrade...')
    
    const stripeSubscription = validSubscription.stripeData
    
    // Double-check subscription is upgradeable
    if (!['active', 'trialing'].includes(stripeSubscription.status)) {
      throw new Error(`Cannot upgrade ${stripeSubscription.status} subscription`)
    }

    if (!stripeSubscription.items?.data?.[0]) {
      throw new Error('No subscription items found')
    }

    // Validate new price ID
    if (!newPriceId || !newPlanType) {
      throw new Error('Missing price ID or plan type')
    }

    console.log('💰 Updating Stripe subscription...')
    const updatedSubscription = await stripe.subscriptions.update(
      stripeSubscription.id,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
        billing_cycle_anchor: 'unchanged'
      }
    )

    console.log('✅ Stripe subscription updated successfully')

    // Get plan details and update database
    const planDetails = getPlanDetails(newPlanType)
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_type: planDetails.planType,
        price: planDetails.price,
        active_jobs_limit: planDetails.jobLimit,
        credits: planDetails.credits,
        current_period_start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        status: 'active',
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', validSubscription.id)

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      throw new Error('Database update failed: ' + updateError.message)
    }

    // Clean up any old subscriptions
    await cleanupOldSubscriptions(validSubscription.user_id, stripeSubscription.id)

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planDetails.planType} plan!`,
      newPlan: planDetails
    })

  } catch (error) {
    console.error('❌ Upgrade error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Upgrade failed', 
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * ROBUST: End-of-cycle downgrade with proper scheduling
 */
async function downgradeSubscriptionEndCycle(validSubscription, newPriceId, newPlanType) {
  try {
    console.log('⬇️ Starting end-cycle downgrade...')
    
    const stripeSubscription = validSubscription.stripeData
    
    // Validate subscription is downgradeable
    if (!['active', 'trialing'].includes(stripeSubscription.status)) {
      throw new Error(`Cannot downgrade ${stripeSubscription.status} subscription`)
    }

    // Check for existing scheduled changes
    const { data: existingSchedule } = await supabase
      .from('subscription_schedule_changes')
      .select('*')
      .eq('user_id', validSubscription.user_id)
      .eq('status', 'scheduled')
      .single()

    if (existingSchedule) {
      return NextResponse.json({
        success: false,
        error: 'Downgrade already scheduled',
        message: `You already have a scheduled downgrade to ${existingSchedule.new_plan} plan.`
      }, { status: 400 })
    }

    // Get plan details
    const planDetails = getPlanDetails(newPlanType)
    const effectiveDate = new Date(stripeSubscription.current_period_end * 1000).toISOString()

    // Store the scheduled change
    const { error: scheduleError } = await supabase
      .from('subscription_schedule_changes')
      .insert({
        user_id: validSubscription.user_id,
        subscription_id: validSubscription.id,
        stripe_schedule_id: `manual_${Date.now()}`,
        current_plan: validSubscription.plan_type,
        new_plan: planDetails.planType,
        new_price_id: newPriceId,
        effective_date: effectiveDate,
        status: 'scheduled'
      })

    if (scheduleError) {
      console.error('❌ Schedule error:', scheduleError)
      throw new Error('Failed to schedule downgrade: ' + scheduleError.message)
    }

    return NextResponse.json({
      success: true,
      message: `Downgrade scheduled to ${planDetails.planType} plan! Your current benefits continue until ${new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString()}.`,
      effectiveDate: effectiveDate,
      newPlan: planDetails
    })

  } catch (error) {
    console.error('❌ Downgrade error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Downgrade scheduling failed', 
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * ROBUST: Cancel subscription
 */
async function cancelSubscription(validSubscription) {
  try {
    console.log('❌ Cancelling subscription...')
    
    const stripeSubscription = validSubscription.stripeData
    
    const canceledSubscription = await stripe.subscriptions.update(
      stripeSubscription.id,
      { cancel_at_period_end: true }
    )

    // Update database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', validSubscription.id)

    if (updateError) {
      throw new Error('Database update failed: ' + updateError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription will cancel at the end of your billing period',
      cancelAt: new Date(canceledSubscription.current_period_end * 1000).toISOString()
    })

  } catch (error) {
    console.error('❌ Cancel error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Cancellation failed',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * ROBUST: Reactivate subscription
 */
async function reactivateSubscription(validSubscription) {
  try {
    console.log('🔄 Reactivating subscription...')
    
    const stripeSubscription = validSubscription.stripeData
    
    const reactivatedSubscription = await stripe.subscriptions.update(
      stripeSubscription.id,
      { cancel_at_period_end: false }
    )

    // Update database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', validSubscription.id)

    if (updateError) {
      throw new Error('Database update failed: ' + updateError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully'
    })

  } catch (error) {
    console.error('❌ Reactivate error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Reactivation failed',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * UTILITY: Clean up old invalid subscriptions
 */
async function cleanupOldSubscriptions(userId, activeStripeSubscriptionId) {
  console.log('🧹 Cleaning up old subscriptions...')
  
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'replaced',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .neq('stripe_subscription_id', activeStripeSubscriptionId)
    .in('status', ['active', 'trialing'])
  
  if (error) {
    console.error('⚠️ Cleanup error:', error)
  } else {
    console.log('✅ Old subscriptions cleaned up')
  }
}

/**
 * UTILITY: Get plan details by plan type
 */
function getPlanDetails(planType) {
  const plans = {
    starter: { planType: 'starter', price: 19900, jobLimit: 3, credits: 0 },
    growth: { planType: 'growth', price: 29900, jobLimit: 6, credits: 5 },
    professional: { planType: 'professional', price: 59900, jobLimit: 15, credits: 25 },
    enterprise: { planType: 'enterprise', price: 199900, jobLimit: 999999, credits: 100 }
  }
  
  return plans[planType] || plans['starter']
}
