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
    
    console.log('Managing subscription:', { action, userId, newPriceId, newPlanType, subscriptionId })

    // Get user's current subscription from database
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (subError || !currentSub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    switch (action) {
      case 'cancel':
        return await cancelSubscription(currentSub)
      
      case 'upgrade_immediate':
        return await upgradeSubscriptionImmediate(currentSub, newPriceId, newPlanType)
      
      case 'downgrade_end_cycle':
        return await downgradeSubscriptionEndCycle(currentSub, newPriceId, newPlanType)
      
      // Legacy support for old actions
      case 'upgrade':
      case 'downgrade':
        return await changeSubscriptionPlan(currentSub, newPriceId)
      
      case 'reactivate':
        return await reactivateSubscription(currentSub)
      
      case 'get_billing_portal':
        return await createBillingPortalSession(currentSub.stripe_customer_id)
      
      case 'get_billing_history':
        return await getBillingHistory(currentSub.stripe_customer_id)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Subscription management error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// NEW: Immediate upgrade with proration
async function upgradeSubscriptionImmediate(currentSub, newPriceId, newPlanType) {
  try {
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    
    // Immediate upgrade with proration - customer pays difference now
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

    // Determine new plan details
    const planDetails = getPlanDetailsFromPriceId(newPriceId)
    
    // Update database immediately
    await supabase
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

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planDetails.planType} plan`,
      newPlan: planDetails
    })

  } catch (error) {
    console.error('Upgrade subscription error:', error)
    return NextResponse.json({ error: 'Failed to upgrade subscription' }, { status: 500 })
  }
}

// NEW: End-of-cycle downgrade using subscription schedules
async function downgradeSubscriptionEndCycle(currentSub, newPriceId, newPlanType) {
  try {
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    const currentPeriodEnd = subscription.current_period_end

    // Create subscription schedule for end-of-cycle change
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

    // Store the scheduled change information
    const planDetails = getPlanDetailsFromPriceId(newPriceId)
    const effectiveDate = new Date(currentPeriodEnd * 1000).toISOString()

    // Store scheduled change in database (optional tracking table)
    await supabase
      .from('subscription_schedule_changes')
      .upsert({
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

    return NextResponse.json({
      success: true,
      message: `Downgrade scheduled to ${planDetails.planType} plan`,
      effectiveDate: effectiveDate,
      newPlan: planDetails,
      scheduleId: schedule.id
    })

  } catch (error) {
    console.error('Downgrade subscription error:', error)
    return NextResponse.json({ error: 'Failed to schedule downgrade' }, { status: 500 })
  }
}

// Cancel subscription at period end
async function cancelSubscription(currentSub) {
  try {
    const subscription = await stripe.subscriptions.update(
      currentSub.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    )

    // Update database
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('user_id', currentSub.user_id)

    return NextResponse.json({
      success: true,
      message: 'Subscription will cancel at the end of your billing period',
      cancelAt: new Date(subscription.current_period_end * 1000).toISOString()
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}

// Legacy: Change subscription plan (immediate with proration)
async function changeSubscriptionPlan(currentSub, newPriceId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
    
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

    // Determine new plan details
    const planDetails = getPlanDetailsFromPriceId(newPriceId)
    
    // Update database
    await supabase
      .from('subscriptions')
      .update({
        plan_type: planDetails.planType,
        price: planDetails.price,
        active_jobs_limit: planDetails.jobLimit,
        credits: planDetails.credits,
        current_period_start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString()
      })
      .eq('user_id', currentSub.user_id)

    return NextResponse.json({
      success: true,
      message: `Successfully changed to ${planDetails.planType} plan`,
      newPlan: planDetails
    })

  } catch (error) {
    console.error('Change subscription error:', error)
    return NextResponse.json({ error: 'Failed to change subscription' }, { status: 500 })
  }
}

// Reactivate cancelled subscription
async function reactivateSubscription(currentSub) {
  try {
    const subscription = await stripe.subscriptions.update(
      currentSub.stripe_subscription_id,
      {
        cancel_at_period_end: false
      }
    )

    // Update database
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null
      })
      .eq('user_id', currentSub.user_id)

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully'
    })

  } catch (error) {
    console.error('Reactivate subscription error:', error)
    return NextResponse.json({ error: 'Failed to reactivate subscription' }, { status: 500 })
  }
}

// Create Stripe billing portal session
async function createBillingPortalSession(customerId) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?tab=billing`
    })

    return NextResponse.json({
      success: true,
      url: session.url
    })

  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json({ error: 'Failed to create billing portal' }, { status: 500 })
  }
}

// Get billing history
async function getBillingHistory(customerId) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
      status: 'paid'
    })

    const billingHistory = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      date: new Date(invoice.created * 1000).toISOString(),
      status: invoice.status,
      description: invoice.lines.data[0]?.description || 'Subscription',
      invoiceUrl: invoice.hosted_invoice_url
    }))

    return NextResponse.json({
      success: true,
      billingHistory
    })

  } catch (error) {
    console.error('Billing history error:', error)
    return NextResponse.json({ error: 'Failed to get billing history' }, { status: 500 })
  }
}

// Helper function to get plan details from price ID
function getPlanDetailsFromPriceId(priceId) {
  const planMapping = {
    // Single Job - handled separately as one-time payment
    'price_1Rk5zpRC3IxXIgoOLPKmUXgd': {
      planType: 'single_job',
      price: 9900, // $99
      jobLimit: 1,
      credits: 0,
      monthlyCredits: 0,
      featuredListings: 0,
      monthlyFeaturedListings: 0
    },
    // Starter Plan - $199
    'price_1RotACRC3IxXIgoOOTmG4lwU': {
      planType: 'starter',
      price: 19900, // $199
      jobLimit: 3,
      credits: 0,
      monthlyCredits: 0,
      featuredListings: 0,
      monthlyFeaturedListings: 0
    },
    // Growth Plan - $299
    'price_1RotHgRC3IxXIgoOOb6ag0tA': {
      planType: 'growth',
      price: 29900, // $299
      jobLimit: 6,
      credits: 5,
      monthlyCredits: 5,
      featuredListings: 0,
      monthlyFeaturedListings: 0
    },
    // Professional Plan - $599
    'price_1Rk5xGRC3IxXIgoOKFM0DRZd': {
      planType: 'professional', 
      price: 59900, // $599
      jobLimit: 15,
      credits: 25,
      monthlyCredits: 25,
      featuredListings: 2,
      monthlyFeaturedListings: 2
    },
    // Enterprise Plan - $1,999
    'price_1Rk5xzRC3IxXIgoO9EtZ0zny': {
      planType: 'enterprise',
      price: 199900, // $1,999
      jobLimit: 999999,
      credits: 100,
      monthlyCredits: 100,
      featuredListings: 5,
      monthlyFeaturedListings: 5
    }
  }

  return planMapping[priceId] || {
    planType: 'starter',
    price: 19900,
    jobLimit: 3,
    credits: 0,
    monthlyCredits: 0,
    featuredListings: 0,
    monthlyFeaturedListings: 0
  }
}
