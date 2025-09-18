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

    const { sessionId } = await request.json()

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Extract metadata
    const { userId, jobId, featureType } = session.metadata

    if (!userId || !jobId || !featureType) {
      return Response.json({ error: 'Invalid session metadata' }, { status: 400 })
    }

    console.log(`Processing feature payment: ${featureType} for job ${jobId}`)

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

    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('employer_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating job:', updateError)
      return Response.json({ error: 'Failed to update job' }, { status: 500 })
    }

    // Record the purchase in job_feature_purchases table
    const { error: purchaseError } = await supabase
      .from('job_feature_purchases')
      .insert({
        user_id: userId,
        job_id: jobId,
        feature_type: featureType,
        stripe_session_id: sessionId,
        created_at: new Date().toISOString()
      })

    if (purchaseError) {
      console.error('Error recording purchase:', purchaseError)
      // Don't fail the request if this fails, job is already updated
    }

    console.log(`✅ Successfully applied ${featureType} to job: ${updatedJob.title}`)

    return Response.json({ 
      success: true, 
      message: `${featureType} feature applied successfully!`,
      job: updatedJob
    })

  } catch (error) {
    console.error('Error processing feature payment:', error)
    return Response.json({ 
      error: 'Failed to process payment',
      details: error.message 
    }, { status: 500 })
  }
}