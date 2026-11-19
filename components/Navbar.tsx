'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const { user, signOut } = useAuth()
  
  return (
    <nav className="bg-gray-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity flex-shrink-0">
            <img 
              src="/fieldjobs-logo.svg" 
              alt="FieldJobs - Technical Careers" 
              className="h-8 w-auto sm:h-10"
            />
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
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            {user ? (
              <>
                <span className="hidden sm:inline text-gray-300 text-sm truncate max-w-[140px]">
                  Welcome, {user.email?.split('@')[0]}
                </span>
                
                {/* Different buttons for different user types */}
                {user.user_metadata?.account_type === 'employer' ? (
                  <Link href="/employer">
                    <button className="bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-md font-medium transition-colors whitespace-nowrap">
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <button className="bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-md font-medium transition-colors whitespace-nowrap">
                      My Profile
                    </button>
                  </Link>
                )}
                
                <button 
                  onClick={signOut}
                  className="border border-white text-white hover:bg-white hover:text-gray-900 px-2.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded transition-colors whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <button className="border border-white text-white hover:bg-white hover:text-gray-900 px-2.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded transition-colors whitespace-nowrap">
                    Login
                  </button>
                </Link>
                <Link href="/employers">
                  <button className="bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-md font-medium transition-colors whitespace-nowrap">
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