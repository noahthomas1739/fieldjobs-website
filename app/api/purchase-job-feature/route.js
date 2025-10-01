// /app/api/purchase-job-feature/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { jobId, featureType, userId } = await request.json()

    // Validate inputs
    if (!jobId || !featureType || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Dynamic pricing for job features
    const featurePricing = {
      'featured': {
        name: 'Featured Job Listing',
        amount: 2900, // $29.00
        description: 'Your job will appear at the top of search results and get highlighted styling for 30 days.'
      },
      'urgent': {
        name: 'Urgent Job Badge',
        amount: 1900, // $19.00
        description: 'Your job will display an "URGENT" badge to attract immediate attention for 14 days.'
      }
    }

    const featureConfig = featurePricing[featureType]
    if (!featureConfig) {
      return Response.json({ error: 'Invalid feature type' }, { status: 400 })
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

    // Create Stripe checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: profile.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: featureConfig.name,
              description: featureConfig.description,
            },
            unit_amount: featureConfig.amount,
          },
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