// /app/api/stripe/create-subscription/route.js - Fixed for immediate billing

console.log('Environment check:', {
  hasGrowth: !!process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID,
  hasProfessional: !!process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
  hasEnterprise: !!process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
  hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY
})

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { priceId, planType, userId } = await request.json()

    console.log('🛒 Checkout request:', { priceId, planType, userId })

    if (!userId || !priceId || !planType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // CRITICAL: Check for existing active subscriptions
    const { data: existingSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (subError) {
      console.error('❌ Error checking subscriptions:', subError)
      return NextResponse.json({ error: 'Failed to check existing subscriptions' }, { status: 500 })
    }

    // Block if user already has an active subscription
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      const activeSub = existingSubscriptions[0]
      console.log('🚫 User already has active subscription:', activeSub.plan_type)
      
      return NextResponse.json({ 
        error: 'You already have an active subscription',
        currentPlan: activeSub.plan_type,
        message: `You currently have an active ${activeSub.plan_type} plan. Please use the upgrade/downgrade options instead of purchasing a new subscription.`,
        shouldUpgrade: true
      }, { status: 400 })
    }

    // Get customer from profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    console.log('👤 User profile found:', {
      customerId: userProfile?.stripe_customer_id,
      email: userProfile?.email
    })

    // Get or create customer
    let customerId = userProfile?.stripe_customer_id

    // If we have a customer ID, verify it exists in Stripe
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (customer.deleted) {
          console.log('⚠️ Customer is deleted, will create new one')
          customerId = null
        } else {
          console.log('✅ Existing customer verified:', customerId)
        }
      } catch (error) {
        console.log('⚠️ Customer not found in Stripe, will create new one:', error.message)
        customerId = null
      }
    }

    // Double-check in Stripe for any active subscriptions (using correct customer ID)
    if (customerId) {
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

    // Create new customer if needed (with duplicate prevention)
    if (!customerId) {
      try {
        // FIRST: Search for existing customers with the same email
        console.log('🔍 Searching for existing customers with email:', userProfile.email)
        const existingCustomers = await stripe.customers.list({
          email: userProfile.email,
          limit: 10
        })

        // Use existing customer if found (and not deleted)
        if (existingCustomers.data.length > 0) {
          const activeCustomer = existingCustomers.data.find(customer => !customer.deleted)
          if (activeCustomer) {
            customerId = activeCustomer.id
            console.log('✅ Found existing customer, reusing:', customerId)

            // Update the profiles table with the found customer ID
            await supabase
              .from('profiles')
              .update({ stripe_customer_id: customerId })
              .eq('id', userId)

            console.log('✅ Updated profile with existing customer ID')
          }
        }

        // ONLY create new customer if none found
        if (!customerId) {
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

          // Update the profiles table with the new customer ID
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)

          console.log('✅ Updated profile with new customer ID')
        }
      } catch (error) {
        console.error('❌ Failed to create/find customer:', error)
        return NextResponse.json({ 
          error: 'Failed to create customer',
          details: error.message 
        }, { status: 500 })
      }
    }

    // FIXED: Create checkout session with IMMEDIATE billing for new subscriptions
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
        // CRITICAL FIX: Ensure immediate billing for new subscriptions
        trial_period_days: 0, // No free trial - start billing immediately
        proration_behavior: 'none' // Don't prorate for new subscriptions - charge full amount
      },
      // Ensure immediate collection
      allow_promotion_codes: false
    })

    console.log('✅ Checkout session created with immediate billing:', session.id)

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('❌ Checkout creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    }, { status: 500 })
  }
}
