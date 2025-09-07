'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function EmployersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [showFreeJobBanner, setShowFreeJobBanner] = useState(true)
  const [freeJobEligible, setFreeJobEligible] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(false)

  // Check free job eligibility when user logs in
  useEffect(() => {
    const checkFreeJobEligibility = async () => {
      if (!user?.id) return

      try {
        setCheckingEligibility(true)
        const response = await fetch(`/api/free-job/check-eligibility?userId=${user.id}`)
        const data = await response.json()

        if (data.success) {
          setFreeJobEligible(data.eligible)
        }
      } catch (error) {
        console.error('Error checking free job eligibility:', error)
      } finally {
        setCheckingEligibility(false)
      }
    }

    if (user?.id) {
      checkFreeJobEligibility()
    }
  }, [user?.id])

  // FIXED: Handle free job banner click with multiple account type checks
  const handleFreeJobClick = () => {
    if (!user) {
      // Not logged in - redirect to account creation with return URL
      router.push('/auth/signup?redirect=free_job&type=employer')
      return
    }

    // Check if user is employer by looking at multiple possible locations
    const isEmployer = 
      user.user_metadata?.account_type === 'employer' ||
      user.app_metadata?.account_type === 'employer' ||
      user.user_metadata?.accountType === 'employer'
      // REMOVED: user.account_type === 'employer' (this property doesn't exist on User type)

    if (!isEmployer) {
      // Logged in but not employer - go to create employer account
      router.push('/auth/signup?type=employer&redirect=free_job')
      return
    }

    // Logged in employer - redirect to employer dashboard with free job
    if (freeJobEligible) {
      router.push('/employer?action=post-free-job')
    } else {
      router.push('/employer')
    }
  }

  // Purchase function for resume credits
  const handleCreditPurchase = async (packageType: string) => {
    // Check if user is signed in
    if (!user) {
      // Redirect to login with return URL
      router.push('/auth/login?returnTo=/employers')
      return
    }

    try {
      const packageMapping: Record<string, { priceId: string; credits: number; amount: number }> = {
        'small': { 
          priceId: process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_10_PRICE_ID || '', 
          credits: 10, 
          amount: 3900 
        },
        'medium': { 
          priceId: process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_25_PRICE_ID || '', 
          credits: 25, 
          amount: 7900 
        },
        'large': { 
          priceId: process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_50_PRICE_ID || '', 
          credits: 50, 
          amount: 12900 
        }
      }

      const selectedPackage = packageMapping[packageType]
      
      const response = await fetch('/api/purchase-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: selectedPackage.priceId,
          credits: selectedPackage.credits,
          packageType: packageType,
          amount: selectedPackage.amount
        })
      })

      const data = await response.json()
      
      if (data.sessionId) {
        const { getStripe } = await import('@/lib/stripe')
        const stripe = await getStripe()
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        alert('Error creating checkout session: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error purchasing credits:', error)
      alert('Error starting checkout. Please try again.')
    }
  }

  // Purchase function for subscription plans
  const handleSubscriptionPurchase = async (planType: string) => {
    // Check if user is signed in
    if (!user) {
      // Redirect to login with return URL
      router.push('/auth/login?returnTo=/employers')
      return
    }

    try {
      const priceMapping: Record<string, string> = {
        'single': process.env.NEXT_PUBLIC_STRIPE_SINGLE_JOB_PRICE_ID || '',
        'starter': process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
        'growth': process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID || '',
        'professional': process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || '',
        'enterprise': process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || ''
      }

      const priceId = priceMapping[planType]

      if (!priceId) {
        alert('Plan not available. Please contact support.')
        return
      }

      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          planType: planType
        }),
      })

      const data = await response.json()

      if (data.sessionId) {
        // Redirect to Stripe Checkout
        const { getStripe } = await import('@/lib/stripe')
        const stripe = await getStripe()
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        alert('Error creating checkout session: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error purchasing subscription:', error)
      alert('Error starting checkout. Please try again.')
    }
  }

  // Purchase function for add-on features
  const handleAddonPurchase = async (addonType: string) => {
    // Check if user is signed in
    if (!user) {
      // Redirect to login with return URL
      router.push('/auth/login?returnTo=/employers')
      return
    }

    try {
      const addonMapping: Record<string, { priceId: string; name: string }> = {
        'featured': {
          priceId: process.env.NEXT_PUBLIC_STRIPE_FEATURED_LISTING_PRICE_ID || '',
          name: 'Featured Job Listing'
        },
        'urgent': {
          priceId: process.env.NEXT_PUBLIC_STRIPE_URGENT_BADGE_PRICE_ID || '',
          name: 'Urgent Badge'
        }
      }

      const addon = addonMapping[addonType]

      if (!addon) {
        alert('Add-on not available. Please contact support.')
        return
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: addon.priceId,
          addonType: addonType,
          successUrl: `${window.location.origin}/employers?addon=success`,
          cancelUrl: `${window.location.origin}/employers?addon=cancelled`
        }),
      })

      const data = await response.json()

      if (data.sessionId) {
        const { getStripe } = await import('@/lib/stripe')
        const stripe = await getStripe()
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        alert('Error creating checkout session: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error purchasing add-on:', error)
      alert('Error starting checkout. Please try again.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Thin Free Job Notification */}
      {showFreeJobBanner && (
        <div style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', 
          color: 'white', 
          padding: '0.75rem 2rem', 
          textAlign: 'center',
          position: 'relative',
          fontSize: '0.9rem',
          fontWeight: '500',
          marginBottom: '2rem',
          borderRadius: '8px'
        }}>
          {!user ? (
            <>🎁 Employers: Post Your First Job Free - 30 days of visibility, no credit card required</>
          ) : freeJobEligible ? (
            <>🎁 Post Your First Job Free - 30 days of visibility at no cost</>
          ) : null}
          
          <button
            onClick={handleFreeJobClick}
            disabled={checkingEligibility}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '600',
              marginLeft: '1rem',
              cursor: checkingEligibility ? 'not-allowed' : 'pointer',
              opacity: checkingEligibility ? 0.7 : 1
            }}
          >
            {checkingEligibility ? 'Checking...' : 
             !user ? 'Sign Up Free' : 
             freeJobEligible ? 'Get Started' : 'Go to Dashboard'}
          </button>
          
          <button
            onClick={() => setShowFreeJobBanner(false)}
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              opacity: 0.7
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-gray-900 text-white py-16 rounded-lg mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Why Choose FieldJobs?</h1>
        <p className="text-xl">The premier destination for technical industry hiring</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-8">
        <div className="text-center">
          <h3 className="text-xl font-bold text-orange-500 mb-3">🎯 Targeted Reach</h3>
          <p>Connect directly with qualified engineers, technicians, and technical professionals.</p>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-orange-500 mb-3">⚡ Fast Hiring</h3>
          <p>Post jobs and start receiving applications within hours from our active candidate base.</p>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-orange-500 mb-3">🚀 Quick Results</h3>
          <p>Post jobs in minutes and start receiving applications immediately.</p>
        </div>
      </div>

      {/* Pricing Plans Section */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600">Flexible pricing to fit your hiring needs</p>
          {freeJobEligible && user && (
            <div className="bg-green-100 text-green-800 p-3 rounded-lg mt-4 inline-block">
              🎁 You're eligible for a FREE job posting! <button onClick={handleFreeJobClick} className="underline font-semibold">Post it now</button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Single Job Option */}
          <div className="border-2 border-gray-200 rounded-lg p-6 text-center flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Single Job</h3>
            <div className="text-3xl font-bold text-orange-500 mb-2">$99</div>
            <div className="text-gray-600 mb-4">one-time</div>
            <ul className="space-y-2 text-sm mb-6 text-left flex-grow">
              <li>✓ 1 job posting (30 days)</li>
              <li>✓ Manage applications & resumes</li>
              <li>✓ Email support</li>
              <li>✓ Auto-expires after 30 days</li>
            </ul>
            <button 
              onClick={() => handleSubscriptionPurchase('single')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded font-semibold"
            >
              Post Single Job
            </button>
          </div>

          {/* Starter Plan */}
          <div className="border-2 border-gray-200 rounded-lg p-6 text-center flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Starter</h3>
            <div className="text-3xl font-bold text-orange-500 mb-2">$199</div>
            <div className="text-gray-600 mb-4">per month</div>
            <ul className="space-y-2 text-sm mb-6 text-left flex-grow">
              <li>✓ 3 job postings</li>
              <li>✓ Manage applications & resumes</li>
              <li>✓ Browse candidate database</li>
              <li>✓ Email support</li>
              <li className="text-red-600 font-medium">✗ No resume credits included</li>
            </ul>
            <button 
              onClick={() => handleSubscriptionPurchase('starter')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded font-semibold"
            >
              Get Started
            </button>
          </div>

          {/* Growth Plan */}
          <div className="border-2 border-orange-500 rounded-lg p-6 bg-orange-50 text-center relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">MOST POPULAR</span>
            </div>
            <h3 className="text-lg font-semibold mb-4 mt-2">Growth</h3>
            <div className="text-3xl font-bold text-orange-500 mb-2">$299</div>
            <div className="text-gray-600 mb-4">per month</div>
            <ul className="space-y-2 text-sm mb-6 text-left">
              <li>✓ 6 job postings</li>
              <li>✓ Manage applications & resumes</li>
              <li>✓ 5 resume credits monthly</li>
              <li>✓ Browse all candidate profiles</li>
              <li>✓ Priority support</li>
              <li>✓ Application analytics</li>
            </ul>
            <button 
              onClick={() => handleSubscriptionPurchase('growth')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded font-semibold"
            >
              Choose Growth
            </button>
          </div>

          {/* Professional Plan */}
          <div className="border-2 border-gray-200 rounded-lg p-6 text-center flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Professional</h3>
            <div className="text-3xl font-bold text-orange-500 mb-2">$599</div>
            <div className="text-gray-600 mb-4">per month</div>
            <ul className="space-y-2 text-sm mb-6 text-left flex-grow">
              <li>✓ 15 job postings</li>
              <li>✓ Manage applications & resumes</li>
              <li>✓ 25 resume credits monthly</li>
              <li>✓ Advanced analytics</li>
              <li>✓ Featured job listings</li>
              <li>✓ Priority support</li>
            </ul>
            <button 
              onClick={() => handleSubscriptionPurchase('professional')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded font-semibold"
            >
              Go Professional
            </button>
          </div>
        </div>

        {/* Enterprise Plan - Full Width */}
        <div className="mb-8">
          <div className="border-2 border-purple-500 rounded-lg p-8 bg-purple-50 text-center">
            <h3 className="text-2xl font-semibold mb-4">Enterprise</h3>
            <div className="text-4xl font-bold text-purple-600 mb-2">$1,999</div>
            <div className="text-gray-600 mb-6">per month</div>
            <div className="grid md:grid-cols-3 gap-4 text-sm mb-6">
              <div>✓ Unlimited job postings</div>
              <div>✓ 100 resume credits monthly</div>
              <div>✓ Dedicated account manager</div>
            </div>
            <button 
              onClick={() => handleSubscriptionPurchase('enterprise')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Choose Enterprise
            </button>
          </div>
        </div>

        {/* Add-On Features */}
        <div className="bg-gray-50 p-8 rounded-lg mb-8">
          <h3 className="text-2xl font-bold text-center mb-6">Premium Add-Ons</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg border">
              <h4 className="font-semibold mb-3">Extra Resume Credits</h4>
              <div className="text-lg font-bold text-orange-500 mb-4">Never expire</div>
              <div className="space-y-3">
                <div>
                  <button 
                    onClick={() => handleCreditPurchase('small')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded mb-1"
                  >
                    $39 - Buy 10 Credits
                  </button>
                </div>
                <div>
                  <button 
                    onClick={() => handleCreditPurchase('medium')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded mb-1"
                  >
                    $79 - Buy 25 Credits
                  </button>
                </div>
                <div>
                  <button 
                    onClick={() => handleCreditPurchase('large')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                  >
                    $129 - Buy 50 Credits
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Need to unlock more candidate contact info from our database? Buy extra credits for busy periods.</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg border">
              <h4 className="font-semibold mb-3">Featured Job</h4>
              <div className="text-lg font-bold text-orange-500 mb-2">+$29</div>
              <div className="text-sm text-gray-600 mb-4">per job posting</div>
              <p className="text-xs text-gray-500 mb-4">Your job appears at the top of search results with a bright highlight badge</p>
              <button 
                onClick={() => handleAddonPurchase('featured')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
              >
                Feature Jobs
              </button>
              <p className="text-xs text-green-600 mt-2 font-medium">✓ Works with FREE jobs too!</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg border">
              <h4 className="font-semibold mb-3">Urgent Badge</h4>
              <div className="text-lg font-bold text-orange-500 mb-2">+$19</div>
              <div className="text-sm text-gray-600 mb-4">per job posting</div>
              <p className="text-xs text-gray-500 mb-4">Add a bright "URGENT" badge to get immediate attention from job seekers</p>
              <button 
                onClick={() => handleAddonPurchase('urgent')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
              >
                Add Urgent
              </button>
              <p className="text-xs text-green-600 mt-2 font-medium">✓ Works with FREE jobs too!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center bg-gray-50 p-8 rounded-lg">
        <h3 className="text-2xl font-bold mb-4">Ready to Find Your Next Great Hire?</h3>
        <p className="mb-6">Join hundreds of technical companies using FieldJobs</p>
        <div className="flex justify-center gap-4">
          {freeJobEligible && user ? (
            <button 
              onClick={handleFreeJobClick}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-lg"
            >
              🎁 Post Your First Job FREE
            </button>
          ) : (
            <button 
              onClick={() => handleSubscriptionPurchase('single')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Post Your First Job - $99
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
