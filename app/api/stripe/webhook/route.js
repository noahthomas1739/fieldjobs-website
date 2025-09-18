import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Use service role client for webhooks (bypasses RLS)
// Note: supabase client will be created within request functions


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
    
  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error.message)
    console.error('❌ WEBHOOK ERROR STACK:', error.stack)
    return NextResponse.json({ error: 'Webhook failed: ' + error.message }, { status: 500 })
  }
}

// Handle checkout completion (existing functionality)
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

// Handle one-time payment completion (NEW)
async function handleOneTimePayment(session) {
  console.log('🔵 === ONE-TIME PAYMENT PROCESSING ===')
  
  try {
    // Create supabase client within the function
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    const userId = session.metadata?.user_id
    const addonType = session.metadata?.addon_type
    const creditsAmount = session.metadata?.credits_amount
    const jobId = session.metadata?.job_id
    
    console.log('🔵 Payment metadata:', { userId, addonType, creditsAmount, jobId })
    
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
      
      // Get or create credit balance
      let { data: creditBalance, error: creditError } = await supabase
        .from('credit_balances')
        .select('purchased_credits, monthly_credits')
        .eq('user_id', userId)
        .single()

      if (creditError && creditError.code === 'PGRST116') {
        // Create new credit balance record
        console.log('💰 Creating new credit balance record...')
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
        
        if (insertError) {
          console.error('❌ Error creating credit balance:', insertError)
          throw insertError
        }
        
        creditBalance = newBalance
      } else if (creditError) {
        console.error('❌ Error fetching credit balance:', creditError)
        throw creditError
      } else {
        // Update existing balance
        console.log('💰 Updating existing credit balance...')
        const newPurchasedCredits = creditBalance.purchased_credits + creditsToAdd
        
        const { error: updateError } = await supabase
          .from('credit_balances')
          .update({ 
            purchased_credits: newPurchasedCredits,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        if (updateError) {
          console.error('❌ Error updating credit balance:', updateError)
          throw updateError
        }
        
        creditBalance.purchased_credits = newPurchasedCredits
      }

      // Log the purchase for tracking
      const { error: logError } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: userId,
          credits_purchased: creditsToAdd,
          package_type: addonType.split('_')[2], // Extract "10", "25", or "50"
          amount_paid: session.amount_total / 100, // Convert from cents to dollars
          purchased_at: new Date().toISOString(),
          stripe_session_id: session.id
        })

      if (logError) {
        console.warn('⚠️ Failed to log credit purchase:', logError)
      }

      const totalCredits = creditBalance.monthly_credits + creditBalance.purchased_credits
      console.log(`✅ Added ${creditsToAdd} credits. Total credits: ${totalCredits}`)
    }
    
    // Handle job feature purchases (featured listing, urgent badge)
    else if (addonType === 'featured_listing' || addonType === 'urgent_badge') {
      console.log(`🎯 Processing ${addonType} purchase for job ${jobId}...`)
      
      if (!jobId) {
        console.error('❌ No jobId found for feature purchase')
        return
      }
      
      // Update job with the purchased feature
      const updateData = {
        updated_at: new Date().toISOString()
      }
      
      if (addonType === 'featured_listing') {
        updateData.is_featured = true
        updateData.featured_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      } else if (addonType === 'urgent_badge') {
        updateData.is_urgent = true
        updateData.urgent_until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
      }
      
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .eq('user_id', userId) // Ensure user owns the job
      
      if (jobUpdateError) {
        console.error(`❌ Error updating job with ${addonType}:`, jobUpdateError)
        throw jobUpdateError
      }
      
      // Log the feature purchase
      const { error: featureLogError } = await supabase
        .from('job_feature_purchases')
        .insert({
          user_id: userId,
          job_id: jobId,
          feature_type: addonType,
          amount_paid: session.amount_total / 100,
          purchased_at: new Date().toISOString(),
          stripe_session_id: session.id
        })
      
      if (featureLogError) {
        console.warn('⚠️ Failed to log feature purchase:', featureLogError)
      }
      
      console.log(`✅ Applied ${addonType} to job ${jobId}`)
    }
    
    console.log('✅ === ONE-TIME PAYMENT COMPLETED ===')
    
  } catch (error) {
    console.error('❌ One-time payment processing error:', error)
    throw error
  }
}

// Handle subscription creation (NEW)
async function handleSubscriptionCreated(subscription) {
  console.log('🔵 === SUBSCRIPTION CREATED ===')
  console.log('🔵 Subscription ID:', subscription.id)
  console.log('🔵 Customer ID:', subscription.customer)
  console.log('🔵 Status:', subscription.status)
  
  try {
    // Create supabase client within the function
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    // Find user by customer ID
    const { data: existingSub, error: findError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer)
      .limit(1)
      .single()
    
    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error finding user:', findError)
      throw new Error('Could not find user for customer: ' + subscription.customer)
    }
    
    if (!existingSub) {
      console.log('⚠️ No existing subscription found for customer, skipping')
      return
    }
    
    await syncSubscriptionToDatabase(subscription, existingSub.user_id)
    console.log('✅ Subscription created and synced')
    
  } catch (error) {
    console.error('❌ Subscription creation error:', error)
    throw error
  }
}

