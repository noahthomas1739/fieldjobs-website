// app/api/unlock-profile/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { profileId, userId } = await request.json()

    if (!profileId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Profile ID and User ID are required' 
      }, { status: 400 })
    }

    console.log('🔓 Unlocking profile:', { profileId, userId })

    // Get user's credit balance
    const { data: creditBalance, error: creditError } = await supabase
      .from('credit_balances')
      .select('monthly_credits, purchased_credits, last_monthly_refresh')
      .eq('user_id', userId)
      .single()

    if (creditError || !creditBalance) {
      console.error('❌ Error fetching credit balance:', creditError)
      
      // Try to create initial credit balance if it doesn't exist
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
          purchased_credits: 0,
          last_monthly_refresh: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()
      
      if (createError) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to initialize credit balance' 
        }, { status: 500 })
      }
      
      // Use the newly created balance
      creditBalance = newBalance
    }

    // Check if monthly credits need refreshing
    const today = new Date()
    const lastRefresh = new Date(creditBalance.last_monthly_refresh)
    const daysDiff = Math.floor((today - lastRefresh) / (1000 * 60 * 60 * 24))

    if (daysDiff >= 30) {
      console.log('🔄 Refreshing monthly credits for user:', userId)
      
      // Get user's current subscription plan
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
      
      // Refresh monthly credits
      const { error: refreshError } = await supabase
        .from('credit_balances')
        .update({ 
          monthly_credits: monthlyCredits,
          last_monthly_refresh: today.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (!refreshError) {
        creditBalance.monthly_credits = monthlyCredits
      }
    }

    // Calculate total credits available
    const totalCredits = creditBalance.monthly_credits + creditBalance.purchased_credits

    if (totalCredits < 1) {
      console.log('❌ Insufficient credits:', totalCredits)
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient credits' 
      }, { status: 400 })
    }

    // Deduct credits (monthly first, then purchased)
    let newMonthlyCredits = creditBalance.monthly_credits
    let newPurchasedCredits = creditBalance.purchased_credits

    if (newMonthlyCredits > 0) {
      newMonthlyCredits -= 1
      console.log('💳 Using monthly credit. Remaining monthly:', newMonthlyCredits)
    } else {
      newPurchasedCredits -= 1
      console.log('💰 Using purchased credit. Remaining purchased:', newPurchasedCredits)
    }

    // Update credit balance
    const { error: updateError } = await supabase
      .from('credit_balances')
      .update({ 
        monthly_credits: newMonthlyCredits,
        purchased_credits: newPurchasedCredits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('❌ Error updating credits:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to deduct credit' 
      }, { status: 500 })
    }

    // Log the unlock action (optional - for tracking)
    const { error: logError } = await supabase
      .from('profile_unlocks')
      .insert({
        employer_id: userId,
        job_seeker_id: profileId,
        unlocked_at: new Date().toISOString()
      })

    // Don't fail if logging fails - it's not critical
    if (logError) {
      console.warn('⚠️ Failed to log unlock action:', logError)
    }

    const totalRemaining = newMonthlyCredits + newPurchasedCredits
    console.log(`✅ Profile unlocked! Total credits remaining: ${totalRemaining}`)

    return NextResponse.json({
      success: true,
      creditsRemaining: totalRemaining,
      message: 'Profile unlocked successfully'
    })

  } catch (error) {
    console.error('❌ Unlock profile server error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error while unlocking profile' 
    }, { status: 500 })
  }
}