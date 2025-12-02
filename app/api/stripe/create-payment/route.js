import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const { jobData } = await request.json()
    
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to use Price ID from environment, otherwise use dynamic pricing
    const singleJobPriceId = process.env.NEXT_PUBLIC_STRIPE_SINGLE_JOB_PRICE_ID
    
    let lineItem
    if (singleJobPriceId) {
      console.log('✅ Using Single Job Price ID from environment')
      lineItem = {
        price: singleJobPriceId,
        quantity: 1
      }
    } else {
      console.log('⚠️ No Price ID found, using dynamic pricing')
      lineItem = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Single Job Posting',
            description: 'Post one job for 60 days'
          },
          unit_amount: 19900, // $199.00
        },
        quantity: 1
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/employer?payment_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/employer?payment_canceled=true`,
      metadata: { user_id: user.id, job_title: jobData.title, payment_type: 'single_job' }
    })

    return NextResponse.json({ sessionId: session.id, jobData })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
