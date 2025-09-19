'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AccountTypePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const supabase = createClientComponentClient()

  // Handle redirect in useEffect with proper timing for OAuth flow
  useEffect(() => {
    console.log('🎯 Account Type Page Debug:')
    console.log('- loading:', loading)
    console.log('- user:', user)
    console.log('- user.user_metadata:', user?.user_metadata)
    console.log('- account_type:', user?.user_metadata?.account_type)
    console.log('- hasCheckedAuth:', hasCheckedAuth)
    
    if (!loading) {
      if (!user && !hasCheckedAuth) {
        // Give auth state time to load after OAuth redirect, then check again
        console.log('⏳ No user found, waiting for auth state to load after OAuth...')
        setTimeout(() => {
          setHasCheckedAuth(true)
        }, 2000)
      } else if (!user && hasCheckedAuth) {
        console.log('❌ No user found after delay - redirecting to login')
        router.push('/auth/login')
      } else if (user?.user_metadata?.account_type) {
        // User already has account type, redirect appropriately
        console.log('✅ User has account type:', user.user_metadata.account_type)
        if (user.user_metadata.account_type === 'employer') {
          console.log('🏢 Redirecting to employer dashboard')
          router.push('/employer')
        } else {
          console.log('👷 Redirecting to job seeker dashboard')
          router.push('/dashboard')
        }
      } else if (user) {
        console.log('👤 New user - showing account type selection')
      }
    }
  }, [user, loading, hasCheckedAuth, router])

  const handleAccountTypeSelection = async (accountType: string) => {
    setIsUpdating(true)
    
    try {
      console.log('Setting account type to:', accountType)
      
      // Update user metadata directly with Supabase
      const { error } = await supabase.auth.updateUser({
        data: { account_type: accountType }
      })

      if (error) {
        console.error('Error updating account type:', error)
        alert('Error setting account type. Please try again.')
        setIsUpdating(false)
        return
      }

      console.log('Account type updated successfully!')
      
      // Add a small delay to ensure the update propagates
      setTimeout(() => {
        // Redirect based on account type
        if (accountType === 'employer') {
          router.push('/employer')
        } else {
          router.push('/dashboard')
        }
      }, 500)
      
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong. Please try again.')
      setIsUpdating(false)
    }
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }
  
  // Don't render selection if no user or if user already has account type
  if (!user || user.user_metadata?.account_type) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to FieldJobs!</h1>
          <p className="text-gray-600 mt-2">Choose your account type:</p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => handleAccountTypeSelection('employer')}
            disabled={isUpdating}
            className="w-full p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Setting up...' : "I'm an Employer"}
          </button>
          <button
            onClick={() => handleAccountTypeSelection('job_seeker')}
            disabled={isUpdating}
            className="w-full p-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Setting up...' : "I'm Looking for Work"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500">
          Signed in as: {user.email}
        </p>
        
      </div>
    </div>
  )
}
