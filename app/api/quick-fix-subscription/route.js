// /app/api/quick-fix-subscription/route.js - Updated with better error handling
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// Helper function to safely convert timestamps
function safeTimestampToISO(timestamp) {
  try {
    if (!timestamp) return new Date().toISOString()
    const date = new Date(timestamp * 1000)
    if (isNaN(date.getTime())) return new Date().toISOString()
    return date.toISOString()
  } catch (error) {
    console.log('Date conversion error:', error)
    return new Date().toISOString()
  }
}

// Helper function to get plan details from price ID
function getPlanFromPriceId(priceId) {
  const priceMapping = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID]: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID]: 'growth',
    [process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID]: 'professional',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
  }
  
  return priceMapping[priceId] || 'starter'
}

// Helper function to get plan limits
function getPlanLimits(planType) {
  const limits = {
    starter: { active_jobs_limit: 3, credits: 0 },
    growth: { active_jobs_limit: 6, credits: 5 },
    professional: { active_jobs_limit: 15, credits: 25 },
    enterprise: { active_jobs_limit: 999999, credits: 100 }
  }
  return limits[planType] || limits.starter
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { userId, customerId } = await request.json()
    
    console.log('🔧 Quick fix for user:', userId, 'customer:', customerId)
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Use the provided customer ID or default
    const targetCustomerId = customerId || 'cus_St6N5Rxtuirnsp'
    
    // Get all active subscriptions for the customer
    console.log('🔍 Fetching subscriptions for customer:', targetCustomerId)
    
    const subscriptions = await stripe.subscriptions.list({
      customer: targetCustomerId,
      status: 'active',
      expand: ['data.items.data.price']
    })
    
    console.log('📊 Found', subscriptions.data.length, 'active subscriptions')
    
    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found in Stripe',
        syncedCount: 0,
        totalFound: 0,
        results: []
      })
    }

    let syncedCount = 0
    const results = []
    
    for (const sub of subscriptions.data) {
      try {
        console.log('🔄 Processing subscription:', sub.id)
        console.log('📋 Subscription details:', {
          id: sub.id,
          status: sub.status,
          customer: sub.customer,
          created: sub.created,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end
        })

        // Check if already exists
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single()
          
        if (existing) {
          console.log('✅ Already exists:', sub.id)
          results.push({ id: sub.id, action: 'already_exists' })
          continue
        }
        
        // Get price info safely
        const priceId = sub.items?.data?.[0]?.price?.id
        if (!priceId) {
          console.log('⚠️ No price ID found for subscription:', sub.id)
          results.push({ id: sub.id, action: 'error', error: 'No price ID found' })
          continue
        }

        const planType = getPlanFromPriceId(priceId)
        const planLimits = getPlanLimits(planType)
        
        console.log('📋 Plan mapping:', { priceId, planType, limits: planLimits })
        
        // Safely convert dates
        const currentPeriodStart = safeTimestampToISO(sub.current_period_start)
        const currentPeriodEnd = safeTimestampToISO(sub.current_period_end)
        
        console.log('📅 Date conversion:', {
          raw_start: sub.current_period_start,
          raw_end: sub.current_period_end,
          iso_start: currentPeriodStart,
          iso_end: currentPeriodEnd
        })
        
        // Insert subscription
        const insertData = {
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          plan_type: planType,
          status: 'active',
          active_jobs_limit: planLimits.active_jobs_limit,
          credits: planLimits.credits,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        console.log('💾 Inserting subscription data:', insertData)

        const { data: newSub, error } = await supabase
          .from('subscriptions')
          .insert(insertData)
          .select()
          .single()
          
        if (error) {
          console.error('❌ Database error:', error)
          results.push({ id: sub.id, action: 'error', error: error.message })
        } else {
          console.log('✅ Successfully created subscription:', newSub.id)
          syncedCount++
          results.push({ 
            id: sub.id, 
            action: 'created', 
            planType,
            dbId: newSub.id,
            nextBilling: currentPeriodEnd
          })
        }
        
      } catch (subError) {
        console.error('❌ Error processing subscription:', sub.id, subError)
        results.push({ 
          id: sub.id, 
          action: 'error', 
          error: subError.message 
        })
      }
    }
    
    console.log('🎯 Quick fix completed:', { syncedCount, totalFound: subscriptions.data.length })
    
    return NextResponse.json({
      success: true,
      message: `Quick fix complete! Synced ${syncedCount} subscriptions`,
      syncedCount,
      totalFound: subscriptions.data.length,
      results,
      debug: {
        customerId: targetCustomerId,
        subscriptionsFound: subscriptions.data.length
      }
    })
    
  } catch (error) {
    console.error('❌ Quick fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'Quick fix failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}