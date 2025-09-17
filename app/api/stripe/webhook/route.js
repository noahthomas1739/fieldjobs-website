import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createClient } from '@supabase/supabase-js'

// Use service role client for webhooks (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  console.log('🔵 WEBHOOK STARTED')
  
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    
    console.log('✅ Signature present:', !!signature)
    console.log('✅ Webhook secret present:', !!process.env.STRIPE_WEBHOOK_SECRET)
    
    if (!signature) {
      console.error('❌ Missing Stripe signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
      console.log('✅ Webhook signature verified successfully')
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('🔵 Received Stripe webhook:', event.type)

    // Handle different webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
        
      default:
        console.log(`🔵 Unhandled event type: ${event.type}`)
    }

    console.log('✅ Webhook completed successfully')
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error.message)
    console.error('❌ WEBHOOK ERROR STACK:', error.stack)
    return NextResponse.json({ error: 'Webhook failed: ' + error.message }, { status: 500 })
  }
}

// Handle checkout completion (existing functionality)
async function handleCheckoutCompleted(session) {
  console.log('🔵 === CHECKOUT COMPLETED ===')
  
  if (session.mode === 'subscription') {
    console.log('🔵 Processing subscription checkout...')
    await handleSubscriptionSuccess(session)
  } else {
    console.log('🔵 Non-subscription checkout, skipping')
  }
}

// Handle subscription creation (NEW)
async function handleSubscriptionCreated(subscription) {
  console.log('🔵 === SUBSCRIPTION CREATED ===')
  console.log('🔵 Subscription ID:', subscription.id)
  console.log('🔵 Customer ID:', subscription.customer)
  console.log('🔵 Status:', subscription.status)
  
  try {
    // Find user by customer ID
    const { data: existingSub, error: findError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer)
      .limit(1)
      .single()
    
    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error finding user:', findError)
      throw new Error('Could not find user for customer: ' + subscription.customer)
    }
    
    if (!existingSub) {
      console.log('⚠️ No existing subscription found for customer, skipping')
      return
    }
    
    await syncSubscriptionToDatabase(subscription, existingSub.user_id)
    console.log('✅ Subscription created and synced')
    
  } catch (error) {
    console.error('❌ Subscription creation error:', error)
    throw error
  }
}

