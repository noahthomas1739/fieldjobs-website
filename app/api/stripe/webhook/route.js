import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'

// Create service role client for webhooks (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Safely convert a Unix seconds timestamp to ISO string, or return null
function toIsoFromUnixSeconds(unixSeconds) {
  try {
    if (unixSeconds === undefined || unixSeconds === null) return null
    const date = new Date(unixSeconds * 1000)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch (err) {
    return null
  }
}

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

    // Handle different webhook events
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object)
          break
          
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object)
          break
          
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object)
          break
          
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object)
          break
          
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object)
          break
          
        default:
          console.log(`🔵 Unhandled event type: ${event.type}`)
      }

      console.log('✅ Webhook completed successfully')
      return NextResponse.json({ received: true })
    } catch (handlerError) {
      console.error('❌ Event handler error:', handlerError.message)
      console.error('❌ Event handler stack:', handlerError.stack)
      console.error('❌ Event type:', event.type)
      console.error('❌ Event data:', JSON.stringify(event.data.object, null, 2))
      
      // Return 200 to prevent Stripe from retrying, but log the error
      return NextResponse.json({ 
        received: true, 
        error: handlerError.message,
        note: 'Error logged but returning 200 to prevent retry loop' 
      })
    }
    
  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error.message)
    console.error('❌ WEBHOOK ERROR STACK:', error.stack)
    return NextResponse.json({ error: 'Webhook failed: ' + error.message }, { status: 500 })
  }
}

// Handle checkout completion
async function handleCheckoutCompleted(session) {
  console.log('🔵 === CHECKOUT COMPLETED ===')
  console.log('🔵 Session mode:', session.mode)
  console.log('🔵 Session metadata:', session.metadata)
  
  if (session.mode === 'subscription') {
    console.log('🔵 Processing subscription checkout...')
    await handleSubscriptionSuccess(session)
  } else if (session.mode === 'payment') {
    console.log('🔵 Processing one-time payment checkout...')
    await handleOneTimePayment(session)
  } else {
    console.log('🔵 Unknown checkout mode, skipping')
  }
}