// Handle subscription updates (NEW)
async function handleSubscriptionUpdated(subscription) {
  console.log('🔵 === SUBSCRIPTION UPDATED ===')
  console.log('🔵 Subscription ID:', subscription.id)
  console.log('🔵 Status:', subscription.status)
  
  try {
    // Create supabase client within the function
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    // Find subscription in database
    const { data: dbSubscription, error: findError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()
    
    if (findError) {
      console.error('❌ Could not find subscription in database:', findError)
      // Try to find by customer ID as fallback
      const { data: customerSub, error: customerError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', subscription.customer)
        .single()
      
      if (customerError) {
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

// Handle subscription deletion (NEW - CRITICAL FOR PREVENTING ORPHANS)
async function handleSubscriptionDeleted(subscription) {
  console.log('🔵 === SUBSCRIPTION DELETED ===')
  console.log('🔵 Subscription ID:', subscription.id)
  console.log('🔵 Customer ID:', subscription.customer)
  
  try {
    // Create supabase client within the function
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    // Mark subscription as cancelled in database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)
    
    if (updateError) {
      console.error('❌ Error marking subscription as cancelled:', updateError)
      throw updateError
    }
    
    console.log('✅ Subscription marked as cancelled in database')
    
    // Cancel any scheduled changes
    const { error: scheduleError } = await supabase
      .from('subscription_schedule_changes')
      .update({ status: 'cancelled' })
      .eq('stripe_schedule_id', subscription.id)
    
    if (scheduleError) {
      console.log('⚠️ Error cancelling scheduled changes:', scheduleError)
    }
    
  } catch (error) {
    console.error('❌ Subscription deletion error:', error)
    throw error
  }
}

// Handle payment failures (NEW)
async function handlePaymentFailed(invoice) {
  console.log('🔵 === PAYMENT FAILED ===')
  console.log('🔵 Invoice ID:', invoice.id)
  console.log('🔵 Subscription ID:', invoice.subscription)
  
  try {
    // Create supabase client within the function
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    if (invoice.subscription) {
      // Update subscription status based on payment failure
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', invoice.subscription)
      
      if (updateError) {
        console.error('❌ Error updating subscription status:', updateError)
      } else {
        console.log('✅ Subscription marked as past_due')
      }
    }
    
  } catch (error) {
    console.error('❌ Payment failure handling error:', error)
    throw error
  }
}

// Sync subscription data to database (ENHANCED)
async function syncSubscriptionToDatabase(subscription, userId) {
  console.log('🔵 Syncing subscription to database...')
  
  // Create supabase client within the function
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ 
    cookies: () => cookieStore 
  })
  
  // Determine plan type from price ID
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
  
  // Add cancelled_at if subscription is cancelled
  if (subscription.status === 'canceled') {
    const cancelledAtIso = toIsoFromUnixSeconds(subscription.canceled_at)
    subscriptionData.cancelled_at = cancelledAtIso || new Date().toISOString()
  }
  
  console.log('🔵 Subscription data:', JSON.stringify(subscriptionData, null, 2))
  
  // Update or insert subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      ...subscriptionData
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
  
  if (error) {
    console.error('❌ Error syncing subscription:', error)
    throw error
  }
  
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

// Original subscription success handler (ENHANCED)
async function handleSubscriptionSuccess(session) {
  console.log('🔵 === SUBSCRIPTION HANDLER STARTED ===')
  
  try {
    // Create supabase client within the function
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })
    
    // Test database connection
    console.log('🔵 Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('subscriptions')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ DATABASE CONNECTION FAILED:', testError)
      throw new Error('Database connection failed: ' + testError.message)
    }
    console.log('✅ Database connection successful')
    
    // Handle both naming conventions
    const userId = session.metadata.userId || session.metadata.user_id
    const planType = session.metadata.planType || session.metadata.plan_type
    
    console.log('🔵 User ID from metadata:', userId)
    console.log('🔵 Plan type from metadata:', planType)
    
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
    
    // Clean up any old subscriptions before creating new one
    await cleanupOldSubscriptions(userId, subscription.id)
    
    // Sync subscription to database
    await syncSubscriptionToDatabase(subscription, userId)
    
    console.log('✅ === SUBSCRIPTION HANDLER COMPLETED ===')
    
  } catch (error) {
    console.error('❌ === SUBSCRIPTION HANDLER FAILED ===')
    console.error('❌ Handler error:', error.message)
    console.error('❌ Handler error stack:', error.stack)
    throw error
  }
}

// Clean up old subscriptions to prevent duplicates
async function cleanupOldSubscriptions(userId, newSubscriptionId) {
  console.log('🔵 Cleaning up old subscriptions...')
  
  // Create supabase client within the function
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ 
    cookies: () => cookieStore 
  })
  
  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'replaced',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .neq('stripe_subscription_id', newSubscriptionId)
    .in('status', ['active', 'trialing'])
  
  if (error) {
    console.error('⚠️ Cleanup error:', error)
  } else {
    console.log('✅ Old subscriptions cleaned up')
  }
}
