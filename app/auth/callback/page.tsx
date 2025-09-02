'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Processing authentication...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        
        console.log('Processing auth callback with:', { code, tokenHash, type })

        // Handle OAuth callback (Google, LinkedIn)
        if (code) {
          console.log('Processing OAuth callback...')
          setMessage('Completing sign in...')
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('OAuth callback failed:', error)
            setStatus('error')
            setMessage('Sign in failed. Please try again.')
            return
          }

          if (data.user) {
            console.log('OAuth sign in successful for:', data.user.email)
            setStatus('success')
            setMessage('Sign in successful!')
            
            // Redirect after a short delay
            setTimeout(() => {
              if (!data.user.user_metadata?.account_type) {
                router.push('/auth/account-type')
              } else if (data.user.user_metadata.account_type === 'employer') {
                router.push('/employer')
              } else {
                router.push('/dashboard')
              }
            }, 1500)
            return
          }
        }
        
        // Handle email verification callback
        else if (tokenHash && type) {
          console.log('Processing email verification...')
          setMessage('Confirming your email...')
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          })

          if (error) {
            console.error('Email verification failed:', error)
            setStatus('error')
            setMessage('Email verification failed. Please try again.')
            return
          }

          if (data.user) {
            console.log('Email confirmed successfully for:', data.user.email)
            setStatus('success')
            setMessage('Email confirmed successfully!')
            
            // Redirect after a short delay
            setTimeout(() => {
              if (!data.user.user_metadata?.account_type) {
                router.push('/auth/account-type')
              } else if (data.user.user_metadata.account_type === 'employer') {
                router.push('/employer')
              } else {
                router.push('/dashboard')
              }
            }, 1500)
            return
          }
        }

        // If no code or token, something went wrong
        setStatus('error')
        setMessage('Invalid authentication link.')
        
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred.')
      }
    }

    handleAuthCallback()
  }, [router, supabase, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-gray-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-white">
              FieldJobs
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/auth/login"
                className="border border-white text-white hover:bg-white hover:text-gray-900 px-4 py-2 rounded transition-colors"
              >
                Login
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            
            {/* Loading State */}
            {status === 'verifying' && (
              <>
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Authenticating
                </h1>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
              </>
            )}

            {/* Success State */}
            {status === 'success' && (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Success!
                </h1>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
                <p className="text-gray-600 mb-8">
                  Redirecting you now...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
              </>
            )}

            {/* Error State */}
            {status === 'error' && (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Authentication Failed
                </h1>
                <p className="text-gray-600 mb-8">
                  {message}
                </p>
                <a 
                  href="/auth/login"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors inline-block"
                >
                  Go to Login
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}