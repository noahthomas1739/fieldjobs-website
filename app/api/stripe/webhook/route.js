import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  console.log('🔵 WEBHOOK STARTED')
  
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    
    console.log('🔵 Webhook body length:', body.length)
    console.log('🔵 Signature present:', !!signature)
    console.log('🔵 Webhook secret present:', !!process.env.STRIPE_WEBHOOK_SECRET)
    
    if (!signature) {
      console.error('❌ Missing Stripe signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable')
      return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
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
        await handleSubscriptionSuccess(session)
        console.log('✅ Subscription processed successfully')
      }
    }

    console.log('✅ Webhook completed successfully')
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json({ error: 'Webhook failed: ' + error.message }, { status: 500 })
  }
}

async function handleSubscriptionSuccess(session) {
  console.log('🔵 Starting subscription success handler')
  
  try {
    const supabase = createRouteHandlerClient({ cookies })
    console.log('✅ Supabase client created')
    
    // Handle both naming conventions
    const userId = session.metadata.userId || session.metadata.user_id
    const planType = session.metadata.planType || session.metadata.plan_type
    
    console.log('🔵 User ID:', userId)
    console.log('🔵 Plan type:', planType)
    
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
    console.log('🔵 Plan limits:', limits)

    // Check if subscription exists
    console.log('🔵 Checking for existing subscription...')
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing subscription:', checkError)
      throw checkError
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

    console.log('🔵 Subscription data to save:', subscriptionData)

    if (existingSubscription) {
      console.log('🔵 Updating existing subscription...')
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId)

      if (error) {
        console.error('❌ Error updating subscription:', error)
        throw error
      }
      console.log('✅ Updated existing subscription')
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
        throw error
      }
      console.log('✅ Created new subscription')
    }

    console.log('✅ Subscription success handler completed')
    
  } catch (error) {
    console.error('❌ Error in subscription success handler:', error)
    throw error
  }
}
