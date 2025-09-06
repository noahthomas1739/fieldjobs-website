// /app/api/stripe/upgrade-subscription/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Price hierarchy for upgrade/downgrade logic
const PLAN_HIERARCHY = {
  'starter': 1,
  'growth': 2, 
  'professional': 3,
  'enterprise': 4
}

// Price ID mapping
const PRICE_MAPPING = {
  'starter': process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  'growth': process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID,
  'professional': process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
  'enterprise': process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID
}

// Helper function to wait with exponential backoff
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request) {
  try {
    const { priceId, planType, userId, currentPlan } = await request.json()

    console.log('🔄 Starting subscription change:', {
      userId,
      from: currentPlan,
      to: planType,
      priceId
    })

    // Validate inputs
    if (!priceId || !planType || !userId || !currentPlan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate price ID matches plan type
    if (PRICE_MAPPING[planType] !== priceId) {
      return NextResponse.json({ error: 'Invalid price ID for plan type' }, { status: 400 })
    }

    // Get current subscription from database
    const { data: currentSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (subError || !currentSubscription) {
      console.error('❌ No active subscription found:', subError)
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    console.log('✅ Current subscription found:', {
      id: currentSubscription.id,
      plan: currentSubscription.plan_type,
      stripeId: currentSubscription.stripe_subscription_id
    })

    // Get current subscription from Stripe
    let stripeSubscription
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id)
      
      // Check if subscription is in a valid state
      if (stripeSubscription.status === 'canceled') {
        console.error('❌ Subscription is canceled in Stripe but active in database')
        
        // Sync database with Stripe reality
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSubscription.id)
        
        return NextResponse.json({ 
          error: 'Current subscription is canceled. Please create a new subscription.',
          needsNewSubscription: true 
        }, { status: 400 })
      }
      
      if (!['active', 'past_due', 'unpaid', 'trialing'].includes(stripeSubscription.status)) {
        console.error('❌ Subscription not in valid status for changes:', stripeSubscription.status)
        return NextResponse.json({ 
          error: `Cannot modify subscription in ${stripeSubscription.status} status` 
        }, { status: 400 })
      }
      
    } catch (stripeError) {
      console.error('❌ Stripe subscription not found:', stripeError.message)
      return NextResponse.json({ error: 'Subscription not found in Stripe' }, { status: 404 })
    }

    // Determine if this is an upgrade or downgrade
    const currentLevel = PLAN_HIERARCHY[currentPlan] || 0
    const newLevel = PLAN_HIERARCHY[planType] || 0
    const isUpgrade = newLevel > currentLevel
    const isDowngrade = newLevel < currentLevel

    console.log('📊 Plan change analysis:', {
      currentLevel,
      newLevel,
      isUpgrade,
      isDowngrade
    })

    if (currentLevel === newLevel) {
      return NextResponse.json({ error: 'Already on this plan' }, { status: 400 })
    }

    // Handle upgrade vs downgrade differently
    if (isUpgrade) {
      // IMMEDIATE UPGRADE - Update subscription with proration
      await handleImmediateUpgrade(stripeSubscription, priceId, planType, currentSubscription)
      return NextResponse.json({ 
        success: true,
        message: `Successfully upgraded to ${planType} plan! Your new plan is active immediately.`,
        immediate: true
      })
    } else {
      // END-OF-CYCLE DOWNGRADE - Use subscription schedule
      const result = await handleEndOfCycleDowngrade(stripeSubscription, priceId, planType, currentSubscription)
      return NextResponse.json({ 
        success: true,
        message: result.message,
        immediate: false,
        effectiveDate: result.effectiveDate
      })
    }

  } catch (error) {
    console.error('❌ Critical error in subscription change:', error)
    return NextResponse.json({ 
      error: 'Failed to process subscription change',
      details: error.message 
    }, { status: 500 })
  }
}

