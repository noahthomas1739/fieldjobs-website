import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// This endpoint will be called by Stripe when payments succeed/fail
export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event
    try {
      // Verify webhook came from Stripe
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Received Stripe webhook:', event.type)

    // Handle successful subscription creation
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      console.log('Checkout session completed:', session.id)
      console.log('Session metadata:', session.metadata)

      // Handle job feature purchases from dashboard
      if (session.metadata.type === 'job_feature') {
        await handleJobFeaturePurchase(session)
      }
      // Handle existing subscription flows
      else if (session.mode === 'subscription') {
        await handleSubscriptionSuccess(session)
      } else if (session.mode === 'payment') {
        await handleSinglePaymentSuccess(session)
      }
    }

    // Handle subscription updates (renewals, cancellations, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      console.log('Subscription updated:', subscription.id)
      await handleSubscriptionUpdate(subscription)
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      console.log('Subscription cancelled:', subscription.id)
      await handleSubscriptionCancellation(subscription)
    }

    // Handle subscription schedule events for downgrades
    if (event.type === 'subscription_schedule.completed') {
      const schedule = event.data.object
      console.log('Subscription schedule completed:', schedule.id)
      await handleSubscriptionScheduleCompleted(schedule)
    }

    if (event.type === 'subscription_schedule.canceled') {
      const schedule = event.data.object
      console.log('Subscription schedule canceled:', schedule.id)
      await handleSubscriptionScheduleCanceled(schedule)
    }

    // Handle payment failures
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      console.log('Payment failed:', invoice.id)
      await handlePaymentFailed(invoice)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}

// Handle job feature purchases from dashboard
async function handleJobFeaturePurchase(session) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // FIXED: Handle both naming conventions
    const userId = session.metadata.userId || session.metadata.user_id
    const jobId = session.metadata.jobId || session.metadata.job_id
    const featureType = session.metadata.featureType || session.metadata.feature_type
    
    console.log(`Processing ${featureType} feature purchase for job ${jobId}`)

    // Calculate expiration date (30 days from now)
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + 30)

    // Update job with feature
    let updateData = {}
    if (featureType === 'featured') {
      updateData = {
        is_featured: true,
        featured_until: expirationDate.toISOString()
      }
    } else if (featureType === 'urgent') {
      updateData = {
        is_urgent: true,
        urgent_until: expirationDate.toISOString()
      }
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('employer_id', userId)

    if (updateError) {
      console.error('Error updating job with feature:', updateError)
      return
    }

    console.log(`Successfully added ${featureType} feature to job ${jobId}`)

    // Record the purchase in tracking table
    await supabase
      .from('job_feature_purchases')
      .insert({
        job_id: jobId,
        user_id: userId,
        feature_type: featureType,
        stripe_session_id: session.id,
        amount_paid: session.amount_total,
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error handling job feature purchase:', error)
  }
}

async function handleSubscriptionSuccess(session) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // FIXED: Handle both naming conventions
    const userId = session.metadata.userId || session.metadata.user_id
    const planType = session.metadata.planType || session.metadata.plan_type
    
    console.log('Activating subscription for user:', userId, 'plan:', planType)

    if (!userId || !planType) {
      console.error('Missing userId or planType in metadata:', session.metadata)
      throw new Error('Missing required metadata for subscription')
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription)
    
    // Updated plan limits with new pricing and benefits
    const planLimits = {
      starter: { 
        active_jobs_limit: 3, 
        credits: 0, 
        monthly_credits: 0,
        featured_listings: 0,
        monthly_featured_listings: 0,
        price: 19900 
      },
      growth: { 
        active_jobs_limit: 6, 
        credits: 5, 
        monthly_credits: 5,
        featured_listings: 0,
        monthly_featured_listings: 0,
        price: 29900 
      },
      professional: { 
        active_jobs_limit: 15, 
        credits: 25, 
        monthly_credits: 25,
        featured_listings: 2,
        monthly_featured_listings: 2,
        price: 59900 
      },
      enterprise: { 
        active_jobs_limit: 999999, 
        credits: 100, 
        monthly_credits: 100,
        featured_listings: 5,
        monthly_featured_listings: 5,
        price: 199900 
      }
    }
    
    const limits = planLimits[planType] || planLimits.starter

    // Check if subscription record already exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    const subscriptionData = {
      plan_type: planType,
      status: 'active',
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer,
      active_jobs_limit: limits.active_jobs_limit,
      credits: limits.credits,
      featured_listings: limits.featured_listings,
      price: limits.price,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }

    if (existingSubscription) {
      // Update existing record
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating subscription:', error)
        throw error
      }

      console.log('Updated existing subscription for user:', userId)
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          ...subscriptionData,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error creating subscription:', error)
        throw error
      }

      console.log('Created new subscription for user:', userId)
    }

    console.log('Subscription activated successfully for user:', userId)
    
  } catch (error) {
    console.error('Error handling subscription success:', error)
    throw error
  }
}

