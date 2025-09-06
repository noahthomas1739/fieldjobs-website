'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AccountTypePage() {
  const { user, loading, updateUserMetadata } = useAuth()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  // Handle redirect in useEffect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (user.user_metadata?.account_type) {
        // User already has account type, redirect appropriately
        if (user.user_metadata.account_type === 'employer') {
          router.push('/employer')
        } else {
          router.push('/dashboard')
        }
      }
    }
  }, [user, loading, router])

  const handleAccountTypeSelection = async (accountType) => {
    setIsUpdating(true)
    
    try {
      console.log('Setting account type to:', accountType)
      
      // Update user metadata using the hook function
      const { error } = await updateUserMetadata({ account_type: accountType })

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
