// /app/api/stripe/create-subscription/route.js - Enhanced debugging
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
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



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

export async function POST(request) {
  console.log('=== POST REQUEST RECEIVED ===')
  
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    console.log('Parsing request body...')
    const { priceId, planType, userId } = await request.json()
    console.log('Request data:', { priceId, planType, userId })

    if (!userId || !planType) {
      console.log('Missing fields:', { userId: !!userId, planType: !!planType })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // If no priceId provided, use dynamic pricing
    let actualPriceId = priceId
    if (!actualPriceId) {
      console.log('No priceId provided, using dynamic pricing for plan:', planType)
      
      // Create dynamic price based on plan type
      const planPricing = {
        'starter': { amount: 19900, name: 'Starter Plan', description: '3 active jobs, basic features' },
        'growth': { amount: 29900, name: 'Growth Plan', description: '6 active jobs, 5 monthly credits' },
        'professional': { amount: 59900, name: 'Professional Plan', description: '15 active jobs, 25 monthly credits' },
        'enterprise': { amount: 199900, name: 'Enterprise Plan', description: 'Unlimited jobs, 100 monthly credits' }
      }
      
      const pricing = planPricing[planType]
      if (!pricing) {
        return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
      }
      
      // We'll create the subscription with price_data instead of priceId
      actualPriceId = null // Signal to use price_data
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
      
      // If they have a subscription, redirect to billing portal for upgrade/downgrade
      return NextResponse.json({ 
        error: 'Active subscription found in Stripe',
        currentPlan: activeSub.plan_type,
        message: 'You have an active subscription. Please use upgrade/downgrade options.',
        shouldUpgrade: true,
        redirectToBilling: true
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
          const activeSubscription = stripeSubscriptions.data[0]
          console.log('🚫 Found active subscription in Stripe:', activeSubscription.id)
          
          // Sync this subscription to the database so it shows up on next load
          console.log('🔄 Syncing missing subscription from Stripe to database...')
          try {
            const planDetails = getPlanDetailsFromAmount(activeSubscription.items.data[0]?.price?.unit_amount || 0)
            
            // Check if subscription already exists
            const { data: existingSub } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('user_id', userId)
              .eq('stripe_subscription_id', activeSubscription.id)
              .single()
            
            if (!existingSub) {
              // Insert new subscription
              const { error: insertError } = await supabase
                .from('subscriptions')
                .insert({
                  user_id: userId,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: activeSubscription.id,
                  plan_type: planDetails.planType,
                  status: 'active',
                  price: planDetails.price,
                  active_jobs_limit: planDetails.jobLimit,
                  credits: planDetails.credits,
                  current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              
              if (insertError) {
                console.error('⚠️ Failed to insert subscription:', insertError)
              } else {
                console.log('✅ Subscription synced to database')
              }
            } else {
              console.log('✅ Subscription already exists in database')
            }
          } catch (syncError) {
            console.error('⚠️ Failed to sync subscription to database:', syncError)
          }
          
          return NextResponse.json({ 
            error: 'Active subscription found in Stripe',
            message: 'You have an active subscription. Please use upgrade/downgrade options.',
            shouldUpgrade: true,
            redirectToBilling: true
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
      priceId: actualPriceId,
      planType,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    })

    // Create line item with either priceId or price_data
    let lineItem
    if (actualPriceId) {
      lineItem = { price: actualPriceId, quantity: 1 }
    } else {
      // Use dynamic pricing
      const planPricing = {
        'starter': { amount: 19900, name: 'Starter Plan', description: '3 active jobs, basic features' },
        'growth': { amount: 29900, name: 'Growth Plan', description: '6 active jobs, 5 monthly credits' },
        'professional': { amount: 59900, name: 'Professional Plan', description: '15 active jobs, 25 monthly credits' },
        'enterprise': { amount: 199900, name: 'Enterprise Plan', description: 'Unlimited jobs, 100 monthly credits' }
      }
      
      const pricing = planPricing[planType]
      lineItem = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: pricing.name,
            description: pricing.description
          },
          unit_amount: pricing.amount,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
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
        }
        // Removed trial_period_days: 0 - this was causing the Stripe error
        // For immediate billing, we simply omit trial_period_days
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

// Helper function to map Stripe price amounts to plan details
function getPlanDetailsFromAmount(amount) {
  const planMapping = {
    19900: { planType: 'starter', price: 19900, jobLimit: 3, credits: 0 },
    29900: { planType: 'growth', price: 29900, jobLimit: 6, credits: 5 },
    59900: { planType: 'professional', price: 59900, jobLimit: 15, credits: 25 },
    199900: { planType: 'enterprise', price: 199900, jobLimit: 999999, credits: 100 }
  }
  
  return planMapping[amount] || { planType: 'starter', price: 19900, jobLimit: 3, credits: 0 }
}
