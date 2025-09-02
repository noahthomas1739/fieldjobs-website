// /app/api/purchase-job-feature/route.js
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { jobId, featureType, priceId, userId } = await request.json()

    // Validate inputs
    if (!jobId || !featureType || !priceId || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify job belongs to user
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('employer_id', userId)
      .single()

    if (jobError || !job) {
      return Response.json({ error: 'Job not found or access denied' }, { status: 404 })
    }

    // Get user profile for Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      return Response.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: profile.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?session_id={CHECKOUT_SESSION_ID}&feature_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?feature_cancelled=true`,
      metadata: {
        type: 'job_feature',
        userId: userId,
        jobId: jobId,
        featureType: featureType,
      },
    })

    return Response.json({ 
      sessionId: session.id,
      success: true 
    })

  } catch (error) {
    console.error('Error creating job feature checkout session:', error)
    return Response.json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    }, { status: 500 })
  }
}