// Handle one-time payment completion
async function handleOneTimePayment(session) {
  console.log('🔵 === ONE-TIME PAYMENT PROCESSING ===')
  
  try {
    const supabase = supabaseAdmin
    
    const userId = session.metadata?.user_id || session.metadata?.userId
    const addonType = session.metadata?.addon_type || session.metadata?.featureType
    const creditsAmount = session.metadata?.credits_amount
    const jobId = session.metadata?.job_id || session.metadata?.jobId
    
    console.log('🔵 Payment metadata:', { userId, addonType, creditsAmount, jobId })
    console.log('🔵 Full session metadata:', session.metadata)
    
    if (!userId) {
      console.error('❌ No userId found in payment metadata')
      return
    }

    // Handle resume credit purchases
    if (addonType && addonType.startsWith('resume_credits_')) {
      console.log('💰 Processing resume credits purchase...')
      
      const creditMap = {
        'resume_credits_10': 10,
        'resume_credits_25': 25,
        'resume_credits_50': 50
      }
      
      const creditsToAdd = creditMap[addonType] || parseInt(creditsAmount) || 0
      
      if (creditsToAdd === 0) {
        console.error('❌ Invalid credit amount for:', addonType)
        return
      }
      
      console.log(`💰 Adding ${creditsToAdd} credits to user ${userId}`)
      
      let { data: creditBalance, error: creditError } = await supabase
        .from('credit_balances')
        .select('purchased_credits, monthly_credits')
        .eq('user_id', userId)
        .single()

      if (creditError && creditError.code === 'PGRST116') {
        const { data: newBalance, error: insertError } = await supabase
          .from('credit_balances')
          .insert({
            user_id: userId,
            purchased_credits: creditsToAdd,
            monthly_credits: 0,
            last_monthly_refresh: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (insertError) throw insertError
        creditBalance = newBalance
      } else if (creditError) {
        throw creditError
      } else {
        const newPurchasedCredits = creditBalance.purchased_credits + creditsToAdd
        
        const { error: updateError } = await supabase
          .from('credit_balances')
          .update({ 
            purchased_credits: newPurchasedCredits,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        if (updateError) throw updateError
        creditBalance.purchased_credits = newPurchasedCredits
      }

      await supabase
        .from('credit_purchases')
        .insert({
          user_id: userId,
          credits_purchased: creditsToAdd,
          package_type: addonType.split('_')[2],
          amount_paid: session.amount_total / 100,
          purchased_at: new Date().toISOString(),
          stripe_session_id: session.id
        })

      console.log(`✅ Added ${creditsToAdd} credits`)
    }
    
    // Handle single job purchases
    else if (session.metadata?.payment_type === 'single_job') {
      console.log('💼 Processing single job purchase...')
      
      // Record the one-time payment in stripe_payments table
      const { error: paymentError } = await supabase
        .from('stripe_payments')
        .insert({
          user_id: userId,
          payment_type: 'single_job',
          amount_paid: session.amount_total / 100, // Convert cents to dollars
          status: 'completed',
          stripe_session_id: session.id,
          job_title: session.metadata?.job_title || 'Single Job Posting',
          created_at: new Date().toISOString()
        })
      
      if (paymentError) {
        console.error('❌ Error recording single job payment:', paymentError)
        throw paymentError
      }
      
      console.log('✅ Single job purchase recorded successfully')
    }
    
    // Handle job feature purchases
    else if (addonType === 'featured_listing' || addonType === 'urgent_badge' || addonType === 'featured' || addonType === 'urgent') {
      console.log(`🎯 Processing ${addonType} purchase for job ${jobId}...`)
      
      if (!jobId) {
        console.error('❌ No jobId found for feature purchase')
        return
      }
      
      const updateData = {
        updated_at: new Date().toISOString()
      }
      
      if (addonType === 'featured_listing' || addonType === 'featured') {
        updateData.is_featured = true
        updateData.featured_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        console.log('🌟 Setting job as FEATURED until:', updateData.featured_until)
      } else if (addonType === 'urgent_badge' || addonType === 'urgent') {
        updateData.is_urgent = true
        updateData.urgent_until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        console.log('🚨 Setting job as URGENT until:', updateData.urgent_until)
      }
      
      // Use service role to bypass RLS - no need for employer_id check
      const { data: updatedJob, error: jobUpdateError } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
      
      if (jobUpdateError) {
        console.error(`❌ Error updating job with ${addonType}:`, jobUpdateError)
        throw jobUpdateError
      }
      
      console.log(`✅ Job updated:`, updatedJob)
      
      await supabase
        .from('job_feature_purchases')
        .insert({
          user_id: userId,
          job_id: jobId,
          feature_type: addonType,
          amount_paid: session.amount_total / 100,
          purchased_at: new Date().toISOString(),
          stripe_session_id: session.id
        })
      
      console.log(`✅ Applied ${addonType} to job ${jobId}`)
    }
    
    console.log('✅ === ONE-TIME PAYMENT COMPLETED ===')
    
  } catch (error) {
    console.error('❌ One-time payment processing error:', error)
    throw error
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
  console.log('🔵 === SUBSCRIPTION CREATED ===')
  
  try {
    const supabase = supabaseAdmin
    
    // First, try to find existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer)
      .limit(1)
      .single()
    
    let userId = existingSub?.user_id
    
    // If no existing subscription, find user by customer ID in profiles
    if (!userId) {
      console.log('🔍 No existing subscription found, looking up user by customer ID...')
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', subscription.customer)
        .single()
      
      if (profile) {
        userId = profile.id
        console.log('✅ Found user by customer ID:', userId)
      } else {
        console.log('❌ No user found for customer ID:', subscription.customer)
      return
      }
    }
    
    await syncSubscriptionToDatabase(subscription, userId)
    console.log('✅ Subscription created and synced')
    
  } catch (error) {
    console.error('❌ Subscription creation error:', error)
    throw error
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  console.log('🔵 === SUBSCRIPTION UPDATED ===')
  
  try {
    const supabase = supabaseAdmin
    
    const { data: dbSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()
    
    if (!dbSubscription) {
      const { data: customerSub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', subscription.customer)
        .single()
      
      if (!customerSub) {
        console.log('⚠️ No subscription found to update, skipping')
        return
      }
      
      await syncSubscriptionToDatabase(subscription, customerSub.user_id)
    } else {
      await syncSubscriptionToDatabase(subscription, dbSubscription.user_id)
    }
    
    console.log('✅ Subscription updated and synced')
    
  } catch (error) {
    console.error('❌ Subscription update error:', error)
    throw error
  }
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription) {
  console.log('🔵 === SUBSCRIPTION DELETED ===')
  
  try {
    const supabase = supabaseAdmin
    
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)
    
    console.log('✅ Subscription marked as cancelled')
    
  } catch (error) {
    console.error('❌ Subscription deletion error:', error)
    throw error
  }
}

// Handle payment failures
async function handlePaymentFailed(invoice) {
  console.log('🔵 === PAYMENT FAILED ===')
  
  try {
    const supabase = supabaseAdmin
    
    if (invoice.subscription) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', invoice.subscription)
      
        console.log('✅ Subscription marked as past_due')
    }
    
  } catch (error) {
    console.error('❌ Payment failure handling error:', error)
    throw error
  }
}

// Sync subscription to database
async function syncSubscriptionToDatabase(subscription, userId) {
  console.log('🔵 Syncing subscription to database...')
  
  const supabase = supabaseAdmin
  
  const priceId = subscription.items.data[0]?.price?.id
  const planType = getPlanTypeFromPriceId(priceId)
  
  const planLimits = {
    starter: { active_jobs_limit: 3, credits: 0, price: 19900 },
    growth: { active_jobs_limit: 6, credits: 5, price: 29900 },
    professional: { active_jobs_limit: 15, credits: 25, price: 59900 },
    enterprise: { active_jobs_limit: 999999, credits: 100, price: 199900 }
  }
  
  const limits = planLimits[planType] || planLimits.starter
  
  const subscriptionData = {
    plan_type: planType,
    status: subscription.status === 'canceled' ? 'cancelled' : subscription.status,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    active_jobs_limit: limits.active_jobs_limit,
    credits: limits.credits,
    price: limits.price,
    current_period_start: toIsoFromUnixSeconds(subscription.current_period_start),
    current_period_end: toIsoFromUnixSeconds(subscription.current_period_end),
    updated_at: new Date().toISOString()
  }
  
  if (subscription.status === 'canceled') {
    subscriptionData.cancelled_at = toIsoFromUnixSeconds(subscription.canceled_at) || new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      ...subscriptionData
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
  
  if (error) throw error
  
  console.log('✅ Subscription synced successfully')
}

// Get plan type from price ID
function getPlanTypeFromPriceId(priceId) {
  const priceMapping = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID]: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID]: 'growth',
    [process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID]: 'professional',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
  }
  
  return priceMapping[priceId] || 'starter'
}

// Handle subscription success
async function handleSubscriptionSuccess(session) {
  console.log('🔵 === SUBSCRIPTION HANDLER STARTED ===')
  console.log('🔵 Session ID:', session.id)
  console.log('🔵 Session metadata:', JSON.stringify(session.metadata, null, 2))
  
  try {
    const supabase = supabaseAdmin
    
    const userId = session.metadata?.userId || session.metadata?.user_id
    const planType = session.metadata?.planType || session.metadata?.plan_type
    
    console.log('🔵 Extracted userId:', userId)
    console.log('🔵 Extracted planType:', planType)
    
    if (!userId || !planType) {
      console.error('❌ Missing metadata - userId:', userId, 'planType:', planType)
      throw new Error(`Missing userId or planType in metadata. userId: ${userId}, planType: ${planType}`)
    }

    if (!session.subscription) {
      console.error('❌ No subscription ID in session')
      throw new Error('No subscription ID in checkout session')
    }

    console.log('🔵 Retrieving subscription from Stripe:', session.subscription)
    const subscription = await stripe.subscriptions.retrieve(session.subscription)
    console.log('✅ Subscription retrieved:', subscription.id)
    
    console.log('🔵 Cleaning up old subscriptions...')
    await cleanupOldSubscriptions(userId, subscription.id)
    
    console.log('🔵 Syncing subscription to database...')
    await syncSubscriptionToDatabase(subscription, userId)
    
    console.log('✅ === SUBSCRIPTION HANDLER COMPLETED ===')
    
  } catch (error) {
    console.error('❌ === SUBSCRIPTION HANDLER FAILED ===')
    console.error('❌ Error:', error.message)
    console.error('❌ Stack:', error.stack)
    throw error
  }
}

// Clean up old subscriptions
async function cleanupOldSubscriptions(userId, newSubscriptionId) {
  console.log('🔵 Cleaning up old subscriptions...')
  
  const supabase = supabaseAdmin
  
  await supabase
    .from('subscriptions')
    .update({ 
      status: 'replaced',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .neq('stripe_subscription_id', newSubscriptionId)
    .in('status', ['active', 'trialing'])
  
    console.log('✅ Old subscriptions cleaned up')
}
