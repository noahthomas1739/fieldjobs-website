'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function ResourcesPage() {
  const router = useRouter()
  const [showAlertModal, setShowAlertModal] = useState(false)
  
  const handleRegisterClick = () => {
    router.push('/auth/signup')
  }
  
  const handleEmployerPlansClick = () => {
    router.push('/employers')
  }
  
  const handleJobAlertsClick = () => {
    // Option 1: Redirect to homepage with alerts modal
    router.push('/?alerts=true')
    
    // Option 2: Or open modal directly (uncomment if you prefer)
    // setShowAlertModal(true)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Resources & Links</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center flex flex-col h-full">
          <h3 className="text-xl font-bold text-orange-500 mb-3">👥 Create Account</h3>
          <p className="mb-4 flex-grow">Join our community of technical professionals</p>
          <button 
            onClick={handleRegisterClick}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded transition-colors duration-200 mt-auto"
          >
            Register Now
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center flex flex-col h-full">
          <h3 className="text-xl font-bold text-orange-500 mb-3">💼 For Employers</h3>
          <p className="mb-4 flex-grow">Explore our hiring solutions and pricing</p>
          <button 
            onClick={handleEmployerPlansClick}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded transition-colors duration-200 mt-auto"
          >
            View Employer Plans
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center flex flex-col h-full">
          <h3 className="text-xl font-bold text-orange-500 mb-3">📧 Job Alerts</h3>
          <p className="mb-4 flex-grow">Get notified about new opportunities</p>
          <button 
            onClick={handleJobAlertsClick}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded transition-colors duration-200 mt-auto"
          >
            Set Up Alerts
          </button>
        </div>
        

      </div>
      
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h4 className="text-lg font-bold mb-3">Questions?</h4>
        <p>
          Contact us at{' '}
          <a 
            href="mailto:support@field-jobs.co" 
            className="text-orange-500 hover:text-orange-600 font-bold"
          >
            support@field-jobs.co
          </a>
        </p>
      </div>

    </div>
  )
}