async function handleSinglePaymentSuccess(session) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // FIXED: Handle both naming conventions
    const userId = session.metadata.userId || session.metadata.user_id
    const paymentType = session.metadata.paymentType || session.metadata.payment_type || session.metadata.addon_type
    
    console.log('Processing single payment for user:', userId, 'type:', paymentType)
    
    if (paymentType === 'single_job') {
      // Handle single job posting payment
      const { error } = await supabase
        .from('subscriptions')
        .update({
          jobs_posted: supabase.raw('jobs_posted + 1')
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating after single job payment:', error)
        throw error
      }
      
    } else if (paymentType?.startsWith('resume_credits_')) {
      // Handle resume credits purchase
      const creditsAmount = parseInt(session.metadata.credits_amount)
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          credits: supabase.raw(`credits + ${creditsAmount}`)
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating credits:', error)
        throw error
      }
      
      console.log(`Added ${creditsAmount} credits to user ${userId}`)
      
    } else if (paymentType === 'featured_listing') {
      // Handle featured listing purchase (legacy)
      const jobId = session.metadata.jobId || session.metadata.job_id
      
      const { error } = await supabase
        .from('jobs')
        .update({
          is_featured: true,
          featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .eq('id', jobId)
        .eq('employer_id', userId)

      if (error) {
        console.error('Error adding featured listing:', error)
        throw error
      }
      
      console.log(`Featured listing added to job ${jobId}`)
      
    } else if (paymentType === 'urgent_badge') {
      // Handle urgent badge purchase (legacy)
      const jobId = session.metadata.jobId || session.metadata.job_id
      
      const { error } = await supabase
        .from('jobs')
        .update({
          is_urgent: true,
          urgent_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .eq('id', jobId)
        .eq('employer_id', userId)

      if (error) {
        console.error('Error adding urgent badge:', error)
        throw error
      }
      
      console.log(`Urgent badge added to job ${jobId}`)
    }

    console.log('Single payment processed successfully for user:', userId)
    
  } catch (error) {
    console.error('Error handling single payment:', error)
    throw error
  }
}

// Enhanced subscription update handling
async function handleSubscriptionUpdate(subscription) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    console.log('Processing subscription update:', subscription.id, 'status:', subscription.status)
    
    // Get price details to determine plan type
    const priceId = subscription.items.data[0].price.id
    const planType = getPlanTypeFromPriceId(priceId)
    const planLimits = getPlanLimits(planType)
    
    if (!planType) {
      console.error('Unknown price ID:', priceId)
      return
    }

    // Update subscription status in database with enhanced data
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        plan_type: planType,
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        active_jobs_limit: planLimits.active_jobs_limit,
        credits: planLimits.credits,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription:', error)
      throw error
    }

    console.log('Subscription updated successfully with enhanced data')
    
  } catch (error) {
    console.error('Error handling subscription update:', error)
    throw error
  }
}

async function handleSubscriptionCancellation(subscription) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    console.log('Cancelling subscription:', subscription.id)
    
    // Update subscription to cancelled but keep it until period ends
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error cancelling subscription:', error)
      throw error
    }

    console.log('Subscription cancelled successfully')
    
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
    throw error
  }
}

// Handle subscription schedule completion (downgrades taking effect)
async function handleSubscriptionScheduleCompleted(schedule) {
  console.log('Processing subscription schedule completion:', schedule.id)
  
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Find the scheduled change in our database
    const { data: scheduledChange, error: findError } = await supabase
      .from('subscription_schedule_changes')
      .select('*')
      .eq('stripe_schedule_id', schedule.id)
      .single()

    if (findError || !scheduledChange) {
      console.error('Scheduled change not found:', findError)
      return
    }

    // Get the new subscription details
    const newSubscription = await stripe.subscriptions.retrieve(schedule.subscription)
    const priceId = newSubscription.items.data[0].price.id
    const planType = getPlanTypeFromPriceId(priceId)
    const planLimits = getPlanLimits(planType)

    // Update the subscription record
    await supabase
      .from('subscriptions')
      .update({
        plan_type: planType,
        active_jobs_limit: planLimits.active_jobs_limit,
        credits: planLimits.credits,
        current_period_start: new Date(newSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(newSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduledChange.subscription_id)

    // Mark the scheduled change as completed
    await supabase
      .from('subscription_schedule_changes')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduledChange.id)

    console.log('Subscription schedule completed and database updated')

  } catch (error) {
    console.error('Error handling subscription schedule completion:', error)
  }
}

// Handle subscription schedule cancellation
async function handleSubscriptionScheduleCanceled(schedule) {
  console.log('Processing subscription schedule cancellation:', schedule.id)
  
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    await supabase
      .from('subscription_schedule_changes')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_schedule_id', schedule.id)

    console.log('Subscription schedule marked as cancelled')

  } catch (error) {
    console.error('Error handling subscription schedule cancellation:', error)
  }
}

// Handle failed payments
async function handlePaymentFailed(invoice) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    console.log('Processing failed payment:', invoice.id)
    
    if (invoice.subscription) {
      // Mark subscription as having payment issues
      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', invoice.subscription)
    }
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

// Helper function to get plan type from price ID
function getPlanTypeFromPriceId(priceId) {
  const priceMapping = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID]: 'starter',
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID]: 'growth',
    [process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID]: 'professional',
    [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
  }
  
  return priceMapping[priceId] || null
}

// Helper function to get plan limits
function getPlanLimits(planType) {
  const limits = {
    starter: { 
      active_jobs_limit: 3, 
      credits: 0 
    },
    growth: { 
      active_jobs_limit: 6, 
      credits: 5 
    },
    professional: { 
      active_jobs_limit: 15, 
      credits: 25 
    },
    enterprise: { 
      active_jobs_limit: 999999, 
      credits: 100 
    }
  }
  
  return limits[planType] || limits.starter
}
