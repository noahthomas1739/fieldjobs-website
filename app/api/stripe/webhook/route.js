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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      console.log('🔵 Checkout session completed:', session.id)
      console.log('🔵 Session mode:', session.mode)
      console.log('🔵 Session metadata:', JSON.stringify(session.metadata, null, 2))

      if (session.mode === 'subscription') {
        console.log('🔵 Processing subscription...')
        try {
          await handleSubscriptionSuccess(session)
          console.log('✅ Subscription processed successfully')
        } catch (subError) {
          console.error('❌ SUBSCRIPTION ERROR:', subError.message)
          console.error('❌ SUBSCRIPTION ERROR STACK:', subError.stack)
          throw subError
        }
      }
    }

    console.log('✅ Webhook completed successfully')
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error.message)
    console.error('❌ WEBHOOK ERROR STACK:', error.stack)
    return NextResponse.json({ error: 'Webhook failed: ' + error.message }, { status: 500 })
  }
}

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
    
    const planLimits = {
      starter: { active_jobs_limit: 3, credits: 0, price: 19900 },
      growth: { active_jobs_limit: 6, credits: 5, price: 29900 },
      professional: { active_jobs_limit: 15, credits: 25, price: 59900 },
      enterprise: { active_jobs_limit: 999999, credits: 100, price: 199900 }
    }
    
    const limits = planLimits[planType] || planLimits.starter
    console.log('🔵 Plan limits for', planType, ':', limits)

    // Check if subscription exists
    console.log('🔵 Checking for existing subscription...')
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing subscription:', checkError)
      throw new Error('Database error checking subscription: ' + checkError.message)
    }

    if (existingSubscription) {
      console.log('🔵 Found existing subscription, will update')
    } else {
      console.log('🔵 No existing subscription, will create new')
    }

    const subscriptionData = {
      plan_type: planType,
      status: 'active',
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer,
      active_jobs_limit: limits.active_jobs_limit,
      credits: limits.credits,
      price: limits.price,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('🔵 Subscription data to save:', JSON.stringify(subscriptionData, null, 2))

    if (existingSubscription) {
      console.log('🔵 Updating existing subscription...')
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId)

      if (error) {
        console.error('❌ Error updating subscription:', error)
        console.error('❌ Update error details:', JSON.stringify(error, null, 2))
        throw new Error('Database error updating subscription: ' + error.message)
      }
      console.log('✅ Updated existing subscription successfully')
      console.log('🔵 Update result:', data)
    } else {
      console.log('🔵 Creating new subscription...')
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          ...subscriptionData,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Error creating subscription:', error)
        console.error('❌ Insert error details:', JSON.stringify(error, null, 2))
        throw new Error('Database error creating subscription: ' + error.message)
      }
      console.log('✅ Created new subscription successfully')
      console.log('🔵 Insert result:', data)
    }

    console.log('✅ === SUBSCRIPTION HANDLER COMPLETED ===')
    
  } catch (error) {
    console.error('❌ === SUBSCRIPTION HANDLER FAILED ===')
    console.error('❌ Handler error:', error.message)
    console.error('❌ Handler error stack:', error.stack)
    throw error
  }
}
