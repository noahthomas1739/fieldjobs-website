// /app/api/stripe/create-subscription/route.js - Enhanced debugging
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// ENHANCED DEBUGGING - Add this at the very top
console.log('=== CREATE SUBSCRIPTION ROUTE STARTED ===')
console.log('Environment check:', {
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
  hasGrowth: !!process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID,
  hasProfessional: !!process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
  hasEnterprise: !!process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
  nodeEnv: process.env.NODE_ENV
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  console.log('=== POST REQUEST RECEIVED ===')
  
  try {
    console.log('Parsing request body...')
    const { priceId, planType, userId } = await request.json()
    console.log('Request data:', { priceId, planType, userId })

    if (!userId || !priceId || !planType) {
      console.log('Missing fields:', { userId: !!userId, priceId: !!priceId, planType: !!planType })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Checking existing subscriptions...')
    const { data: existingSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (subError) {
      console.error('❌ Supabase subscription check error:', subError)
      return NextResponse.json({ error: 'Failed to check existing subscriptions', details: subError.message }, { status: 500 })
    }

    console.log('Existing subscriptions found:', existingSubscriptions?.length || 0)

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      const activeSub = existingSubscriptions[0]
      console.log('🚫 Active subscription found:', activeSub.plan_type)
      
      return NextResponse.json({ 
        error: 'You already have an active subscription',
        currentPlan: activeSub.plan_type,
        message: `You currently have an active ${activeSub.plan_type} plan. Please use the upgrade/downgrade options instead of purchasing a new subscription.`,
        shouldUpgrade: true
      }, { status: 400 })
    }

    console.log('Getting user profile...')
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found', details: profileError.message }, { status: 404 })
    }

    console.log('User profile:', {
      hasCustomerId: !!userProfile?.stripe_customer_id,
      email: userProfile?.email
    })

    let customerId = userProfile?.stripe_customer_id

    // Verify existing customer in Stripe
    if (customerId) {
      console.log('Verifying existing customer in Stripe...')
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (customer.deleted) {
          console.log('⚠️ Customer is deleted, will create new one')
          customerId = null
        } else {
          console.log('✅ Existing customer verified:', customerId)
        }
      } catch (error) {
        console.log('⚠️ Customer not found in Stripe:', error.message)
        customerId = null
      }
    }

    // Check for active subscriptions in Stripe
    if (customerId) {
      console.log('Checking Stripe for active subscriptions...')
      try {
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active'
        })

        if (stripeSubscriptions.data.length > 0) {
          console.log('🚫 Found active subscription in Stripe:', stripeSubscriptions.data[0].id)
          return NextResponse.json({ 
            error: 'Active subscription found in Stripe',
            message: 'You have an active subscription. Please use upgrade/downgrade options.',
            shouldUpgrade: true
          }, { status: 400 })
        }
      } catch (error) {
        console.log('⚠️ Could not check Stripe subscriptions:', error.message)
      }
    }

    // Create or find customer
    if (!customerId) {
      console.log('Creating/finding customer...')
      try {
        // Search for existing customers
        const existingCustomers = await stripe.customers.list({
          email: userProfile.email,
          limit: 10
        })

        if (existingCustomers.data.length > 0) {
          const activeCustomer = existingCustomers.data.find(customer => !customer.deleted)
          if (activeCustomer) {
            customerId = activeCustomer.id
            console.log('✅ Found existing customer:', customerId)

            await supabase
              .from('profiles')
              .update({ stripe_customer_id: customerId })
              .eq('id', userId)
          }
        }

        if (!customerId) {
          console.log('Creating new customer...')
          const customer = await stripe.customers.create({
            email: userProfile.email,
            metadata: {
              userId: userId,
              createdBy: 'fieldjobs-app',
              createdAt: new Date().toISOString()
            }
          })
          customerId = customer.id
          console.log('✅ Created new customer:', customerId)

          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)
        }
      } catch (error) {
        console.error('❌ Customer creation failed:', error)
        return NextResponse.json({ 
          error: 'Failed to create customer',
          details: error.message 
        }, { status: 500 })
      }
    }

    console.log('Creating checkout session...')
    console.log('Session config:', {
      customerId,
      priceId,
      planType,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    })

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?success=true&plan=${planType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?canceled=true`,
      metadata: {
        userId: userId,
        planType: planType,
        isNewSubscription: 'true'
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planType: planType
        },
        trial_period_days: 0,
        proration_behavior: 'none'
      },
      allow_promotion_codes: false
    })

    console.log('✅ Checkout session created successfully:', session.id)

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('❌ FATAL ERROR in create-subscription:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
