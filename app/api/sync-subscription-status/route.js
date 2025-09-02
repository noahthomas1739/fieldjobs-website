// /app/api/sync-subscription-status/route.js
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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🔄 Starting subscription sync for user:', userId)

    // Get all subscriptions for this user from database
    const { data: dbSubscriptions, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log('📋 Found database subscriptions:', dbSubscriptions?.length || 0)

    let syncedCount = 0
    let canceledCount = 0
    let activeSubscriptions = []

    // Check each database subscription against Stripe
    for (const dbSub of dbSubscriptions || []) {
      if (!dbSub.stripe_subscription_id) {
        console.log('⚠️ Subscription missing Stripe ID:', dbSub.id)
        continue
      }

      try {
        console.log('🔍 Checking Stripe subscription:', dbSub.stripe_subscription_id)
        
        const stripeSubscription = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id)
        
        console.log('📊 Stripe status:', stripeSubscription.status, 'DB status:', dbSub.status)

        // Check if status needs updating
        if (stripeSubscription.status === 'canceled' && dbSub.status === 'active') {
          // Update database to match Stripe cancellation
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date(stripeSubscription.canceled_at * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', dbSub.id)

          if (updateError) {
            console.error('❌ Error updating subscription:', updateError)
          } else {
            console.log('✅ Updated subscription to canceled:', dbSub.id)
            canceledCount++
          }
        } 
        else if (['active', 'trialing', 'past_due'].includes(stripeSubscription.status) && dbSub.status !== 'active') {
          // Update database to match Stripe active status
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              cancelled_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', dbSub.id)

          if (updateError) {
            console.error('❌ Error updating subscription:', updateError)
          } else {
            console.log('✅ Updated subscription to active:', dbSub.id)
            syncedCount++
          }
        }

        // Track active subscriptions
        if (['active', 'trialing', 'past_due'].includes(stripeSubscription.status)) {
          activeSubscriptions.push({
            id: dbSub.id,
            plan: dbSub.plan_type,
            stripeId: stripeSubscription.id,
            status: stripeSubscription.status
          })
        }

        syncedCount++

      } catch (stripeError) {
        if (stripeError.code === 'resource_missing') {
          console.log('⚠️ Subscription not found in Stripe:', dbSub.stripe_subscription_id)
          
          // Subscription doesn't exist in Stripe - mark as canceled in database
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', dbSub.id)

          if (updateError) {
            console.error('❌ Error updating missing subscription:', updateError)
          } else {
            console.log('✅ Marked missing subscription as canceled:', dbSub.id)
            canceledCount++
          }
        } else {
          console.error('❌ Stripe API error:', stripeError.message)
        }
      }
    }

    // Get user's Stripe customer ID to check for any active subscriptions not in our database
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let foundMissingSubscriptions = []

    if (userData?.stripe_customer_id) {
      try {
        console.log('🔍 Checking for active Stripe subscriptions not in database...')
        
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: userData.stripe_customer_id,
          status: 'all',
          limit: 100
        })

        for (const stripeSub of stripeSubscriptions.data) {
          // Check if this subscription exists in our database
          const { data: existingDbSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', stripeSub.id)
            .single()

          if (!existingDbSub && ['active', 'trialing', 'past_due'].includes(stripeSub.status)) {
            console.log('🆕 Found active Stripe subscription not in database:', stripeSub.id)
            foundMissingSubscriptions.push({
              stripeId: stripeSub.id,
              status: stripeSub.status,
              plan: stripeSub.items.data[0]?.price?.lookup_key || 'unknown'
            })
          }
        }
      } catch (customerError) {
        console.error('⚠️ Could not check customer subscriptions:', customerError.message)
      }
    }

    const result = {
      success: true,
      message: 'Subscription sync completed',
      details: {
        totalChecked: dbSubscriptions?.length || 0,
        syncedCount,
        canceledCount,
        activeSubscriptions: activeSubscriptions.length,
        activeSubscriptionsList: activeSubscriptions,
        missingSubscriptions: foundMissingSubscriptions
      }
    }

    console.log('✅ Sync completed:', result.details)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Critical error in subscription sync:', error)
    return NextResponse.json({ 
      error: 'Failed to sync subscription status',
      details: error.message 
    }, { status: 500 })
  }
}