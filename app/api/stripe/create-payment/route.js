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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_SINGLE_JOB_PRICE_ID, quantity: 1 }],
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
