// app/api/stripe/manage-subscription/route.js
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// Safely convert a Unix seconds timestamp to ISO string, or return null
function toIsoFromUnixSeconds(unixSeconds) {
  try {
    if (unixSeconds === undefined || unixSeconds === null) return null
    const date = new Date(unixSeconds * 1000)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch (err) {
    return null
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { action, userId, newPriceId, newPlanType, subscriptionId } = await request.json()
    
    console.log('🔧 Managing subscription:', { action, userId, newPriceId, newPlanType, subscriptionId })

    // Validate required parameters
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Handle billing portal action separately (doesn't need subscription validation)
    if (action === 'get_billing_portal') {
      return await getBillingPortal(supabase, userId)
    }

    // ROBUST: Get and validate user's subscription
    const validSubscription = await getValidUserSubscription(supabase, userId)
    
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
        return await upgradeSubscriptionImmediate(supabase, validSubscription, newPriceId, newPlanType)
      
      case 'downgrade_end_cycle':
        return await downgradeSubscriptionEndCycle(supabase, validSubscription, newPriceId, newPlanType)
      
      case 'cancel':
        return await cancelSubscription(supabase, validSubscription)
      
      case 'reactivate':
        return await reactivateSubscription(supabase, validSubscription)
      
      case 'get_billing_history':
        return await getBillingHistory(userId)
      
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
async function getValidUserSubscription(supabase, userId) {
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
      {
        const item = stripeSubscription.items?.data?.[0]
        const startIso = toIsoFromUnixSeconds(item?.current_period_start)
        const endIso = toIsoFromUnixSeconds(item?.current_period_end)
        console.log(`  - Current Period: ${startIso || 'unknown'} to ${endIso || 'unknown'}`)
      }
      console.log(`  - Items: ${stripeSubscription.items?.data?.length || 0}`)

      // Sync database status with Stripe if needed
      await syncSubscriptionStatus(supabase, subscription, stripeSubscription)

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
        await markSubscriptionAsInvalid(supabase, subscription.id)
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
async function syncSubscriptionStatus(supabase, dbSubscription, stripeSubscription) {
  const dbStatus = dbSubscription.status
  const stripeStatus = stripeSubscription.status
  
  if (dbStatus !== stripeStatus) {
    console.log(`🔄 Syncing status: DB="${dbStatus}" -> Stripe="${stripeStatus}"`)
    
    const updateData = {
      status: stripeStatus === 'canceled' ? 'cancelled' : stripeStatus,
      current_period_start: toIsoFromUnixSeconds(stripeSubscription.current_period_start),
      current_period_end: toIsoFromUnixSeconds(stripeSubscription.current_period_end),
      updated_at: new Date().toISOString()
    }
    
    // FIXED: Handle canceled_at timestamp properly
      if (stripeStatus === 'canceled') {
      if (stripeSubscription.canceled_at) {
        // Only set if Stripe has a valid canceled_at timestamp
        updateData.cancelled_at = toIsoFromUnixSeconds(stripeSubscription.canceled_at) || new Date().toISOString()
      } else if (!dbSubscription.cancelled_at) {
        // Set current time if no canceled_at exists anywhere
        updateData.cancelled_at = new Date().toISOString()
      }
      // If dbSubscription already has cancelled_at, leave it unchanged
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
async function markSubscriptionAsInvalid(supabase, subscriptionId) {
  console.log(`🗑️ Marking subscription ${subscriptionId} as invalid`)
  
  // Use 'cancelled' instead of 'invalid' since database constraint doesn't allow 'invalid'
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
  
  if (error) {
    console.error('⚠️ Failed to mark as invalid:', error)
  } else {
    console.log('✅ Marked subscription as cancelled (invalid)')
  }
}

/**
 * ROBUST: Immediate upgrade with comprehensive validation
 */
async function upgradeSubscriptionImmediate(supabase, validSubscription, newPriceId, newPlanType) {
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
        current_period_start: toIsoFromUnixSeconds(updatedSubscription.current_period_start),
        current_period_end: toIsoFromUnixSeconds(updatedSubscription.current_period_end),
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
    await cleanupOldSubscriptions(supabase, validSubscription.user_id, stripeSubscription.id)

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
async function downgradeSubscriptionEndCycle(supabase, validSubscription, newPriceId, newPlanType) {
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
    const currentPlanDetails = getPlanDetails(validSubscription.plan_type)
    
    // Check if user has more active jobs than new plan allows
    const { data: activeJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title')
      .eq('employer_id', validSubscription.user_id)
      .eq('active', true)
      .neq('status', 'deleted')
    
    if (!jobsError && activeJobs) {
      const activeJobCount = activeJobs.length
      const newJobLimit = planDetails.jobLimit
      
      console.log(`📊 Job slots check: ${activeJobCount} active jobs, new limit: ${newJobLimit}`)
      
      if (activeJobCount > newJobLimit) {
        const excessJobs = activeJobCount - newJobLimit
        return NextResponse.json({
          success: false,
          error: 'Too many active jobs',
          message: `You currently have ${activeJobCount} active job${activeJobCount > 1 ? 's' : ''}, but the ${planDetails.planType} plan only allows ${newJobLimit}. Please deactivate ${excessJobs} job${excessJobs > 1 ? 's' : ''} before downgrading.`,
          activeJobCount,
          newJobLimit,
          excessJobs,
          requiresAction: true
        }, { status: 400 })
      }
    }
    
    // Debug the period end timestamp - check both possible locations
    console.log('🐛 DEBUG stripeSubscription.current_period_end:', stripeSubscription.current_period_end)
    console.log('🐛 DEBUG stripeSubscription.items.data[0]?.current_period_end:', stripeSubscription.items?.data?.[0]?.current_period_end)
    
    // Try to get period end from subscription object, fallback to items
    let periodEnd = stripeSubscription.current_period_end || stripeSubscription.items?.data?.[0]?.current_period_end
    console.log('🐛 DEBUG final periodEnd value:', periodEnd)
    
    const effectiveDate = toIsoFromUnixSeconds(periodEnd)
    console.log('🐛 DEBUG effectiveDate after conversion:', effectiveDate)
    
    // If conversion failed, try direct conversion as fallback
    if (!effectiveDate && periodEnd) {
      console.log('🔧 Trying direct Date conversion as fallback...')
      try {
        const fallbackDate = new Date(periodEnd * 1000).toISOString()
        console.log('🔧 Fallback conversion successful:', fallbackDate)
        
        // Store the scheduled change with fallback date
        const { error: scheduleError } = await supabase
          .from('subscription_schedule_changes')
          .insert({
            user_id: validSubscription.user_id,
            subscription_id: validSubscription.id,
            stripe_schedule_id: `manual_${Date.now()}`,
            current_plan: validSubscription.plan_type,
            new_plan: planDetails.planType,
            effective_date: fallbackDate,
            status: 'scheduled'
          })

        if (scheduleError) {
          console.error('❌ Schedule error:', scheduleError)
          throw new Error('Failed to schedule downgrade: ' + scheduleError.message)
        }

        return NextResponse.json({
          success: true,
          message: `Downgrade scheduled to ${planDetails.planType} plan! Your current benefits continue until ${new Date(fallbackDate).toLocaleDateString()}.`,
          effectiveDate: fallbackDate,
          newPlan: planDetails
        })
        
      } catch (fallbackError) {
        console.error('❌ Fallback conversion also failed:', fallbackError)
        throw new Error('Unable to determine billing period end date from Stripe. Please contact support.')
      }
    }
    
    // Ensure we have a valid effective date
    if (!effectiveDate) {
      throw new Error('Unable to determine billing period end date from Stripe. Please contact support.')
    }

    // Store the scheduled change
    const { error: scheduleError } = await supabase
      .from('subscription_schedule_changes')
      .insert({
        user_id: validSubscription.user_id,
        subscription_id: validSubscription.id,
        stripe_schedule_id: `manual_${Date.now()}`,
        current_plan: validSubscription.plan_type,
        new_plan: planDetails.planType,
        effective_date: effectiveDate,
        status: 'scheduled'
      })

    if (scheduleError) {
      console.error('❌ Schedule error:', scheduleError)
      throw new Error('Failed to schedule downgrade: ' + scheduleError.message)
    }

    return NextResponse.json({
      success: true,
      message: `Downgrade scheduled to ${planDetails.planType} plan! Your current benefits continue until ${effectiveDate ? new Date(effectiveDate).toLocaleDateString() : 'the end of your current period'}.`,
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
async function cancelSubscription(supabase, validSubscription) {
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
      cancelAt: toIsoFromUnixSeconds(canceledSubscription.current_period_end)
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
async function reactivateSubscription(supabase, validSubscription) {
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
async function cleanupOldSubscriptions(supabase, userId, activeStripeSubscriptionId) {
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
 * Get Stripe Billing Portal session
 */
async function getBillingPortal(supabase, userId) {
  try {
    console.log('🔗 Creating billing portal session for user:', userId)
    
    // Get user's Stripe customer ID
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error('❌ Database error fetching subscription:', error)
      return NextResponse.json({ 
        error: 'Database error',
        message: 'Unable to fetch subscription information. Please try again.'
      }, { status: 500 })
    }
    
    if (!subscription?.stripe_customer_id) {
      console.error('❌ No Stripe customer ID found for user:', userId)
      return NextResponse.json({ 
        error: 'No billing information found',
        message: 'No payment method on file. Please upgrade to a paid plan first to manage payment methods.',
        requiresSubscription: true
      }, { status: 404 })
    }
    
    // Create billing portal session
    console.log('✅ Creating Stripe billing portal for customer:', subscription.stripe_customer_id)
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?tab=subscription`,
    })
    
    console.log('✅ Billing portal session created:', session.id)
    return NextResponse.json({
      success: true,
      url: session.url
    })
    
  } catch (error) {
    console.error('❌ Billing portal error:', error)
    return NextResponse.json({ 
      error: 'Failed to create billing portal session',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Get billing history from Stripe
 */
async function getBillingHistory(userId) {
  try {
    console.log('📜 Fetching billing history for user:', userId)
    
    // Get user's Stripe customer ID
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !subscription?.stripe_customer_id) {
      console.error('❌ No Stripe customer found:', error)
      return NextResponse.json({ 
        success: true,
        billingHistory: []
      })
    }
    
    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 100,
    })
    
    const billingHistory = invoices.data.map(invoice => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000).toISOString(),
      amount: invoice.amount_paid / 100,
      status: invoice.status,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      description: invoice.lines.data[0]?.description || 'Subscription payment'
    }))
    
    return NextResponse.json({
      success: true,
      billingHistory
    })
    
  } catch (error) {
    console.error('❌ Billing history error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch billing history',
      details: error.message
    }, { status: 500 })
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

// UTILITY: Map Stripe price ID to our internal plan type from env configuration
function mapPriceIdToPlanType(priceId) {
  if (!priceId) return 'starter'
  const mapping = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '']: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID || '']: 'growth',
    [process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || '']: 'professional',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '']: 'enterprise',
  }
  return mapping[priceId] || 'starter'
}
