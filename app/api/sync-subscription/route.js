// /app/api/sync-subscription/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// Enhanced plan limits function
function getPlanLimits(planType) {
  const limits = {
    starter: { active_jobs_limit: 3, credits: 0 },
    growth: { active_jobs_limit: 6, credits: 5 },
    professional: { active_jobs_limit: 15, credits: 25 },
    enterprise: { active_jobs_limit: 999999, credits: 100 }
  }
  return limits[planType] || limits.starter
}

// Price ID to plan mapping
function getPlanTypeFromPriceId(priceId) {
  const priceMapping = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID]: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID]: 'growth', 
    [process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID]: 'professional',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
  }
  
  return priceMapping[priceId] || 'starter'
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🔍 Starting sync for user:', userId)

    // Step 1: Get user's customer ID from database
    const { data: existingSubscriptions } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .limit(1)

    let stripeCustomerId = null
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      stripeCustomerId = existingSubscriptions[0].stripe_customer_id
    }

    console.log('🔍 Found existing customer ID:', stripeCustomerId)

    // Step 2: If no customer ID in database, try to find customer by user metadata
    if (!stripeCustomerId) {
      console.log('🔍 No customer ID in database, searching Stripe customers...')
      
      // Search for customers - you might need to search by email or other metadata
      const customers = await stripe.customers.list({
        limit: 100,
        expand: ['data.subscriptions']
      })
      
      console.log('📊 Found', customers.data.length, 'total customers in Stripe')
      
      // For now, let's look at ALL customers and their subscriptions to debug
      for (const customer of customers.data) {
        if (customer.subscriptions.data.length > 0) {
          console.log('👤 Customer:', customer.id, 'has', customer.subscriptions.data.length, 'subscriptions')
          for (const sub of customer.subscriptions.data) {
            console.log('  📋 Subscription:', sub.id, 'Status:', sub.status, 'Price:', sub.items.data[0]?.price?.id)
          }
        }
      }
    }

    // Step 3: Get active subscriptions for this customer
    let activeSubscriptions = []
    
    if (stripeCustomerId) {
      console.log('🔍 Fetching subscriptions for customer:', stripeCustomerId)
      
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        expand: ['data.items.data.price']
      })
      
      activeSubscriptions = subscriptions.data
      console.log('📊 Found', activeSubscriptions.length, 'active subscriptions for customer')
    } else {
      console.log('⚠️ No customer ID found, cannot fetch subscriptions')
      
      // Alternative: Show all active subscriptions in your account for debugging
      const allSubscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 10,
        expand: ['data.items.data.price', 'data.customer']
      })
      
      console.log('🔍 DEBUG: All active subscriptions in your Stripe account:')
      for (const sub of allSubscriptions.data) {
        console.log('  📋 Sub:', sub.id, 'Customer:', sub.customer, 'Price:', sub.items.data[0]?.price?.id)
      }
      
      return NextResponse.json({
        success: false,
        error: 'No customer ID found for user',
        debug: {
          totalActiveSubscriptions: allSubscriptions.data.length,
          subscriptions: allSubscriptions.data.map(sub => ({
            id: sub.id,
            customer: sub.customer,
            status: sub.status,
            priceId: sub.items.data[0]?.price?.id
          }))
        }
      })
    }

    // Step 4: Sync each active subscription
    let syncedCount = 0
    const syncResults = []

    for (const stripeSubscription of activeSubscriptions) {
      try {
        console.log('🔄 Processing subscription:', stripeSubscription.id)
        
        const priceId = stripeSubscription.items.data[0].price.id
        const planType = getPlanTypeFromPriceId(priceId)
        const planLimits = getPlanLimits(planType)
        
        console.log('📋 Subscription details:', {
          id: stripeSubscription.id,
          priceId,
          planType,
          status: stripeSubscription.status
        })

        // Check if subscription already exists in database
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', stripeSubscription.id)
          .single()

        if (existingSub) {
          console.log('✅ Subscription already exists in database:', existingSub.id)
          syncResults.push({ 
            subscriptionId: stripeSubscription.id, 
            action: 'already_exists',
            planType 
          })
          continue
        }

        // Create new subscription record
        const { data: newSubscription, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_customer_id: stripeSubscription.customer,
            stripe_subscription_id: stripeSubscription.id,
            plan_type: planType,
            status: 'active',
            active_jobs_limit: planLimits.active_jobs_limit,
            credits: planLimits.credits,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Error creating subscription:', insertError)
          syncResults.push({ 
            subscriptionId: stripeSubscription.id, 
            action: 'error', 
            error: insertError.message 
          })
        } else {
          console.log('✅ Created subscription in database:', newSubscription.id)
          syncedCount++
          syncResults.push({ 
            subscriptionId: stripeSubscription.id, 
            action: 'created',
            planType,
            dbId: newSubscription.id
          })
        }

      } catch (error) {
        console.error('❌ Error processing subscription:', stripeSubscription.id, error)
        syncResults.push({ 
          subscriptionId: stripeSubscription.id, 
          action: 'error', 
          error: error.message 
        })
      }
    }

    console.log('🎯 Sync completed:', { syncedCount, totalProcessed: activeSubscriptions.length })

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} subscriptions from Stripe`,
      syncedSubscriptions: syncedCount,
      totalFound: activeSubscriptions.length,
      results: syncResults,
      debug: {
        userId,
        stripeCustomerId,
        foundActiveSubscriptions: activeSubscriptions.length
      }
    })

  } catch (error) {
    console.error('❌ Sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to sync subscriptions',
      details: error.message
    }, { status: 500 })
  }
}