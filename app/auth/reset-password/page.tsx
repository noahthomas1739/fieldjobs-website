'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Separate component that uses useSearchParams - must be wrapped in Suspense
function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for error parameters
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      return
    }

    // Check for token-based reset (new method)
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    
    // Check for code-based reset (old method)
    const code = searchParams.get('code')

    console.log('URL Parameters:', { token: token ? 'found' : 'missing', type, code: code ? 'found' : 'missing' })

    if (token && type === 'recovery') {
      console.log('✅ Valid token-based reset link detected')
      // Clear any existing error since we have valid tokens
      setError('')
    } else if (code) {
      console.log('✅ Code-based reset link detected - will handle via server')
      setError('')
    } else {
      console.log('❌ No valid reset tokens found')
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Support both token-based and code-based resets
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      const code = searchParams.get('code')

      console.log('Form submission - Parameters:', { 
        token: token ? `${token.substring(0, 20)}...` : 'missing', 
        type, 
        code: code ? `${code.substring(0, 20)}...` : 'missing' 
      })

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password,
          token,
          type,
          code // Include code for backward compatibility
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Server error:', data)
        setError(data.error || 'Failed to update password')
      } else {
        console.log('✅ Password updated successfully')
        setMessage('Password updated successfully! Redirecting to login...')
        setTimeout(() => {
          router.push('/auth/login?message=Password updated successfully. Please log in with your new password.')
        }, 2000)
      }
    } catch (err) {
      console.error('Network error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            FieldJobs
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="text-green-800 text-sm">
                ✅ {message}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="text-red-800 text-sm">
                ❌ {error}
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            {password && confirmPassword && (
              <div className="text-sm">
                {password === confirmPassword ? (
                  <p className="text-green-600">✅ Passwords match</p>
                ) : (
                  <p className="text-red-600">❌ Passwords do not match</p>
                )}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || password !== confirmPassword || password.length < 6}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading || password !== confirmPassword || password.length < 6
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/auth/login"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Need help?{' '}
          <Link 
            href="/contact" 
            className="font-medium text-orange-500 hover:text-orange-600"
          >
            Contact Us
          </Link>
        </p>
      </div>
    </div>
  )
}

// Main component with Suspense wrapper
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              FieldJobs
            </Link>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Loading...
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Preparing password reset
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
