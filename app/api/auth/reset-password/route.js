import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { password, token, type, code } = await request.json()

    console.log('Server: Received request with:', {
      hasPassword: !!password,
      hasToken: !!token,
      type,
      hasCode: !!code,
      tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
    })

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Method 1: Token-based reset (new method)
    if (token && type === 'recovery') {
      console.log('Server: Attempting OTP verification...')
      
      try {
        // Clean the token - remove any URL encoding issues
        const cleanToken = token.trim()
        console.log('Server: Using clean token:', cleanToken.substring(0, 15) + '...')
        
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: cleanToken,
          type: 'recovery'
        })

        console.log('Server: OTP verification result:', {
          hasData: !!data,
          hasSession: !!data?.session,
          hasUser: !!data?.user,
          error: error?.message
        })

        if (error) {
          console.error('Server: OTP verification failed:', error)
          
          // Try alternative: direct session setting if we have user data
          if (data?.user) {
            console.log('Server: Trying to create session manually...')
            // This won't work, but let's see what we get
          }
          
          return NextResponse.json({ error: `OTP verification failed: ${error.message}` }, { status: 401 })
        }

        if (data?.session) {
          console.log('Server: ✅ OTP verified, session established for user:', data.user?.email)
        } else {
          console.log('Server: ⚠️ OTP verified but no session created')
          return NextResponse.json({ error: 'Token verified but session not established' }, { status: 401 })
        }
        
      } catch (otpError) {
        console.error('Server: OTP verification exception:', otpError)
        return NextResponse.json({ error: `OTP verification exception: ${otpError.message}` }, { status: 401 })
      }
    }
    // Method 2: Code-based reset (fallback)
    else if (code) {
      console.log('Server: Attempting code exchange...')
      
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error('Server: Code exchange error:', error)
          return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
        }
        
        console.log('Server: Code exchange successful')
      } catch (codeError) {
        console.error('Server: Code exchange failed:', codeError)
        return NextResponse.json({ error: 'Failed to establish session from code' }, { status: 401 })
      }
    }
    else {
      console.log('Server: No valid reset parameters provided')
      return NextResponse.json({ error: 'Missing reset parameters' }, { status: 400 })
    }

    // Check for valid session after auth method
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    console.log('Server: Final session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      sessionError: sessionError?.message
    })

    if (sessionError || !session) {
      console.error('Server: No valid session found after auth')
      return NextResponse.json({ error: 'No valid session established' }, { status: 401 })
    }

    console.log('Server: 🚀 Updating password for user:', session.user.email)

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      console.error('Server: Password update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log('Server: ✅ Password updated successfully!')

    // Sign out user
    await supabase.auth.signOut()

    return NextResponse.json({ message: 'Password updated successfully' })

  } catch (err) {
    console.error('Server: Unexpected error:', err)
    return NextResponse.json({ error: 'Server error occurred' }, { status: 500 })
  }
}