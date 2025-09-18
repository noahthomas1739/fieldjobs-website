// app/api/purchase-credits/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    const { userId, creditPackage } = await request.json()

    if (!userId || !creditPackage) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and credit package are required' 
      }, { status: 400 })
    }

    // Define credit packages
    const packages = {
      'small': { credits: 10, price: 39 },
      'medium': { credits: 25, price: 79 },
      'large': { credits: 50, price: 129 }
    }

    const selectedPackage = packages[creditPackage]
    
    if (!selectedPackage) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credit package' 
      }, { status: 400 })
    }

    console.log(`💰 Adding ${selectedPackage.credits} purchased credits for user:`, userId)

    // Get or create credit balance
    let { data: creditBalance, error: creditError } = await supabase
      .from('credit_balances')
      .select('purchased_credits, monthly_credits')
      .eq('user_id', userId)
      .single()

    if (creditError && creditError.code === 'PGRST116') {
      // Create initial credit balance if it doesn't exist
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', userId)
        .single()
      
      const monthlyCredits = {
        'growth': 5,
        'professional': 25,
        'enterprise': 100
      }[subscription?.plan_type] || 0
      
      const { data: newBalance, error: createError } = await supabase
        .from('credit_balances')
        .insert({
          user_id: userId,
          monthly_credits: monthlyCredits,
          purchased_credits: selectedPackage.credits,
          last_monthly_refresh: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating credit balance:', createError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create credit balance' 
        }, { status: 500 })
      }
      
      creditBalance = newBalance
    } else if (creditError) {
      console.error('❌ Error fetching credit balance:', creditError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch credit balance' 
      }, { status: 500 })
    } else {
      // Add purchased credits to existing balance
      const newPurchasedCredits = creditBalance.purchased_credits + selectedPackage.credits
      
      const { error: updateError } = await supabase
        .from('credit_balances')
        .update({ 
          purchased_credits: newPurchasedCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (updateError) {
        console.error('❌ Error updating credit balance:', updateError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to add credits' 
        }, { status: 500 })
      }
      
      creditBalance.purchased_credits = newPurchasedCredits
    }

    // Log the purchase (optional - for tracking)
    const { error: logError } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: userId,
        credits_purchased: selectedPackage.credits,
        package_type: creditPackage,
        amount_paid: selectedPackage.price,
        purchased_at: new Date().toISOString()
      })

    // Don't fail if logging fails - it's not critical
    if (logError) {
      console.warn('⚠️ Failed to log credit purchase:', logError)
    }

    const totalCredits = creditBalance.monthly_credits + creditBalance.purchased_credits
    
    console.log(`✅ Added ${selectedPackage.credits} credits. Total credits: ${totalCredits}`)

    return NextResponse.json({
      success: true,
      creditsAdded: selectedPackage.credits,
      totalCredits: totalCredits,
      message: `Successfully added ${selectedPackage.credits} credits to your account!`
    })

  } catch (error) {
    console.error('❌ Purchase credits server error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error while purchasing credits' 
    }, { status: 500 })
  }
}