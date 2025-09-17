// app/api/subscription-status/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    console.log('📊 Fetching subscription status for user:', userId)

    // Get user's LATEST active subscription (in case of multiple)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }) // Get most recent first
      .limit(1)
      .single()

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching subscription:', subError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch subscription status' 
      }, { status: 500 })
    }

    // ENHANCED: If no active subscription in database, check Stripe directly
    if (!subscription) {
      console.log('🔍 No active subscription in database, checking Stripe...')
      
      // Get user's customer ID from any subscription record
      const { data: anySubscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (anySubscription?.stripe_customer_id) {
        try {
          // Check Stripe for active subscriptions
          const activeSubscriptions = await stripe.subscriptions.list({
            customer: anySubscription.stripe_customer_id,
            status: 'active',
            limit: 10
          })

          console.log(`🔍 Found ${activeSubscriptions.data.length} active subscriptions in Stripe`)

          if (activeSubscriptions.data.length > 0) {
            const stripeSubscription = activeSubscriptions.data[0] // Most recent
            
            // Sync the missing subscription to database
            const planDetails = getPlanDetailsFromStripeSubscription(stripeSubscription)
            console.log('🔄 Syncing missing subscription from Stripe:', planDetails.planType)
            
            // Clean up any old subscriptions first
            await cleanupOldSubscriptions(userId, stripeSubscription.id)

            
            console.log(`!!!! Most recent subscription: ${JSON.stringify(stripeSubscription)}`);
            console.log(`Stripe subsccription current_period_start: ${stripeSubscription.current_period_start}`);
            console.log(`Stripe subsccription current_period_end: ${stripeSubscription.current_period_end}`);
            const { data: syncedSubscription, error: syncError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: userId,
                stripe_customer_id: anySubscription.stripe_customer_id,
                stripe_subscription_id: stripeSubscription.id,
                plan_type: planDetails.planType,
                status: 'active',
                price: planDetails.price,
                active_jobs_limit: planDetails.jobLimit,
                credits: planDetails.credits,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()
            
            if (!syncError && syncedSubscription) {
              console.log('✅ Successfully synced missing subscription from Stripe')
              return await processSubscriptionResponse(userId, syncedSubscription)
            } else {
              console.error('❌ Failed to sync subscription:', syncError)
            }
          }
        } catch (stripeError) {
          console.error('⚠️ Error checking Stripe:', stripeError)
        }
      }
    }

    // If we found multiple active subscriptions, clean them up
    const { data: allActiveSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, created_at, plan_type, stripe_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (allActiveSubscriptions && allActiveSubscriptions.length > 1) {
      console.log(`⚠️ Found ${allActiveSubscriptions.length} active subscriptions for user ${userId}, cleaning up...`)
      
      // Keep only the most recent one, cancel the others
      const sortedSubs = allActiveSubscriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      const subsToCancel = sortedSubs.slice(1) // All except the first (most recent)
      
      if (subsToCancel.length > 0) {
        const idsToCancel = subsToCancel.map(sub => sub.id)
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .in('id', idsToCancel)
        
        console.log(`✅ Cancelled ${subsToCancel.length} duplicate subscriptions`)
      }
    }

    // Process the subscription response
    return await processSubscriptionResponse(userId, subscription)

  } catch (error) {
    console.error('❌ Subscription status server error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error while fetching subscription status' 
    }, { status: 500 })
  }
}

// Helper function to process subscription and credits
async function processSubscriptionResponse(userId, subscription) {
  // Get user's credit balance
  let totalCredits = 0
  const { data: creditBalance, error: creditError } = await supabase
    .from('credit_balances')
    .select('monthly_credits, purchased_credits, last_monthly_refresh')
    .eq('user_id', userId)
    .single()

  if (creditBalance) {
    // Check if monthly credits need refreshing
    const today = new Date()
    const lastRefresh = new Date(creditBalance.last_monthly_refresh)
    const daysDiff = Math.floor((today - lastRefresh) / (1000 * 60 * 60 * 24))

    let currentMonthlyCredits = creditBalance.monthly_credits

    if (daysDiff >= 30 && subscription) {
      console.log('🔄 Monthly credits refresh needed for user:', userId)
      
      const monthlyCredits = {
        'starter': 0,
        'growth': 5,
        'professional': 25,
        'enterprise': 100
      }[subscription.plan_type] || 0
      
      // Update monthly credits
      const { error: refreshError } = await supabase
        .from('credit_balances')
        .update({ 
          monthly_credits: monthlyCredits,
          last_monthly_refresh: today.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (!refreshError) {
        currentMonthlyCredits = monthlyCredits
      }
    }

    totalCredits = currentMonthlyCredits + creditBalance.purchased_credits
  } else if (subscription) {
    // Create initial credit balance if it doesn't exist
    const monthlyCredits = {
      'starter': 0,
      'growth': 5,
      'professional': 25,
      'enterprise': 100
    }[subscription.plan_type] || 0
    
    const { data: newBalance, error: createError } = await supabase
      .from('credit_balances')
      .insert({
        user_id: userId,
        monthly_credits: monthlyCredits,
        purchased_credits: 0,
        last_monthly_refresh: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()
    
    if (!createError && newBalance) {
      totalCredits = newBalance.monthly_credits + newBalance.purchased_credits
    }
  }

  // If no subscription found, return default values
  if (!subscription) {
    console.log('ℹ️ No subscription found for user, returning defaults')
    return NextResponse.json({
      success: true,
      subscription: null,
      credits: totalCredits,
      plan_type: 'free',
      status: 'inactive',
      jobs_posted: 0,
      active_jobs_limit: 0
    })
  }

  console.log(`✅ Active subscription found: ${subscription.plan_type}, ${totalCredits} total credits`)

  return NextResponse.json({
    success: true,
    subscription: subscription,
    credits: totalCredits,
    plan_type: subscription.plan_type || 'free',
    status: subscription.status || 'inactive',
    jobs_posted: subscription.jobs_posted || 0,
    active_jobs_limit: subscription.active_jobs_limit || 0,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end
  })
}

// Helper function to clean up old subscriptions
async function cleanupOldSubscriptions(userId, newStripeSubscriptionId) {
  console.log('🧹 Cleaning up old subscriptions for user:', userId)
  
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'replaced',
      cancelled_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('stripe_subscription_id', newStripeSubscriptionId)
  
  if (error) {
    console.error('⚠️ Error cleaning up old subscriptions:', error)
  } else {
    console.log('✅ Cleaned up old subscriptions')
  }
}

// Helper function to extract plan details from Stripe subscription
function getPlanDetailsFromStripeSubscription(stripeSubscription) {
  const priceId = stripeSubscription.items.data[0]?.price?.id
  const amount = stripeSubscription.items.data[0]?.price?.unit_amount || 0
  
  // Map price amounts to plan types
  const planMapping = {
    19900: { planType: 'starter', price: 19900, jobLimit: 3, credits: 0 },
    29900: { planType: 'growth', price: 29900, jobLimit: 6, credits: 5 },
    59900: { planType: 'professional', price: 59900, jobLimit: 15, credits: 25 },
    199900: { planType: 'enterprise', price: 199900, jobLimit: 999999, credits: 100 }
  }
  
  return planMapping[amount] || { planType: 'starter', price: 19900, jobLimit: 3, credits: 0 }
}