// Handle subscription updates (NEW)
async function handleSubscriptionUpdated(subscription) {
  console.log('🔵 === SUBSCRIPTION UPDATED ===')
  console.log('🔵 Subscription ID:', subscription.id)
  console.log('🔵 Status:', subscription.status)
  
  try {
    // Find subscription in database
    const { data: dbSubscription, error: findError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()
    
    if (findError) {
      console.error('❌ Could not find subscription in database:', findError)
      // Try to find by customer ID as fallback
      const { data: customerSub, error: customerError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', subscription.customer)
        .single()
      
      if (customerError) {
        console.log('⚠️ No subscription found to update, skipping')
        return
      }
      
      await syncSubscriptionToDatabase(subscription, customerSub.user_id)
    } else {
      await syncSubscriptionToDatabase(subscription, dbSubscription.user_id)
    }
    
    console.log('✅ Subscription updated and synced')
    
  } catch (error) {
    console.error('❌ Subscription update error:', error)
    throw error
  }
}

// Handle subscription deletion (NEW - CRITICAL FOR PREVENTING ORPHANS)
async function handleSubscriptionDeleted(subscription) {
  console.log('🔵 === SUBSCRIPTION DELETED ===')
  console.log('🔵 Subscription ID:', subscription.id)
  console.log('🔵 Customer ID:', subscription.customer)
  
  try {
    // Mark subscription as cancelled in database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)
    
    if (updateError) {
      console.error('❌ Error marking subscription as cancelled:', updateError)
      throw updateError
    }
    
    console.log('✅ Subscription marked as cancelled in database')
    
    // Cancel any scheduled changes
    const { error: scheduleError } = await supabase
      .from('subscription_schedule_changes')
      .update({ status: 'cancelled' })
      .eq('stripe_schedule_id', subscription.id)
    
    if (scheduleError) {
      console.log('⚠️ Error cancelling scheduled changes:', scheduleError)
    }
    
  } catch (error) {
    console.error('❌ Subscription deletion error:', error)
    throw error
  }
}

// Handle payment failures (NEW)
async function handlePaymentFailed(invoice) {
  console.log('🔵 === PAYMENT FAILED ===')
  console.log('🔵 Invoice ID:', invoice.id)
  console.log('🔵 Subscription ID:', invoice.subscription)
  
  try {
    if (invoice.subscription) {
      // Update subscription status based on payment failure
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', invoice.subscription)
      
      if (updateError) {
        console.error('❌ Error updating subscription status:', updateError)
      } else {
        console.log('✅ Subscription marked as past_due')
      }
    }
    
  } catch (error) {
    console.error('❌ Payment failure handling error:', error)
    throw error
  }
}

// Sync subscription data to database (ENHANCED)
async function syncSubscriptionToDatabase(subscription, userId) {
  console.log('🔵 Syncing subscription to database...')
  
  // Determine plan type from price ID
  const priceId = subscription.items.data[0]?.price?.id
  const planType = getPlanTypeFromPriceId(priceId)
  
  const planLimits = {
    starter: { active_jobs_limit: 3, credits: 0, price: 19900 },
    growth: { active_jobs_limit: 6, credits: 5, price: 29900 },
    professional: { active_jobs_limit: 15, credits: 25, price: 59900 },
    enterprise: { active_jobs_limit: 999999, credits: 100, price: 199900 }
  }
  
  const limits = planLimits[planType] || planLimits.starter
  
  const subscriptionData = {
    plan_type: planType,
    status: subscription.status === 'canceled' ? 'cancelled' : subscription.status,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    active_jobs_limit: limits.active_jobs_limit,
    credits: limits.credits,
    price: limits.price,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Add cancelled_at if subscription is cancelled
  if (subscription.status === 'canceled') {
    subscriptionData.cancelled_at = subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : new Date().toISOString()
  }
  
  console.log('🔵 Subscription data:', JSON.stringify(subscriptionData, null, 2))
  
  // Update or insert subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      ...subscriptionData
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
  
  if (error) {
    console.error('❌ Error syncing subscription:', error)
    throw error
  }
  
  console.log('✅ Subscription synced successfully')
}

// Get plan type from price ID
function getPlanTypeFromPriceId(priceId) {
  const priceMapping = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID]: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID]: 'growth',
    [process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID]: 'professional',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
  }
  
  return priceMapping[priceId] || 'starter'
}

// Original subscription success handler (ENHANCED)
async function handleSubscriptionSuccess(session) {
  console.log('🔵 === SUBSCRIPTION HANDLER STARTED ===')
  
  try {
    // Test database connection
    console.log('🔵 Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('subscriptions')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ DATABASE CONNECTION FAILED:', testError)
      throw new Error('Database connection failed: ' + testError.message)
    }
    console.log('✅ Database connection successful')
    
    // Handle both naming conventions
    const userId = session.metadata.userId || session.metadata.user_id
    const planType = session.metadata.planType || session.metadata.plan_type
    
    console.log('🔵 User ID from metadata:', userId)
    console.log('🔵 Plan type from metadata:', planType)
    
    if (!userId) {
      console.error('❌ No userId found in metadata')
      throw new Error('Missing userId in metadata')
    }
    
    if (!planType) {
      console.error('❌ No planType found in metadata')
      throw new Error('Missing planType in metadata')
    }

    console.log('🔵 Retrieving Stripe subscription...')
    const subscription = await stripe.subscriptions.retrieve(session.subscription)
    console.log('✅ Stripe subscription retrieved:', subscription.id)
    
    // Clean up any old subscriptions before creating new one
    await cleanupOldSubscriptions(userId, subscription.id)
    
    // Sync subscription to database
    await syncSubscriptionToDatabase(subscription, userId)
    
    console.log('✅ === SUBSCRIPTION HANDLER COMPLETED ===')
    
  } catch (error) {
    console.error('❌ === SUBSCRIPTION HANDLER FAILED ===')
    console.error('❌ Handler error:', error.message)
    console.error('❌ Handler error stack:', error.stack)
    throw error
  }
}

// Clean up old subscriptions to prevent duplicates
async function cleanupOldSubscriptions(userId, newSubscriptionId) {
  console.log('🔵 Cleaning up old subscriptions...')
  
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'replaced',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .neq('stripe_subscription_id', newSubscriptionId)
    .in('status', ['active', 'trialing'])
  
  if (error) {
    console.error('⚠️ Cleanup error:', error)
  } else {
    console.log('✅ Old subscriptions cleaned up')
  }
}
