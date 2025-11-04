'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import SubscriptionManagement from '@/components/SubscriptionManagement'

function EmployerDashboardContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Data states with proper types
  const [jobs, setJobs] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>({})
  const [profile, setProfile] = useState<any>({})
  const [subscription, setSubscription] = useState<any>({ 
    tier: 'free', 
    credits: 0, 
    activeJobs: 0,
    stripeSubscriptionId: null 
  })
  
  // Free job feature states
  const [freeJobEligible, setFreeJobEligible] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(true)
  const [showFreeJobForm, setShowFreeJobForm] = useState(false)
  const [pendingPrompts, setPendingPrompts] = useState<any[]>([])
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState<any>(null)
  
  // Subscription check state for prevention logic
  const [subscriptionCheck, setSubscriptionCheck] = useState({
    loading: true,
    hasActiveSubscription: false,
    currentPlan: 'free',
    canPurchaseNew: true
  })
  
  // Modal states
  const [showJobForm, setShowJobForm] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [selectedJobForFeature, setSelectedJobForFeature] = useState<any>(null)
  const [featureType, setFeatureType] = useState('') // 'featured' or 'urgent'
  const [editingJob, setEditingJob] = useState<any>(null)
  
  // Resume search states
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchFilters, setSearchFilters] = useState({
    keywords: '',
    location: '',
    classification: '',
    specialization: '',
    minExperience: '',
    maxExperience: '',
    industries: '',
    clearance: '',
    availableBy: '',
    minRate: '',
    maxRate: ''
  })
  const [searchLoading, setSearchLoading] = useState(false)
  const [userCredits, setUserCredits] = useState(0)
  const [unlockedProfiles, setUnlockedProfiles] = useState(new Set())
  
  // Job form data
  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    description: '',
    requirements: '',
    region: '',
    hourlyRate: '',
    duration: '',
    startDate: '',
    industry: '',
    classification: '',
    benefits: '',
    contactEmail: '',
    contactPhone: ''
  })

  // Application filtering states
  const [selectedJobFilter, setSelectedJobFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // Empty = show all statuses

  // Track notification state to prevent duplicates
  const [notificationShown, setNotificationShown] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)

  // Free job functions
  const checkFreeJobEligibility = async () => {
    try {
      if (!user?.id) return

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

  const checkUpgradePrompts = async () => {
    try {
      if (!user?.id) return

      const response = await fetch(`/api/free-job/upgrade-prompts?userId=${user.id}`)
      const data = await response.json()

      if (data.success && data.prompts.length > 0) {
        setPendingPrompts(data.prompts)
        const urgentPrompt = data.prompts[0]
        setCurrentPrompt(urgentPrompt)
        setShowUpgradePrompt(true)
      }
    } catch (error) {
      console.error('Error checking upgrade prompts:', error)
    }
  }

  const submitFreeJob = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return
    
    try {
      setIsLoading(true)

      const response = await fetch('/api/free-job/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          jobData: jobForm
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('🎉 ' + data.message)
        await loadJobs()
        setFreeJobEligible(false)
        setShowFreeJobForm(false)
        setJobForm({
          title: '', company: '', description: '', requirements: '', region: '',
          hourlyRate: '', duration: '', startDate: '', industry: '', classification: '',
          benefits: '', contactEmail: '', contactPhone: ''
        })
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating free job:', error)
      alert('Error creating free job')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptAction = async (action: string) => {
    try {
      if (currentPrompt) {
        await fetch('/api/free-job/upgrade-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promptId: currentPrompt.id,
            action: action
          })
        })
      }

      setShowUpgradePrompt(false)
      setCurrentPrompt(null)

      if (action === 'upgrade') {
        setActiveTab('billing')
      }
    } catch (error) {
      console.error('Error handling prompt action:', error)
    }
  }

  // Helper functions for subscription management
  const getPlanLevel = (plan: string) => {
    const levels: Record<string, number> = { free: 0, starter: 1, growth: 2, professional: 3, enterprise: 4 }
    return levels[plan] || 0
  }

  // FIXED: Immediate upgrades, end-of-cycle downgrades with proper types
  const handleUpgrade = async (priceId: string, planType: string) => {
    if (!user?.id) {
      alert('Please log in to upgrade your subscription.')
      return
    }

    try {
      setIsLoading(true)
      
      if (!subscription?.stripeSubscriptionId) {
        alert('No active subscription found. Please contact support.')
        return
      }

      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade_immediate',
          userId: user.id,
          newPriceId: priceId,
          newPlanType: planType,
          subscriptionId: subscription.stripeSubscriptionId
        })
      })
  
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (data.success) {
        alert(data.message || 'Upgrade successful!')
        // Reload subscription data
        await loadSubscription()
        // Refresh the entire dashboard
        window.location.reload()
      } else {
        alert(data.error || 'Upgrade failed')
      }
    } catch (error: any) {
      console.error('Upgrade error:', error)
      alert('Upgrade failed: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDowngrade = async (priceId: string, planType: string) => {
    if (!user?.id) {
      alert('Please log in to manage your subscription.')
      return
    }

    try {
      const confirmed = confirm(`You'll keep your current features until your next billing date, then switch to ${planType}. Continue?`)
      if (!confirmed) return

      if (!subscription?.stripeSubscriptionId) {
        alert('No active subscription found. Please contact support.')
        return
      }
  
      setIsLoading(true)
      
      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'downgrade_end_cycle',
          userId: user.id,
          newPriceId: priceId,
          newPlanType: planType,
          subscriptionId: subscription.stripeSubscriptionId
        })
      })
  
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (data.success) {
        alert(data.message || 'Downgrade scheduled successfully!')
        await loadSubscription()
      } else {
        alert(data.error || 'Downgrade failed')
      }
    } catch (error: any) {
      console.error('Downgrade error:', error)
      alert('Downgrade failed: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const renderSubscriptionButton = (plan: string, priceId: string) => {
    // Use the actual subscription state instead of subscriptionCheck for more accurate data
    const currentPlan = subscription.tier || 'free'
    const hasActiveSubscription = subscription.tier !== 'free' && subscription.stripeSubscriptionId
    const isCurrentPlan = currentPlan === plan
    const currentLevel = getPlanLevel(currentPlan)
    const planLevel = getPlanLevel(plan)
    const isUpgrade = hasActiveSubscription && planLevel > currentLevel
    const isDowngrade = hasActiveSubscription && planLevel < currentLevel
    
    console.log(`🔍 Button for ${plan}: current=${currentPlan}, isCurrentPlan=${isCurrentPlan}, hasActive=${hasActiveSubscription}`)

    if (isCurrentPlan) {
      return (
        <button disabled className="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-medium cursor-not-allowed">
          Current Plan
        </button>
      )
    }

    if (hasActiveSubscription) {
      if (isUpgrade) {
        return (
          <button 
            onClick={() => handleUpgrade(priceId, plan)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Upgrade'}
          </button>
        )
      } else if (isDowngrade) {
        return (
          <button 
            onClick={() => handleDowngrade(priceId, plan)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Downgrade'}
          </button>
        )
      }
    } else {
      return (
        <button 
          onClick={() => handleSubscriptionPurchase(plan)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Choose Plan'}
        </button>
      )
    }

    return null
  }

  const handleSubscriptionPurchase = async (planType: string) => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      
      // Use actual subscription state instead of subscriptionCheck
      const hasActiveSubscription = subscription.tier !== 'free' && subscription.stripeSubscriptionId
      
      if (hasActiveSubscription) {
        alert(`You already have an active ${subscription.tier} subscription. Please use the upgrade/downgrade options instead.`)
        return
      }
      
      // Use empty priceId to trigger dynamic pricing in the API
      // This avoids dependency on environment variables
      const priceId = ''

      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          planType: planType,
          userId: user.id
        }),
      })
      
      const data = await response.json()
      
      console.log('Subscription response:', data) // Debug log
      
      if (!response.ok) {
        if (data.shouldUpgrade || data.redirectToBilling) {
          // User has an active subscription, redirect to billing portal
          alert(data.message + ' Redirecting to billing portal...')
          
          // Open billing portal
          try {
            const portalResponse = await fetch('/api/stripe/manage-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: 'get_billing_portal',
                userId: user.id
              })
            })
            
            const portalData = await portalResponse.json()
            if (portalData.url) {
              window.location.href = portalData.url
            } else {
              // Fallback: just switch to billing tab
              setActiveTab('billing')
            }
          } catch (error) {
            console.error('Error opening billing portal:', error)
            setActiveTab('billing')
          }
          return
        }
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      
      if (data.sessionId) {
        console.log('Redirecting to Stripe checkout:', data.sessionId)
        try {
          const { getStripe } = await import('@/lib/stripe')
          const stripe = await getStripe()
          
          if (!stripe) {
            throw new Error('Stripe failed to load')
          }
          
          const result = await stripe.redirectToCheckout({ sessionId: data.sessionId })
          
          if (result.error) {
            console.error('Stripe redirect error:', result.error)
            alert('Stripe redirect failed: ' + result.error.message)
          }
        } catch (stripeError) {
          console.error('Stripe loading/redirect error:', stripeError)
          // Fallback: redirect directly to the URL
          if (data.url) {
            console.log('Falling back to direct URL redirect:', data.url)
            window.location.href = data.url
          } else {
            alert('Could not load Stripe. Please try again or contact support.')
          }
        }
      } else if (data.url) {
        console.log('Redirecting to URL:', data.url)
        window.location.href = data.url
      } else {
        console.error('No session ID or URL in response:', data)
        alert('Error: No checkout URL received')
      }
    } catch (error: any) {
      console.error('Error purchasing subscription:', error)
      alert('Error starting checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSingleJobPurchase = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/stripe/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobData: { title: 'Single Job Posting' }
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
      console.error('Error purchasing single job:', error)
      alert('Error starting checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddonPurchase = async (addonType: string) => {
    try {
      setIsLoading(true)
      
      // Use empty priceId to trigger dynamic pricing in the API
      // This avoids dependency on environment variables
      const priceId = ''
      
      const response = await fetch('/api/stripe/purchase-addon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addonType: addonType,
          priceId: priceId
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
      console.error('Error purchasing addon:', error)
      alert('Error starting checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJobFeaturePurchase = async (jobId: number, featureType: string) => {
    console.log('🎯 CLIENT: Feature purchase clicked!', { jobId, featureType, userId: user?.id })
    
    if (!user?.id) {
      console.log('❌ CLIENT: No user ID, aborting')
        return
      }
    
    try {
      setIsLoading(true)
      console.log('🎯 CLIENT: Calling API /api/purchase-job-feature')
      
      const response = await fetch('/api/purchase-job-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          featureType: featureType,
          userId: user.id
        }),
      })
      
      console.log('📡 CLIENT: API response status:', response.status)
      const data = await response.json()
      console.log('📡 CLIENT: API response data:', data)
      
      if (data.sessionId) {
        console.log('✅ CLIENT: Got session ID, redirecting to Stripe')
        const { getStripe } = await import('@/lib/stripe')
        const stripe = await getStripe()
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        console.log('❌ CLIENT: No session ID in response')
        alert('Error creating checkout session: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ CLIENT: Error purchasing job feature:', error)
      alert('Error starting checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const openFeaturePurchase = (job: any, type: string) => {
    setSelectedJobForFeature(job)
    setFeatureType(type)
    setShowFeatureModal(true)
  }

  const loadUserCredits = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/subscription-status?userId=${user.id}`)
      const data = await response.json()
      if (data.success) {
        setUserCredits(data.credits || 0)
      }
    } catch (error) {
      console.error('Error loading credits:', error)
    }
  }

  // FIXED: Enhanced subscription loading with better error handling
  const loadSubscription = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID, skipping subscription load')
        return
      }
      
      console.log('🔄 Loading subscription for user:', user.id)
      
      const response = await fetch(`/api/subscription-status?userId=${user.id}`)
      const data = await response.json()
      
      console.log('📊 Subscription API response:', data)
      
      if (data.success) {
        // Handle both subscription and single job purchase responses
        const subscriptionData = data.subscription ? {
          tier: data.subscription.plan_type || 'free',
          credits: data.subscription.credits || 0,
          activeJobs: jobs.length || 0, // Use actual job count, not limit
          activeJobsLimit: data.active_jobs_limit || data.subscription?.active_jobs_limit || 0, // Use top-level (includes single jobs)
          status: data.subscription.status,
          currentPeriodEnd: data.subscription.current_period_end,
          stripeSubscriptionId: data.subscription.stripe_subscription_id || null
        } : {
          // Handle free tier with optional single job purchases
          tier: 'free', // Always show 'free' for non-subscription users
          credits: data.credits || 0,
          activeJobs: jobs.length || 0, // Use actual job count, not limit
          activeJobsLimit: data.active_jobs_limit || 0, // Store limit separately (includes single job purchases)
          status: data.status || 'active',
          currentPeriodEnd: null,
          stripeSubscriptionId: null
        }
        
        console.log('✅ Setting subscription state:', subscriptionData.tier)
        setSubscription(subscriptionData)
        console.log('✅ Subscription state set:', subscriptionData)
      } else {
        console.log('ℹ️ No active subscription found, setting free tier')
        setSubscription({ tier: 'free', credits: 0, activeJobs: 0, activeJobsLimit: 0, stripeSubscriptionId: null })
      }
    } catch (error) {
      console.error('❌ Error loading subscription:', error)
      setSubscription({ tier: 'free', credits: 0, activeJobs: 0, stripeSubscriptionId: null })
    }
  }

  const searchResumes = async () => {
    try {
      setSearchLoading(true)
      
      const queryParams = new URLSearchParams()
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })
      
      const response = await fetch(`/api/resume-search?${queryParams}`)
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.profiles)
      } else {
        alert('Error searching resumes: ' + data.error)
      }
    } catch (error) {
      console.error('Error searching resumes:', error)
      alert('Error searching resumes')
    } finally {
      setSearchLoading(false)
    }
  }

  const unlockProfile = async (profileId: number) => {
    if (!user?.id) return
    
    if (userCredits < 1) {
      alert('Insufficient credits. Please purchase resume credits to view contact details.')
      return
    }
    
    if (unlockedProfiles.has(profileId)) {
      return
    }
    
    try {
      const response = await fetch('/api/unlock-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, userId: user.id })
      })
      
      const data = await response.json()
      if (data.success) {
        setUnlockedProfiles(prev => new Set([...prev, profileId]))
        setUserCredits(prev => prev - 1)
        alert('✅ Contact details unlocked! 1 credit used.')
      } else {
        alert('Error unlocking profile: ' + data.error)
      }
    } catch (error) {
      console.error('Error unlocking profile:', error)
      alert('Error unlocking profile')
    }
  }

  const filteredApplications = applications.filter((app: any) => {
    const matchesJob = !selectedJobFilter || app.job_id === parseInt(selectedJobFilter) || app.job_id === selectedJobFilter
    const matchesStatus = !statusFilter || app.status === statusFilter
    return matchesJob && matchesStatus
  })

  // Debug logging (moved outside filter function)
  if (applications.length > 0 && filteredApplications.length === 0) {
    console.log('🔍 Filter Debug:', {
      selectedJobFilter,
      statusFilter,
      totalApplications: applications.length,
      filteredCount: filteredApplications.length,
      sampleApp: applications[0] ? {
        id: applications[0].id,
        job_id: applications[0].job_id,
        status: applications[0].status
      } : null
    })
  }

  // useEffect hooks
  useEffect(() => {
    if (user?.id) {
      checkFreeJobEligibility()
      checkUpgradePrompts()

      const interval = setInterval(checkUpgradePrompts, 60000)
      return () => clearInterval(interval)
    }
  }, [user?.id])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const showFreeJob = urlParams.get('free_job')
    
    if (showFreeJob === 'true' && freeJobEligible) {
      setShowFreeJobForm(true)
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [freeJobEligible])

  // FIXED: Main useEffect with better error handling and loading state management
  useEffect(() => {
    console.log('🔄 Dashboard useEffect - user:', !!user, 'loading:', loading)
    
    if (loading) {
      console.log('🔄 Auth still loading, waiting...')
      return
    }
    
    if (!user) {
      console.log('❌ No user found, redirecting to login')
      router.push('/auth/login')
      return
    }
    
    console.log('✅ User found, loading dashboard data')
    loadEmployerData()
  }, [user, loading, router])

  // FIXED: Separate subscription check effect with better state management
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user?.id) {
        console.log('No user ID for subscription check')
        return
      }
      
      try {
        console.log('🔄 Checking subscription status...')
        const response = await fetch(`/api/check-subscription-status?userId=${user.id}`)
        const data = await response.json()
        
        console.log('📊 Subscription check response:', data)
        
        setSubscriptionCheck({
          loading: false,
          hasActiveSubscription: data.hasActiveSubscription,
          currentPlan: data.currentPlan || 'free',
          canPurchaseNew: data.canPurchaseNew
        })

        if (data.subscription) {
          console.log('✅ Updating subscription from check:', data.subscription.plan_type)
          setSubscription({
            tier: data.subscription.plan_type || 'free',
            credits: data.subscription.credits || 0,
            activeJobs: jobs.length || 0, // Use actual job count, not limit
            activeJobsLimit: data.subscription?.active_jobs_limit || data.active_jobs_limit || 0, // Store limit separately
            status: data.subscription.status,
            currentPeriodEnd: data.subscription.current_period_end,
            stripeSubscriptionId: data.subscription.stripe_subscription_id || null
          })
        }
      } catch (error) {
        console.error('❌ Error checking subscription:', error)
        setSubscriptionCheck(prev => ({ ...prev, loading: false }))
      }
    }

    if (user?.id) {
      checkSubscriptionStatus()
    }
  }, [user?.id])

  // Handle URL parameters for tab routing
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['overview', 'jobs', 'applications', 'resume-search', 'analytics', 'billing'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Subscription update handler for SubscriptionManagement component
  const handleSubscriptionUpdate = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/subscription-status?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success && data.subscription) {
        setSubscription({
          tier: data.subscription.plan_type || 'free',
          credits: data.credits || 0,
          activeJobs: jobs.length || 0, // Use actual job count, not limit
          activeJobsLimit: data.subscription?.active_jobs_limit || data.active_jobs_limit || 0, // Store limit separately
          status: data.subscription.status,
          currentPeriodEnd: data.subscription.current_period_end,
          stripeSubscriptionId: data.subscription.stripe_subscription_id || null
        })
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
    }
  }

  useEffect(() => {
    if (!autoRefresh || !user) return
    
    const interval = setInterval(() => {
      loadApplications()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [user, autoRefresh])

  // FIXED: Enhanced data loading with better error handling
  const loadEmployerData = async () => {
    try {
      console.log('🔄 Loading employer data...')
      setIsLoading(true)
      
      // Load all data with individual error handling
      const dataPromises = [
        loadJobs().catch(err => console.error('Error loading jobs:', err)),
        loadApplications().catch(err => console.error('Error loading applications:', err)),
        loadAnalytics().catch(err => console.error('Error loading analytics:', err)),
        loadProfile().catch(err => console.error('Error loading profile:', err)),
        loadUserCredits().catch(err => console.error('Error loading credits:', err)),
        loadSubscription().catch(err => console.error('Error loading subscription:', err))
      ]
      
      // Wait for all promises to complete, even if some fail
      await Promise.allSettled(dataPromises)
      
      console.log('✅ Employer data loading completed')
    } catch (error) {
      console.error('❌ Critical error loading employer data:', error)
    } finally {
      console.log('🔄 Setting isLoading to false')
      setIsLoading(false)
    }
  }

  const loadJobs = async () => {
    if (!user) return
    
    try {
      console.log('📊 Loading jobs for employer:', user.id)
      
      const response = await fetch(`/api/jobs?userId=${user.id}`)
      const data = await response.json()
      
      if (data.jobs) {  
        setJobs(data.jobs)
        console.log(`✅ Loaded ${data.jobs.length} jobs`)
      } else {
        console.error('❌ Failed to load jobs:', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading jobs:', error)
    }
  }

  const loadApplications = async () => {
    if (!user) return
    
    try {
      console.log('📊 Loading applications for employer:', user.id)
      
      const response = await fetch(`/api/applications?employerId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        setApplications(data.applications)
        console.log(`✅ Loaded ${data.applications.length} applications`)
        
        // Debug: Log application statuses and current filters
        console.log('📊 Application statuses:', data.applications.map((app: any) => ({
          id: app.id,
          status: app.status,
          name: `${app.first_name} ${app.last_name}`
        })))
        console.log('🔍 Current filters:', { selectedJobFilter, statusFilter })
        
        // Force reset filters to show all applications by default
        console.log('🔄 Current statusFilter:', statusFilter)
        if (statusFilter !== '') {
          console.log('🔄 Resetting statusFilter from', statusFilter, 'to empty (show all)')
          setStatusFilter('')
        }
        if (selectedJobFilter !== '') {
          console.log('🔄 Resetting selectedJobFilter from', selectedJobFilter, 'to empty (show all)')
          setSelectedJobFilter('')
        }
      } else {
        console.error('❌ Failed to load applications:', data.error)
      }
    } catch (error) {
      console.error('❌ Error loading applications:', error)
    }
  }

  const loadAnalytics = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/job-analytics?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        console.log('🔍 Raw analytics data:', data.analytics)
        setAnalytics(data.analytics)
        console.log('✅ Loaded analytics data')
      } else {
        console.log('❌ Analytics API returned:', data)
      }  
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  } 

  const loadProfile = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/profile?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setProfile({
            companyName: data.profile.company_name || '',
            contactEmail: data.profile.email || user.email,
            contactPhone: data.profile.phone || '',
            location: data.profile.location || '',
            website: data.profile.website || '',
            description: data.profile.description || ''
          })
        } else {
          setProfile({
            companyName: '',
            contactEmail: user.email,
            contactPhone: '',
            location: '',
            website: '',
            description: ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const getNewApplicationsCount = () => {
    return applications.filter((app: any) => app.status === 'submitted').length
  }

  const submitJob = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return
    
    // Check if user has credits, active subscription, or single job purchases
    if (subscription.tier === 'free' && subscription.credits === 0 && subscription.activeJobsLimit === 0) {
      // Redirect to billing page
      setActiveTab('billing')
      setShowJobForm(false)
      alert('You need to purchase a subscription or single job posting to post jobs. Redirecting to billing...')
      return
    }
    
    try {
      const method = editingJob ? 'PUT' : 'POST'
      const url = editingJob ? '/api/jobs/edit' : '/api/jobs'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingJob ? {
          jobId: editingJob.id,
          jobData: jobForm,
          userId: user.id
        } : {
          ...jobForm,
          userId: user.id
        }),
      })
      
      if (response.ok) {
        await loadJobs()
        setShowJobForm(false)
        setEditingJob(null)
        setJobForm({
          title: '',
          company: '',
          description: '',
          requirements: '',
          region: '',
          hourlyRate: '',
          duration: '',
          startDate: '',
          industry: '',
          classification: '',
          benefits: '',
          contactEmail: '',
          contactPhone: ''
        })
        alert(editingJob ? 'Job updated successfully!' : 'Job posted successfully!')
      } else {
        const error = await response.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error submitting job:', error)
      alert('Error submitting job')
    }
  }

  const updateApplicationStatus = async (applicationId: number, newStatus: string) => {
    if (!user?.id) return
    
    console.log('🔄 Updating application status:', { applicationId, newStatus, userId: user.id })
    
    try {
      const response = await fetch('/api/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          status: newStatus,
          userId: user.id
        }),
      })
      
      console.log('📡 Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Update successful:', result)
        
        // Send status update email
        try {
          await fetch('/api/send-status-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              applicationId,
              newStatus 
            })
          })
          console.log('📧 Status update email sent')
        } catch (emailError) {
          console.error('📧 Status update email failed:', emailError)
        }
        
        await loadApplications()
        alert('Application status updated successfully!')
      } else {
        const error = await response.json()
        console.error('❌ Update failed:', error)
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('❌ Network error updating application:', error)
      alert('Error updating application status')
    }
  }

  const editJob = (job: any) => {
    setEditingJob(job)
    setJobForm({
      title: job.title || '',
      company: job.company || '',
      description: job.description || '',
      requirements: job.requirements || '',
      region: job.region || '',
      hourlyRate: job.hourly_rate || '',
      duration: job.duration || '',
      startDate: job.start_date || '',
      industry: job.industry || '',
      classification: job.classification || '',
      benefits: job.benefits || '',
      contactEmail: job.contact_email || '',
      contactPhone: job.contact_phone || ''
    })
    setShowJobForm(true)
  }

  const deleteJob = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Force refresh the job list and update state immediately
        await loadJobs()
        // Also remove from local state immediately for instant UI update
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId))
        alert('Job deleted successfully!')
      } else {
        const error = await response.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Error deleting job')
    }
  }

  const openApplicationModal = (application: any) => {
    setSelectedApplication(application)
    setShowApplicationModal(true)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const isFeatureExpired = (expirationDate: string) => {
    if (!expirationDate) return false
    return new Date(expirationDate) < new Date()
  }

  // FIXED: Only show loading if auth is loading AND no user yet, OR if dashboard is loading but we have a user
  const shouldShowLoading = (loading && !user) || (user && isLoading)
  
  console.log('🔄 Loading check - auth loading:', loading, 'user exists:', !!user, 'dashboard loading:', isLoading, 'should show loading:', shouldShowLoading)
  
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <div>Loading your dashboard...</div>
          <div className="text-sm text-gray-500 mt-2">
            {loading && !user ? 'Authenticating...' : 'Loading dashboard data...'}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Auth: {loading ? 'loading' : 'done'} | User: {user ? 'found' : 'none'} | Dashboard: {isLoading ? 'loading' : 'done'}
          </div>
        </div>
      </div>
    )
  }

  // Debug log
  if (typeof window !== 'undefined') {
    console.log('✅ Rendering dashboard - subscription tier:', subscription.tier)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employer Dashboard</h1>
              <p className="text-gray-600">Welcome back! Manage your job postings and applications.</p>
              {/* Debug info */}
              <p className="text-xs text-blue-600 mt-1">
                Current Plan: {subscription.tier} | Credits: {subscription.credits} | Jobs Limit: {subscription.activeJobsLimit}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                📧 Contact: <a href="mailto:Employers@field-jobs.co" className="text-blue-600 hover:text-blue-800 underline">Employers@field-jobs.co</a>
              </p>
            </div>
            <div className="flex gap-3">
              {freeJobEligible && !checkingEligibility ? (
                <>
                  <button
                    onClick={() => setShowFreeJobForm(true)}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg"
                  >
                    🎁 First Job Free
                  </button>
                  <button
                    onClick={() => {
                      // Check if user has credits, active subscription, or single job purchases
                      if (subscription.tier === 'free' && subscription.credits === 0 && subscription.activeJobsLimit === 0) {
                        // Redirect to billing page
                        setActiveTab('billing')
                        alert('You need to purchase a subscription or single job posting to post jobs. Redirecting to billing...')
                        return
                      }
                      setShowJobForm(true)
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Post Job
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    // Check if user has credits or active subscription
                    if (subscription.tier === 'free' && subscription.credits === 0) {
                      // Redirect to billing page
                      setActiveTab('billing')
                      alert('You need to purchase a subscription or single job posting to post jobs. Redirecting to billing...')
                      return
                    }
                    setShowJobForm(true)
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Post New Job
                </button>
              )}
              <Link href="/" className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium">
                View Site
              </Link>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-500">{jobs.length}</div>
              <div className="text-sm text-gray-600">Active Jobs</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-indigo-500">
                {subscription.tier === 'enterprise' 
                  ? '∞'
                  : `${Math.max(0, (subscription.activeJobsLimit || 0) - jobs.length)}`
                }
              </div>
              <div className="text-sm text-gray-600">Jobs Left</div>
              {subscription.tier !== 'enterprise' && subscription.activeJobsLimit === 0 && (
                <div className="text-xs text-gray-500 mt-1">Upgrade for more</div>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-500">{applications.length}</div>
              <div className="text-sm text-gray-600">Total Applications</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-500">
                {subscription.tier === 'enterprise' ? '∞' : userCredits}
            </div>
              <div className="text-sm text-gray-600">Resume Credits</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'jobs', label: 'Job Postings', icon: '💼' },
              { id: 'applications', label: 'Applications', icon: '📧', badge: applications.length },
              { id: 'resume-search', label: 'Resume Search', icon: '🔍' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
              { id: 'billing', label: 'Products & Billing', icon: '🛒' },
              { id: 'profile', label: 'Profile', icon: '👤' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - I'll include all the existing tab content here unchanged */}
        <div className="bg-white rounded-lg p-6 shadow">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Dashboard Overview</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recent Job Postings</h3>
                  {jobs.slice(0, 3).map((job: any) => (
                    <div key={job.id} className="border border-gray-200 p-4 mb-2 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">{job.title}</div>
                          <div className="text-gray-600 text-sm">{job.company} • {job.region}</div>
                          <div className="text-gray-500 text-xs">Posted: {new Date(job.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-1">
                          {job.is_free_job && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">🎁 FREE</span>
                          )}
                          {(job.is_featured || job.isFeatured) && !isFeatureExpired(job.featured_until || job.featuredUntil) && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">⭐ Featured</span>
                          )}
                          {(job.is_urgent || job.isUrgent) && !isFeatureExpired(job.urgent_until || job.urgentUntil) && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">🚨 Urgent</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-gray-500 italic">No jobs posted yet. <button onClick={() => setShowJobForm(true)} className="text-orange-500">Post your first job</button>!</p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recent Applications</h3>
                  {applications.slice(0, 3).map((app: any) => (
                    <div key={app.id} className="border border-gray-200 p-4 mb-2 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">{app.first_name} {app.last_name}</div>
                          <div className="text-gray-600 text-sm">{app.jobs?.title}</div>
                          <div className="text-gray-500 text-xs">Applied: {new Date(app.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          app.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                          app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                          app.status === 'interviewed' ? 'bg-purple-100 text-purple-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {app.status || 'submitted'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <p className="text-gray-500 italic">No applications yet. Applications will appear here when candidates apply to your jobs.</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {freeJobEligible && !checkingEligibility && (
                    <button
                      onClick={() => setShowFreeJobForm(true)}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      🎁 Post Free Job
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // Check if user has credits, active subscription, or single job purchases
                      if (subscription.tier === 'free' && subscription.credits === 0 && subscription.activeJobsLimit === 0) {
                        // Redirect to billing page
                        setActiveTab('billing')
                        alert('You need to purchase a subscription or single job posting to post jobs. Redirecting to billing...')
                        return
                      }
                      setShowJobForm(true)
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                  >
                    Post New Job
                  </button>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    Review Applications
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                  >
                    View Analytics
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Job Postings ({jobs.length})</h2>
                <button
                  onClick={() => {
                    // Check if user has credits or active subscription
                    if (subscription.tier === 'free' && subscription.credits === 0) {
                      // Redirect to billing page
                      setActiveTab('billing')
                      alert('You need to purchase a subscription or single job posting to post jobs. Redirecting to billing...')
                      return
                    }
                    setShowJobForm(true)
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                >
                  Post New Job
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💼</div>
                  <h3 className="text-lg font-semibold mb-2">No jobs posted yet</h3>
                  <p className="text-gray-600 mb-4">Start by posting your first job to attract candidates</p>
                  <button
                    onClick={() => setShowJobForm(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
                  >
                    Post Your First Job
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job: any) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{job.title}</h3>
                            <div className="flex gap-1">
                              {job.is_free_job && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">🎁 FREE</span>
                              )}
                              {(job.is_featured || job.isFeatured) && !isFeatureExpired(job.featured_until || job.featuredUntil) && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">⭐ Featured</span>
                              )}
                              {(job.is_urgent || job.isUrgent) && !isFeatureExpired(job.urgent_until || job.urgentUntil) && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">🚨 Urgent</span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-600 mb-1">{job.company} • {job.region}</p>
                          <p className="text-gray-500 text-sm">Posted: {formatDate(job.created_at)}</p>
                          <p className="text-gray-700 mt-2 line-clamp-2">{job.description}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => editJob(job)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteJob(job.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <div className="flex gap-2">
                          {(job.is_featured || job.isFeatured) && !isFeatureExpired(job.featured_until || job.featuredUntil) ? (
                            <span className="text-yellow-600 text-sm flex items-center gap-1 opacity-60">
                              ⭐ Featured Active
                            </span>
                          ) : (
                          <button
                            onClick={() => openFeaturePurchase(job, 'featured')}
                            className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center gap-1"
                          >
                            ⭐ Feature Job
                          </button>
                          )}
                          {(job.is_urgent || job.isUrgent) && !isFeatureExpired(job.urgent_until || job.urgentUntil) ? (
                            <span className="text-red-600 text-sm flex items-center gap-1 opacity-60">
                              🚨 Urgent Active
                            </span>
                          ) : (
                          <button
                            onClick={() => openFeaturePurchase(job, 'urgent')}
                            className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                          >
                            🚨 Mark Urgent
                          </button>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {applications.filter((app: any) => app.job_id === job.id).length} applications
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Applications ({applications.length})</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`px-3 py-1 rounded text-sm ${autoRefresh ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Filter by Job</label>
                    <select
                      value={selectedJobFilter}
                      onChange={(e) => setSelectedJobFilter(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">All Jobs</option>
                      {jobs.map((job: any) => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.company}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Filter by Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">All Statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interviewed">Interviewed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                
                {/* Filter Status and Clear Button */}
                {(selectedJobFilter || statusFilter) && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {filteredApplications.length} of {applications.length} applications
                    </div>
                    <button
                      onClick={() => {
                        setSelectedJobFilter('')
                        setStatusFilter('')
                        console.log('🔄 Filters reset to show all applications')
                      }}
                      className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📧</div>
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-gray-600">Applications will appear here when candidates apply to your jobs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplications.map((app: any) => (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{app.first_name} {app.last_name}</h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              app.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                              app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                              app.status === 'interviewed' ? 'bg-purple-100 text-purple-800' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {app.status || 'new'}
                            </div>
                          </div>
                          <p className="text-gray-600 mb-1">Applied for: {app.jobs?.title}</p>
                          <p className="text-gray-500 text-sm">
                            Email: {app.email} • Phone: {app.phone}
                          </p>
                          <p className="text-gray-500 text-sm">Applied: {formatDate(app.applied_at)}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => openApplicationModal(app)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            View Details
                          </button>
                          {app.resume_url && (
                          <button
                            onClick={() => {
                              // Open resume in new browser window
                              window.open(app.resume_url, '_blank', 'noopener,noreferrer')
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm inline-block text-center"
                          >
                            📄 View Resume
                          </button>
                          )}
                          <select
                            value={app.status || 'submitted'}
                            onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="submitted">Submitted</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="interviewed">Interviewed</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resume Search Tab */}
          {activeTab === 'resume-search' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Resume Search</h2>
                <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  Credits: {userCredits} • Each contact unlock uses 1 credit
                  </div>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-medium"
                  >
                    Buy Credits
                  </button>
                </div>
              </div>

              {/* Resume Credits Purchase Section */}
              {userCredits < 5 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">💳</div>
                    <div>
                      <h3 className="text-lg font-semibold text-orange-800">Need More Resume Credits?</h3>
                      <p className="text-orange-700">Purchase resume credits to unlock candidate contact information</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-orange-200 rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-orange-600 mb-1">10 Credits</div>
                      <div className="text-2xl font-bold mb-2">$39</div>
                      <div className="text-sm text-gray-600 mb-3">$3.90 per credit</div>
                      <button
                        onClick={() => handleAddonPurchase('resume_credits_10')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        Purchase
                      </button>
                    </div>
                    
                    <div className="bg-white border border-orange-200 rounded-lg p-4 text-center relative">
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Most Popular
                      </div>
                      <div className="text-lg font-bold text-orange-600 mb-1">25 Credits</div>
                      <div className="text-2xl font-bold mb-2">$79</div>
                      <div className="text-sm text-gray-600 mb-3">$3.16 per credit</div>
                      <button
                        onClick={() => handleAddonPurchase('resume_credits_25')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        Purchase
                      </button>
                    </div>
                    
                    <div className="bg-white border border-orange-200 rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-orange-600 mb-1">50 Credits</div>
                      <div className="text-2xl font-bold mb-2">$129</div>
                      <div className="text-sm text-gray-600 mb-3">$2.58 per credit</div>
                      <button
                        onClick={() => handleAddonPurchase('resume_credits_50')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        Purchase
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">Search Filters</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Keywords</label>
                    <input
                      type="text"
                      value={searchFilters.keywords}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, keywords: e.target.value }))}
                      placeholder="Skills, job titles, etc."
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      type="text"
                      value={searchFilters.location}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="City, state, remote"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Classification</label>
                    <select
                      value={searchFilters.classification}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, classification: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Any Classification</option>
                      <option value="Staff">Staff</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={searchResumes}
                    disabled={searchLoading}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                  >
                    {searchLoading ? 'Searching...' : 'Search Resumes'}
                  </button>
                  <button
                    onClick={() => setSearchFilters({
                      keywords: '', location: '', classification: '', specialization: '',
                      minExperience: '', maxExperience: '', industries: '', clearance: '',
                      availableBy: '', minRate: '', maxRate: ''
                    })}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <div>
                {searchResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold mb-2">No search results</h3>
                    <p className="text-gray-600">Use the filters above to search for candidates</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-3">Search Results ({searchResults.length})</h3>
                    {searchResults.map((profile: any) => (
                      <div key={profile.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">
                              {unlockedProfiles.has(profile.id) ? 
                                `${profile.first_name} ${profile.last_name}` : 
                                `${profile.first_name} ${profile.last_name?.[0]}***`
                              }
                            </h3>
                            <p className="text-gray-600 mb-2">{profile.title || 'Professional'}</p>
                            <p className="text-gray-700 mb-2">{profile.summary}</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {profile.skills?.split(',').slice(0, 5).map((skill: string, index: number) => (
                                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                            {unlockedProfiles.has(profile.id) && (
                              <div className="text-sm text-gray-600">
                                <p>Email: {profile.email}</p>
                                <p>Phone: {profile.phone}</p>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            {!unlockedProfiles.has(profile.id) ? (
                              <button
                                onClick={() => unlockProfile(profile.id)}
                                disabled={userCredits < 1}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Unlock Contact (1 credit)
                              </button>
                            ) : (
                              <div className="text-green-600 font-medium">Contact Unlocked</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Analytics & Insights</h2>
              
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalViews || 0}</div>
                  <div className="text-sm text-gray-600">Total Job Views</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{applications.length}</div>
                  <div className="text-sm text-gray-600">Total Applications</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {applications.length > 0 && analytics.totalViews > 0
                      ? Math.round((applications.length / analytics.totalViews) * 100)
                      : applications.length > 0 ? 'N/A' : 0
                    }%
                  </div>
                  <div className="text-sm text-gray-600">Application Rate</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{jobs.length}</div>
                  <div className="text-sm text-gray-600">Active Jobs</div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Job Performance</h3>
                {jobs.length === 0 ? (
                  <p className="text-gray-500 italic">No job data available</p>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job: any) => {
                      const jobApplications = applications.filter((app: any) => app.job_id === job.id)
                      return (
                        <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold">{job.title}</h4>
                              <p className="text-gray-600 text-sm">{job.company}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold">{jobApplications.length}</div>
                              <div className="text-sm text-gray-600">Applications</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {applications.slice(0, 5).map((app: any) => (
                    <div key={app.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <span className="font-medium">{app.first_name} {app.last_name}</span>
                        <span className="text-gray-600"> applied to </span>
                        <span className="font-medium">{app.jobs?.title}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(app.applied_at)}
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <p className="text-gray-500 italic">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-8">
              {/* Subscription Management Section */}
              <SubscriptionManagement 
                user={user}
                subscription={{
                  plan_type: subscription.tier,
                  credits: subscription.credits,
                  active_jobs_limit: subscription.activeJobsLimit,
                  status: subscription.status,
                  current_period_end: subscription.currentPeriodEnd,
                  stripe_subscription_id: subscription.stripeSubscriptionId,
                  price: subscription.price || 0
                }}
                onSubscriptionUpdate={handleSubscriptionUpdate}
              />

              {/* Subscription Plans Section */}
                  <div>
                <h2 className="text-xl font-bold mb-6">Plans & Pricing</h2>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold">Single Job Post</h3>
                    <div className="text-3xl font-bold text-orange-500 my-2">$199</div>
                    <div className="text-gray-600 text-sm">one-time payment</div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li>✅ 1 job posting</li>
                    <li>✅ 60-day duration</li>
                    <li>✅ Full applicant access</li>
                    <li>✅ Email support</li>
                  </ul>
                  <button 
                    onClick={handleSingleJobPurchase}
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Purchase Now'}
                  </button>
                </div>

                <div className="border border-purple-300 rounded-lg p-6 bg-purple-50 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      BEST VALUE
                    </span>
                  </div>
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold">Enterprise</h3>
                    <div className="text-3xl font-bold text-purple-600 my-2">$167</div>
                    <div className="text-gray-600 text-xs">per month<br/>billed annually at $1,999</div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li>✅ Unlimited job postings</li>
                    <li>✅ Unlimited resume credits</li>
                    <li>✅ Priority support</li>
                    <li>✅ Advanced analytics</li>
                  </ul>
                  {renderSubscriptionButton('enterprise', process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '')}
                </div>

                <div className="border border-indigo-200 rounded-lg p-6 bg-indigo-50">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold">Unlimited</h3>
                    <div className="text-3xl font-bold text-indigo-600 my-2">$292</div>
                    <div className="text-gray-600 text-xs">per month<br/>billed annually at $3,499</div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li>✅ Everything in Enterprise</li>
                    <li>✅ Dedicated account manager</li>
                    <li>✅ Custom integrations</li>
                    <li>✅ Priority feature requests</li>
                  </ul>
                  {renderSubscriptionButton('unlimited', process.env.NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID || '')}
                </div>
              </div>
              </div>

              {/* Premium Add-Ons Section */}
              <div>
                <h2 className="text-xl font-bold mb-6">Premium Add-Ons</h2>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Resume Credits - 10 Pack</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$39</div>
                    <p className="text-gray-600 text-sm mb-4">10 credits for candidate contact</p>
                    <button
                      onClick={() => handleAddonPurchase('resume_credits_10')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Buy 10 Credits'}
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Resume Credits - 25 Pack</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$79</div>
                    <p className="text-gray-600 text-sm mb-4">25 credits - Best Value</p>
                    <button
                      onClick={() => handleAddonPurchase('resume_credits_25')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Buy 25 Credits'}
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Resume Credits - 50 Pack</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$129</div>
                    <p className="text-gray-600 text-sm mb-4">50 credits for high volume</p>
                    <button
                      onClick={() => handleAddonPurchase('resume_credits_50')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Buy 50 Credits'}
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Featured Listing</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$29</div>
                    <p className="text-gray-600 text-sm mb-4">Top of search results with bright highlight badge</p>
                    <p className="text-xs text-gray-500 mb-3">Apply to individual jobs in the Job Postings tab</p>
                    <button 
                      onClick={() => setActiveTab('jobs')}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded"
                    >
                      ⭐ Manage Featured Jobs
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Urgent Badge</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$19</div>
                    <p className="text-gray-600 text-sm mb-4">Bright "URGENT" badge for immediate attention</p>
                    <p className="text-xs text-gray-500 mb-3">Apply to individual jobs in the Job Postings tab</p>
                    <button 
                      onClick={() => setActiveTab('jobs')}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded"
                    >
                      🚨 Manage Urgent Jobs
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



        </div>

        {/* Job Form Modal */}
        {showJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white text-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingJob ? 'Edit Job' : 'Post New Job'}
                </h2>
                <button
                  onClick={() => {
                    setShowJobForm(false)
                    setEditingJob(null)
                    setJobForm({
                      title: '', company: '', description: '', requirements: '', region: '',
                      hourlyRate: '', duration: '', startDate: '', industry: '', classification: '',
                      benefits: '', contactEmail: '', contactPhone: ''
                    })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={submitJob} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company *</label>
                    <input
                      type="text"
                      value={jobForm.company}
                      onChange={(e) => setJobForm(prev => ({ ...prev, company: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Requirements</label>
                  <textarea
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm(prev => ({ ...prev, requirements: e.target.value }))}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Region *</label>
                    <select
                      value={jobForm.region}
                      onChange={(e) => setJobForm(prev => ({ ...prev, region: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Region</option>
                      <option value="northeast">Northeast US</option>
                      <option value="southeast">Southeast US</option>
                      <option value="midwest">Midwest US</option>
                      <option value="southwest">Southwest US</option>
                      <option value="west">West US</option>
                      <option value="canada">Canada</option>
                      <option value="mexico">Mexico</option>
                      <option value="nationwide">US Nationwide</option>
                      <option value="international">International</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly Rate *</label>
                    <input
                      type="text"
                      value={jobForm.hourlyRate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="$50-75/hr"
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration *</label>
                    <select
                      value={jobForm.duration}
                      onChange={(e) => setJobForm(prev => ({ ...prev, duration: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Duration</option>
                      <option value="0-6 months">0-6 months</option>
                      <option value="6-12 months">6-12 months</option>
                      <option value="12-18 months">12-18 months</option>
                      <option value="18+ months">18+ months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={jobForm.startDate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Industry *</label>
                    <select
                      value={jobForm.industry}
                      onChange={(e) => setJobForm(prev => ({ ...prev, industry: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Industry</option>
                      <option value="nuclear">Nuclear Power</option>
                      <option value="power-generation">Power Gen (Fossil)</option>
                      <option value="ogc">OG&C</option>
                      <option value="offshore">Offshore</option>
                      <option value="renewable">Renewable</option>
                      <option value="construction">Construction</option>
                      <option value="aerospace">Aerospace</option>
                      <option value="defense">Defense</option>
                      <option value="electric-td">Electric T&D</option>
                      <option value="pulp-paper">Pulp & Paper</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="mining">Mining</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Experience Level *</label>
                    <select
                      value={jobForm.classification}
                      onChange={(e) => setJobForm(prev => ({ ...prev, classification: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    >
                <option value="">Select Experience Level</option>
                <option value="0-5">0-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10-15">10-15 years</option>
                <option value="15-20">15-20 years</option>
                <option value="20+">20+ years</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Benefits</label>
                  <textarea
                    value={jobForm.benefits}
                    onChange={(e) => setJobForm(prev => ({ ...prev, benefits: e.target.value }))}
                    rows={2}
                    placeholder="Health insurance, 401k, paid time off, etc."
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJobForm(false)
                      setEditingJob(null)
                      setJobForm({
                        title: '', company: '', description: '', requirements: '', region: '',
                        hourlyRate: '', duration: '', startDate: '', industry: '', classification: '',
                        benefits: '', contactEmail: '', contactPhone: ''
                      })
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                  >
                    {editingJob ? 'Update Job' : 'Post Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Free Job Form Modal */}
        {showFreeJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white text-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-green-600">Post Your First Job Free! 🎁</h2>
                <button
                  onClick={() => setShowFreeJobForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <p className="text-green-800">
                  🎉 Congratulations! You're eligible for one free job posting. This is a limited-time offer for new employers.
                </p>
              </div>
              
              <form onSubmit={submitFreeJob} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company *</label>
                    <input
                      type="text"
                      value={jobForm.company}
                      onChange={(e) => setJobForm(prev => ({ ...prev, company: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Requirements</label>
                  <textarea
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm(prev => ({ ...prev, requirements: e.target.value }))}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Region *</label>
                    <select
                      value={jobForm.region}
                      onChange={(e) => setJobForm(prev => ({ ...prev, region: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Region</option>
                      <option value="northeast">Northeast US</option>
                      <option value="southeast">Southeast US</option>
                      <option value="midwest">Midwest US</option>
                      <option value="southwest">Southwest US</option>
                      <option value="west">West US</option>
                      <option value="canada">Canada</option>
                      <option value="mexico">Mexico</option>
                      <option value="nationwide">US Nationwide</option>
                      <option value="international">International</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly Rate *</label>
                    <input
                      type="text"
                      value={jobForm.hourlyRate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="$50-75/hr"
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration *</label>
                    <select
                      value={jobForm.duration}
                      onChange={(e) => setJobForm(prev => ({ ...prev, duration: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Duration</option>
                      <option value="0-6 months">0-6 months</option>
                      <option value="6-12 months">6-12 months</option>
                      <option value="12-18 months">12-18 months</option>
                      <option value="18+ months">18+ months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={jobForm.startDate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Industry *</label>
                    <select
                      value={jobForm.industry}
                      onChange={(e) => setJobForm(prev => ({ ...prev, industry: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Industry</option>
                      <option value="nuclear">Nuclear Power</option>
                      <option value="power-generation">Power Gen (Fossil)</option>
                      <option value="ogc">OG&C</option>
                      <option value="offshore">Offshore</option>
                      <option value="renewable">Renewable</option>
                      <option value="construction">Construction</option>
                      <option value="aerospace">Aerospace</option>
                      <option value="defense">Defense</option>
                      <option value="electric-td">Electric T&D</option>
                      <option value="pulp-paper">Pulp & Paper</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="mining">Mining</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Experience Level *</label>
                    <select
                      value={jobForm.classification}
                      onChange={(e) => setJobForm(prev => ({ ...prev, classification: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="">Select Experience Level</option>
                      <option value="0-5">0-5 years</option>
                      <option value="5-10">5-10 years</option>
                      <option value="10-15">10-15 years</option>
                      <option value="15-20">15-20 years</option>
                      <option value="20+">20+ years</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Benefits</label>
                  <textarea
                    value={jobForm.benefits}
                    onChange={(e) => setJobForm(prev => ({ ...prev, benefits: e.target.value }))}
                    rows={2}
                    placeholder="Health insurance, 401k, paid time off, etc."
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFreeJobForm(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded hover:from-green-600 hover:to-blue-600 disabled:opacity-50"
                  >
                    {isLoading ? 'Posting...' : 'Post Free Job 🎁'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Application Details Modal */}
        {showApplicationModal && selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Application Details</h2>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <strong>Name:</strong> {selectedApplication.first_name} {selectedApplication.last_name}
                </div>
                <div>
                  <strong>Email:</strong> {selectedApplication.email}
                </div>
                <div>
                  <strong>Phone:</strong> {selectedApplication.phone}
                </div>
                <div>
                  <strong>Applied for:</strong> {selectedApplication.jobs?.title}
                </div>
                <div>
                  <strong>Classification:</strong> {selectedApplication.classification || 'Not specified'}
                </div>
                <div>
                  <strong>Applied on:</strong> {formatDate(selectedApplication.applied_at)}
                </div>
                <div>
                  <strong>Resume:</strong>{' '}
                  {selectedApplication.resume_url ? (
                    <button
                      onClick={() => {
                        // Open resume in new browser window
                        window.open(selectedApplication.resume_url, '_blank', 'noopener,noreferrer')
                      }}
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      📄 {selectedApplication.resume_filename || 'View Resume'}
                    </button>
                  ) : (
                    <span className="text-gray-500 italic">No resume uploaded</span>
                  )}
                </div>
                <div>
                  <strong>Status:</strong> 
                  <select
                    value={selectedApplication.status || 'submitted'}
                    onChange={(e) => {
                      updateApplicationStatus(selectedApplication.id, e.target.value)
                      setSelectedApplication((prev: any) => ({ ...prev, status: e.target.value }))
                    }}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interviewed">Interviewed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Feature Purchase Modal */}
        {showFeatureModal && selectedJobForFeature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {featureType === 'featured' ? 'Feature Job' : 'Mark as Urgent'}
                </h2>
                <button
                  onClick={() => setShowFeatureModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">{selectedJobForFeature.title}</h3>
                <p className="text-gray-600 text-sm">{selectedJobForFeature.company}</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">
                  {featureType === 'featured' ? '⭐ Featured Job Listing' : '🚨 Urgent Job Badge'}
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  {featureType === 'featured' 
                    ? 'Your job will appear at the top of search results and get highlighted styling for 30 days.'
                    : 'Your job will display an "URGENT" badge to attract immediate attention for 14 days.'
                  }
                </p>
                <div className="text-lg font-bold">
                  {featureType === 'featured' ? '$29' : '$19'}
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowFeatureModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleJobFeaturePurchase(selectedJobForFeature.id, featureType)
                    setShowFeatureModal(false)
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Purchase {featureType === 'featured' ? '$29' : '$19'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Prompt Modal */}
        {showUpgradePrompt && currentPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-xl font-bold">Great News!</h2>
              </div>
              
              <div className="mb-4">
                {currentPrompt.prompt_type === 'first_application' && (
                  <p className="text-gray-700">
                    Congratulations! You just received your first application on your free job posting. 
                    Upgrade to a paid plan to unlock more job postings and advanced features.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handlePromptAction('dismiss')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => handlePromptAction('upgrade')}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  View Plans
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function EmployerDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <EmployerDashboardContent />
    </Suspense>
  )
}
