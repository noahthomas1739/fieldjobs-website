'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('Auth check - Full user object:', user)
        console.log('User metadata:', user?.user_metadata)
        setUser(user)
        setLoading(false)
      } catch (error) {
        console.error('Auth error:', error)
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        console.log('Session user metadata:', session?.user?.user_metadata)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_OUT') {
          router.push('/auth/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase])

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign in...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `https://field-jobs.co/auth/callback`
        }
      })

      if (error) {
        console.error('Google sign in error:', error)
        throw error
      }

      console.log('Google sign in initiated:', data)
      return { data, error: null }
    } catch (error) {
      console.error('Google sign in failed:', error)
      return { data: null, error }
    }
  }

  // Email Sign In
  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Don't check for email confirmation here - Supabase handles this automatically
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Update user metadata
  const updateUserMetadata = async (metadata) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: metadata
      })
      
      if (error) throw error
      
      // Refresh the user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      setUser(updatedUser)
      
      return { data, error: null }
    } catch (error) {
      console.error('Error updating user metadata:', error)
      return { data: null, error }
    }
  }

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    updateUserMetadata
  }
}

export { useAuth }