// Handle immediate upgrades with proration
async function handleImmediateUpgrade(stripeSubscription, newPriceId, newPlanType, dbSubscription) {
  console.log('⬆️ Processing immediate upgrade...')
  
  // First, cancel any existing schedules since we're doing immediate upgrade
  if (stripeSubscription.schedule) {
    try {
      await stripe.subscriptionSchedules.cancel(stripeSubscription.schedule)
      console.log('✅ Cancelled existing schedule for immediate upgrade')
    } catch (error) {
      console.log('⚠️ Could not cancel existing schedule:', error.message)
    }
  }
  
  // Get the subscription item ID
  const subscriptionItemId = stripeSubscription.items.data[0].id
  
  // FIXED: Update the subscription immediately with proper proration
  const updatedSubscription = await stripe.subscriptions.update(stripeSubscription.id, {
    items: [{
      id: subscriptionItemId,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations' // Charge difference immediately, keep existing billing cycle
  })

  console.log('✅ Stripe subscription upgraded:', updatedSubscription.id)

  // Update database immediately
  const limits = getPlanLimits(newPlanType)
  await supabase
    .from('subscriptions')
    .update({
      plan_type: newPlanType,
      credits: limits.credits,
      active_jobs_limit: limits.active_jobs_limit,
      updated_at: new Date().toISOString()
    })
    .eq('id', dbSubscription.id)

  console.log('✅ Database updated for immediate upgrade')
}

// Handle end-of-cycle downgrades using subscription schedules
async function handleEndOfCycleDowngrade(stripeSubscription, newPriceId, newPlanType, dbSubscription) {
  console.log('⬇️ Processing end-of-cycle downgrade...')
  
  try {
    let scheduleId = null
    let needsNewSchedule = true
    
    // Step 1: Handle existing schedule (if any)
    if (stripeSubscription.schedule) {
      console.log('🔍 Subscription already has a schedule:', stripeSubscription.schedule)
      
      try {
        const existingSchedule = await stripe.subscriptionSchedules.retrieve(stripeSubscription.schedule)
        console.log('📋 Existing schedule status:', existingSchedule.status)
        
        if (existingSchedule.status === 'active') {
          // Check what the existing schedule is planning to do
          const phases = existingSchedule.phases
          const currentTime = Math.floor(Date.now() / 1000)
          const futurePhases = phases.filter(phase => phase.start_date > currentTime)
          
          if (futurePhases.length > 0) {
            const nextPhase = futurePhases[0]
            const nextPhasePriceId = nextPhase.items[0].price
            
            if (nextPhasePriceId === newPriceId) {
              console.log('✅ Schedule already exists for this exact downgrade')
              scheduleId = existingSchedule.id
              needsNewSchedule = false
            } else {
              console.log('🔄 Existing schedule has different plan, will update it')
              // Try to update existing schedule instead of canceling and recreating
              try {
                const updatedSchedule = await stripe.subscriptionSchedules.update(existingSchedule.id, {
                  phases: [
                    {
                      // Current phase - continues for 1 billing cycle
                      items: stripeSubscription.items.data.map(item => ({
                        price: item.price.id,
                        quantity: item.quantity || 1
                      })),
                      start_date: stripeSubscription.current_period_start,
                      end_date: stripeSubscription.current_period_end
                    },
                    {
                      // New phase - new plan
                      items: [{
                        price: newPriceId,
                        quantity: 1
                      }],
                      start_date: stripeSubscription.current_period_end
                    }
                  ]
                })
                
                console.log('✅ Updated existing schedule with new downgrade plan')
                scheduleId = updatedSchedule.id
                needsNewSchedule = false
              } catch (updateError) {
                console.log('⚠️ Could not update existing schedule, will cancel and recreate:', updateError.message)
                await stripe.subscriptionSchedules.cancel(existingSchedule.id)
                console.log('✅ Cancelled conflicting existing schedule')
                // Wait for the cancellation to propagate
                await wait(3000)
              }
            }
          } else {
            console.log('⚠️ Existing schedule has no future phases, will cancel it')
            await stripe.subscriptionSchedules.cancel(existingSchedule.id)
            console.log('✅ Cancelled empty existing schedule')
            // Wait for the cancellation to propagate
            await wait(3000)
          }
        } else if (existingSchedule.status === 'canceled') {
          console.log('ℹ️ Existing schedule is already canceled, waiting for detachment...')
          // Wait longer for canceled schedules to detach
          await wait(5000)
        }
      } catch (scheduleError) {
        console.log('⚠️ Could not retrieve existing schedule, will create new one:', scheduleError.message)
      }
    }

    // Step 2: Create new schedule if needed (with robust retry logic)
    if (needsNewSchedule) {
      console.log('🆕 Creating new subscription schedule')
      
      let retryCount = 0
      const maxRetries = 5
      let scheduleCreated = false
      
      while (retryCount < maxRetries && !scheduleCreated) {
        try {
          // Always refresh subscription data before attempting schedule creation
          stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id)
          console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} - Subscription schedule status:`, stripeSubscription.schedule ? 'has schedule' : 'no schedule')
          
          // If subscription still has a schedule, we need to wait longer
          if (stripeSubscription.schedule) {
            console.log(`⏳ Subscription still attached to schedule ${stripeSubscription.schedule}, waiting...`)
            await wait(5000 * (retryCount + 1)) // Exponential backoff
            retryCount++
            continue
          }
          
          // Try to create the schedule using two-step process
          console.log('🆕 Creating base schedule from subscription...')
          const newSchedule = await stripe.subscriptionSchedules.create({
            from_subscription: stripeSubscription.id,
          })

          console.log('✅ Created base schedule:', newSchedule.id)

          // Step 2: Update the schedule to add the phases
          console.log('📅 Adding downgrade phases to schedule...')
          const updatedSchedule = await stripe.subscriptionSchedules.update(newSchedule.id, {
            phases: [
              {
                // Current phase - continues for 1 billing cycle (until end of current period)
                items: stripeSubscription.items.data.map(item => ({
                  price: item.price.id,
                  quantity: item.quantity || 1
                })),
                start_date: stripeSubscription.current_period_start,
                end_date: stripeSubscription.current_period_end
              },
              {
                // New phase - starts after current phase ends, continues indefinitely
                items: [{
                  price: newPriceId,
                  quantity: 1
                }],
                start_date: stripeSubscription.current_period_end
                // No end_date = runs indefinitely (final phase)
              }
            ]
          })

          console.log('✅ Schedule successfully created with downgrade phases:', updatedSchedule.id)
          scheduleId = updatedSchedule.id
          scheduleCreated = true

        } catch (createError) {
          retryCount++
          console.error(`❌ Error creating schedule (attempt ${retryCount}/${maxRetries}):`, createError.message)
          
          if (createError.message.includes('already attached to a schedule')) {
            if (retryCount < maxRetries) {
              const waitTime = 5000 * retryCount // Exponential backoff: 5s, 10s, 15s, 20s, 25s
              console.log(`⏳ Subscription still attached to schedule, waiting ${waitTime}ms before retry...`)
              await wait(waitTime)
              continue
            } else {
              throw new Error(`Unable to create subscription schedule after ${maxRetries} attempts. The subscription appears to still be attached to a canceled schedule. Please try again in a few minutes.`)
            }
          } else if (createError.message.includes('No such subscription')) {
            throw new Error('Subscription not found in Stripe. Please refresh the page and try again.')
          } else {
            // For other errors, don't retry
            throw createError
          }
        }
      }
      
      if (!scheduleCreated) {
        throw new Error('Failed to create schedule after multiple attempts due to timing issues with Stripe API')
      }
    }

    // Step 3: Save the scheduled change in database
    const effectiveDate = new Date(stripeSubscription.current_period_end * 1000)
    const effectiveDateISO = effectiveDate.toISOString()
    const effectiveDateFormatted = effectiveDate.toLocaleDateString()
    
    // Check if we already have a record for this schedule
    const { data: existingChange } = await supabase
      .from('subscription_schedule_changes')
      .select('id')
      .eq('stripe_schedule_id', scheduleId)
      .single()

    if (existingChange) {
      // Update existing record
      await supabase
        .from('subscription_schedule_changes')
        .update({
          new_plan: newPlanType,
          effective_date: effectiveDateISO,
          status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingChange.id)
      
      console.log('✅ Updated existing downgrade record in database')
    } else {
      // Create new record
      await supabase
        .from('subscription_schedule_changes')
        .insert({
          user_id: dbSubscription.user_id,
          subscription_id: dbSubscription.id,
          stripe_schedule_id: scheduleId,
          current_plan: dbSubscription.plan_type,
          new_plan: newPlanType,
          effective_date: effectiveDateISO,
          status: 'scheduled',
          created_at: new Date().toISOString()
        })
      
      console.log('✅ Created new downgrade record in database')
    }

    console.log('🎯 Downgrade successfully scheduled for:', effectiveDateISO)

    return {
      message: `Downgrade to ${newPlanType} scheduled! Your current plan will continue until ${effectiveDateFormatted}, then automatically switch to ${newPlanType}.`,
      effectiveDate: effectiveDateFormatted
    }

  } catch (error) {
    console.error('❌ Error in handleEndOfCycleDowngrade:', error)
    throw error
  }
}

// Utility function to get plan limits
export function getPlanLimits(planType) {
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
