// app/api/purchase-credits/route.js
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const { priceId, credits, packageType, amount } = await request.json()
    console.log('💰 Resume credits purchase request:', { priceId, credits, packageType, amount })
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let customerId
    
    // Get existing customer ID or create new one
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      })
      customerId = customer.id
      
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Map packageType to addonType format for consistency
    const addonTypeMap = {
      'small': 'resume_credits_10',
      'medium': 'resume_credits_25',
      'large': 'resume_credits_50'
    }
    
    const addonType = addonTypeMap[packageType]
    
    if (!addonType) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 })
    }

    // Create line item with dynamic pricing (same as purchase-addon route)
    const creditAmounts = { 'resume_credits_10': 10, 'resume_credits_25': 25, 'resume_credits_50': 50 }
    const prices = { 'resume_credits_10': 3900, 'resume_credits_25': 7900, 'resume_credits_50': 12900 }
    
    const lineItem = { 
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Resume Credits - ${creditAmounts[addonType]} Pack`,
          description: `${creditAmounts[addonType]} credits for candidate contact`
        },
        unit_amount: prices[addonType]
      },
      quantity: 1 
    }

    const metadata = { 
      user_id: user.id, 
      addon_type: addonType,
      credits_amount: creditAmounts[addonType].toString(),
      quantity: '1'
    }

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?credits_purchased=true&type=${addonType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employers?credits_canceled=true`,
      metadata: metadata
    })

    console.log('✅ Created resume credits session:', session.id)
    return NextResponse.json({ sessionId: session.id })

  } catch (error) {
    console.error('❌ Purchase credits server error:', error)
    return NextResponse.json({ 
      error: 'Server error while creating checkout session',
      details: error.message 
    }, { status: 500 })
  }
}