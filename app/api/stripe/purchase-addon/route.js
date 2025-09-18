import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const { addonType, priceId, quantity = 1, jobId = null } = await request.json()
    console.log('Received addon purchase request:', { addonType, priceId, quantity, jobId })
    
    // Validate priceId
    if (!priceId || priceId.length === 0) {
      console.error('Missing or empty priceId:', priceId)
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }
    
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

    // Create line item based on addon type
    let lineItem
    let successUrl
    let metadata = { 
      user_id: user.id, 
      addon_type: addonType,
      quantity: quantity.toString()
    }

    switch (addonType) {
      case 'resume_credits_10':
      case 'resume_credits_25':
      case 'resume_credits_50':
        // If no priceId provided, create price_data dynamically
        if (!priceId || priceId === '') {
          const creditAmounts = { 'resume_credits_10': 10, 'resume_credits_25': 25, 'resume_credits_50': 50 }
          const prices = { 'resume_credits_10': 3900, 'resume_credits_25': 7900, 'resume_credits_50': 12900 }
          
          lineItem = { 
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
        } else {
          lineItem = { price: priceId, quantity: 1 }
        }
        successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/employer?credits_purchased=true&type=${addonType}`
        metadata.credits_amount = addonType.split('_')[2] // Extract number from type
        break
        
      case 'featured_listing':
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID required for featured listing' }, { status: 400 })
        }
        if (!priceId || priceId === '') {
          lineItem = { 
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Featured Job Listing',
                description: 'Top of search results with bright highlight badge for 30 days'
              },
              unit_amount: 2900 // $29
            },
            quantity: 1 
          }
        } else {
          lineItem = { price: priceId, quantity: 1 }
        }
        successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/employer?featured_added=true&job_id=${jobId}`
        metadata.job_id = jobId
        break
        
      case 'urgent_badge':
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID required for urgent badge' }, { status: 400 })
        }
        if (!priceId || priceId === '') {
          lineItem = { 
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Urgent Job Badge',
                description: 'Bright "URGENT" badge for immediate attention for 14 days'
              },
              unit_amount: 1900 // $19
            },
            quantity: 1 
          }
        } else {
          lineItem = { price: priceId, quantity: 1 }
        }
        successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/employer?urgent_added=true&job_id=${jobId}`
        metadata.job_id = jobId
        break
        
      default:
        return NextResponse.json({ error: 'Invalid addon type' }, { status: 400 })
    }

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/employer?addon_canceled=true`,
      metadata: metadata
    })

    console.log('Created addon session:', session.id)
    return NextResponse.json({ sessionId: session.id })
    
  } catch (error) {
    console.error('Error in addon purchase API:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 })
  }
}