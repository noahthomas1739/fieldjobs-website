'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const { user, signOut } = useAuth()
  
  return (
    <nav className="bg-gray-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <span className="text-2xl font-bold">FieldJobs</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="hover:text-gray-200 transition-colors">
              Find Jobs
            </Link>
            <Link href="/employers" className="hover:text-gray-200 transition-colors">
              Employers
            </Link>
            <Link href="/resources" className="hover:text-gray-200 transition-colors">
              Resources
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-300 text-sm">
                  Welcome, {user.email?.split('@')[0]}
                </span>
                
                {/* Different buttons for different user types */}
                {user.user_metadata?.account_type === 'employer' ? (
                  <Link href="/employer">
                    <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors">
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors">
                      My Profile
                    </button>
                  </Link>
                )}
                
                <button 
                  onClick={signOut}
                  className="border border-white text-white hover:bg-white hover:text-gray-900 px-4 py-2 rounded transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <button className="border border-white text-white hover:bg-white hover:text-gray-900 px-4 py-2 rounded transition-colors">
                    Login
                  </button>
                </Link>
                <Link href="/employers">
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors">
                    Post Job
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}