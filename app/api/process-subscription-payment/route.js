// /app/api/process-subscription-payment/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { sessionId, planType, userId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Get user info from session metadata
    const userIdFromSession = session.metadata?.userId || userId
    const planFromSession = session.metadata?.newPlan || planType
    const isUpgrade = session.metadata?.type === 'subscription_upgrade'

    if (!userIdFromSession || !planFromSession) {
      return NextResponse.json({ error: 'Missing user or plan information' }, { status: 400 })
    }

    console.log(`🔄 Processing ${isUpgrade ? 'upgrade' : 'new subscription'} for user:`, userIdFromSession, 'to plan:', planFromSession)

    // Get plan details
    const planDetails = {
      'starter': { active_jobs_limit: 3, credits: 5, price: 19900 },
      'growth': { active_jobs_limit: 6, credits: 10, price: 29900 },
      'professional': { active_jobs_limit: 15, credits: 25, price: 59900 },
      'enterprise': { active_jobs_limit: 999, credits: 999, price: 199900 }
    }

    const plan = planDetails[planFromSession]
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    // ALWAYS cancel all existing active subscriptions first (cleanup)
    console.log('🧹 Cleaning up all existing active subscriptions...')
    
    const { data: existingSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('user_id', userIdFromSession)
      .eq('status', 'active')

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      console.log(`Found ${existingSubscriptions.length} existing active subscriptions to cancel`)
      
      // Cancel in Stripe (if we haven't already)
      for (const sub of existingSubscriptions) {
        if (sub.stripe_subscription_id) {
          try {
            const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
            if (stripeSubscription.status === 'active') {
              await stripe.subscriptions.cancel(sub.stripe_subscription_id)
              console.log('✅ Cancelled Stripe subscription:', sub.stripe_subscription_id)
            }
          } catch (error) {
            console.log('ℹ️ Stripe subscription already cancelled or not found:', sub.stripe_subscription_id)
          }
        }
      }

      // Mark all as cancelled in database
      await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('user_id', userIdFromSession)
        .eq('status', 'active')

      console.log('✅ Marked all existing subscriptions as cancelled')
    }

    // Create the new subscription record
    const { data: newSubscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userIdFromSession,
        plan_type: planFromSession,
        status: 'active',
        active_jobs_limit: plan.active_jobs_limit,
        credits: plan.credits,
        price: plan.price,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating new subscription:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create new subscription',
        details: insertError.message 
      }, { status: 500 })
    }

    console.log('✅ Created new subscription:', newSubscription)

    // Verify we only have one active subscription now
    const { data: finalCheck } = await supabase
      .from('subscriptions')
      .select('id, plan_type')
      .eq('user_id', userIdFromSession)
      .eq('status', 'active')

    console.log(`✅ Final check: User now has ${finalCheck?.length || 0} active subscription(s)`)

    const actionType = isUpgrade ? 'changed to' : 'subscribed to'
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully ${actionType} ${planFromSession} plan!`,
      plan: planFromSession,
      subscription: newSubscription
    })

  } catch (error) {
    console.error('❌ Error processing subscription payment:', error)
    return NextResponse.json({ 
      error: 'Failed to process subscription payment',
      details: error.message 
    }, { status: 500 })
  }
}