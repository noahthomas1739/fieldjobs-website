'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EmployerDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Data states
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [profile, setProfile] = useState({})
  const [subscription, setSubscription] = useState({ tier: 'free', credits: 0, activeJobs: 0 })
  
  // NEW: Free job feature states
  const [freeJobEligible, setFreeJobEligible] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(true)
  const [showFreeJobForm, setShowFreeJobForm] = useState(false)
  const [pendingPrompts, setPendingPrompts] = useState([])
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(null)
  
  // NEW: Subscription check state for prevention logic
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
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [selectedJobForFeature, setSelectedJobForFeature] = useState(null)
  const [featureType, setFeatureType] = useState('') // 'featured' or 'urgent'
  const [editingJob, setEditingJob] = useState(null)
  
  // Resume search states
  const [searchResults, setSearchResults] = useState([])
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
  const [statusFilter, setStatusFilter] = useState('')

  // Track notification state to prevent duplicates
  const [notificationShown, setNotificationShown] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)

  // NEW: Free job functions
  // Check if user is eligible for free job
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

  // Check for pending upgrade prompts
  const checkUpgradePrompts = async () => {
    try {
      if (!user?.id) return

      const response = await fetch(`/api/free-job/upgrade-prompts?userId=${user.id}`)
      const data = await response.json()

      if (data.success && data.prompts.length > 0) {
        setPendingPrompts(data.prompts)
        // Show the most urgent prompt
        const urgentPrompt = data.prompts[0]
        setCurrentPrompt(urgentPrompt)
        setShowUpgradePrompt(true)
      }
    } catch (error) {
      console.error('Error checking upgrade prompts:', error)
    }
  }

  // Submit free job using existing job form
  const submitFreeJob = async (e) => {
    e.preventDefault()
    
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
        setFreeJobEligible(false) // Button will disappear
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

  // Handle upgrade prompt actions
  const handlePromptAction = async (action) => {
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

  // NEW: Helper functions for subscription management
  const getPlanLevel = (plan) => {
    const levels = { free: 0, starter: 1, growth: 2, professional: 3, enterprise: 4 }
    return levels[plan] || 0
  }

  const handleUpgrade = async (priceId, planType) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/upgrade-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          planType,
          userId: user.id,
          currentPlan: subscriptionCheck.currentPlan
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        window.location.reload()
      } else {
        alert(data.error || 'Upgrade failed')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Upgrade failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDowngrade = async (priceId, planType) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/upgrade-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          planType,
          userId: user.id,
          currentPlan: subscriptionCheck.currentPlan
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        window.location.reload()
      } else {
        alert(data.error || 'Downgrade failed')
      }
    } catch (error) {
      console.error('Downgrade error:', error)
      alert('Downgrade failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // NEW: Helper function to render subscription card buttons
  const renderSubscriptionButton = (plan, priceId) => {
    const isCurrentPlan = subscriptionCheck.currentPlan === plan
    const hasActiveSubscription = subscriptionCheck.hasActiveSubscription
    const currentLevel = getPlanLevel(subscriptionCheck.currentPlan)
    const planLevel = getPlanLevel(plan)
    const isUpgrade = hasActiveSubscription && planLevel > currentLevel
    const isDowngrade = hasActiveSubscription && planLevel < currentLevel

    if (isCurrentPlan) {
      return (
        <button disabled className="w-full bg-gray-300 text-gray-600 py-2 rounded cursor-not-allowed">
          Current Plan
        </button>
      )
    }

    if (hasActiveSubscription) {
      if (isUpgrade) {
        return (
          <button 
            onClick={() => handleUpgrade(priceId, plan)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Upgrade'}
          </button>
        )
      } else if (isDowngrade) {
        return (
          <button 
            onClick={() => handleDowngrade(priceId, plan)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
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
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
          disabled={isLoading || subscriptionCheck.loading}
        >
          {isLoading ? 'Processing...' : 
           subscriptionCheck.loading ? 'Checking...' : 
           'Choose Plan'}
        </button>
      )
    }

    return null
  }

  // UPDATED: Handle subscription purchases with prevention logic
  const handleSubscriptionPurchase = async (planType) => {
    try {
      setIsLoading(true)
      
      // Prevent multiple subscriptions
      if (subscriptionCheck.hasActiveSubscription) {
        alert(`You already have an active ${subscriptionCheck.currentPlan} subscription. Please use the upgrade/downgrade options instead.`)
        return
      }
      
      const priceMapping = {
        'starter': process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
        'growth': process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID,
        'professional': process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
        'enterprise': process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID
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
          planType: planType,
          userId: user.id
        }),
      })
      
      const data = await response.json()
      
      if (data.error) {
        if (data.shouldUpgrade) {
          alert(data.message)
          return
        }
        throw new Error(data.error)
      }
      
      if (data.sessionId) {
        const { getStripe } = await import('@/lib/stripe')
        const stripe = await getStripe()
        await stripe.redirectToCheckout({ sessionId: data.sessionId })
      } else if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error creating checkout session: Unknown error')
      }
    } catch (error) {
      console.error('Error purchasing subscription:', error)
      alert('Error starting checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle single job purchase
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

  // Handle add-on purchases
  const handleAddonPurchase = async (addonType) => {
    try {
      setIsLoading(true)
      
      const priceMapping = {
        'resume_credits_10': process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_10_PRICE_ID,
        'resume_credits_25': process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_25_PRICE_ID,
        'resume_credits_50': process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_50_PRICE_ID,
      }
      
      const priceId = priceMapping[addonType]
      
      if (!priceId) {
        alert('Add-on not available. Please contact support.')
        return
      }
      
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

  // Handle featured/urgent job purchases
  const handleJobFeaturePurchase = async (jobId, featureType) => {
    try {
      setIsLoading(true)
      
      const priceMapping = {
        'featured': process.env.NEXT_PUBLIC_STRIPE_FEATURED_LISTING_PRICE_ID,
        'urgent': process.env.NEXT_PUBLIC_STRIPE_URGENT_BADGE_PRICE_ID
      }
      
      const priceId = priceMapping[featureType]
      
      if (!priceId) {
        alert('Feature not available. Please contact support.')
        return
      }
      
      const response = await fetch('/api/purchase-job-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          featureType: featureType,
          priceId: priceId,
          userId: user.id
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
      console.error('Error purchasing job feature:', error)
      alert('Error starting checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle job feature (free version - remove feature)
  const toggleJobFeature = async (jobId, featureType, isEnabled) => {
    try {
      const response = await fetch('/api/toggle-job-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          featureType: featureType,
          isEnabled: !isEnabled,
          userId: user.id
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        await loadJobs() // Refresh jobs list
        alert(`Job ${featureType} ${!isEnabled ? 'enabled' : 'disabled'} successfully!`)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error toggling job feature:', error)
      alert('Error updating job feature')
    }
  }

  // Open feature purchase modal
  const openFeaturePurchase = (job, type) => {
    setSelectedJobForFeature(job)
    setFeatureType(type)
    setShowFeatureModal(true)
  }

  // Load user's current credits
  const loadUserCredits = async () => {
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

  // Load user's current subscription
  const loadSubscription = async () => {
    try {
      if (!user) return
      
      const response = await fetch(`/api/subscription-status?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success && data.subscription) {
        console.log('✅ Loaded subscription:', data.subscription)
        setSubscription({
          tier: data.subscription.plan_type || 'free',
          credits: data.subscription.credits || 0,
          activeJobs: data.subscription.active_jobs_limit || 0,
          status: data.subscription.status,
          currentPeriodEnd: data.subscription.current_period_end
        })
      } else {
        console.log('No active subscription found')
        setSubscription({ tier: 'free', credits: 0, activeJobs: 0 })
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
      setSubscription({ tier: 'free', credits: 0, activeJobs: 0 })
    }
  }

  // Search resumes
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

  // Unlock profile contact details
  const unlockProfile = async (profileId) => {
    if (userCredits < 1) {
      alert('Insufficient credits. Please purchase resume credits to view contact details.')
      return
    }
    
    if (unlockedProfiles.has(profileId)) {
      return // Already unlocked
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

  // Filter applications based on selected job and status
  const filteredApplications = applications.filter(app => {
    const matchesJob = !selectedJobFilter || app.job_id === selectedJobFilter
    const matchesStatus = !statusFilter || app.status === statusFilter
    return matchesJob && matchesStatus
  })

  // NEW useEffect hooks for free job feature
  useEffect(() => {
    if (user?.id) {
      checkFreeJobEligibility()
      checkUpgradePrompts()

      // Check for prompts periodically
      const interval = setInterval(checkUpgradePrompts, 60000)
      return () => clearInterval(interval)
    }
  }, [user?.id])

  // Check URL params for direct navigation from homepage banners
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const showFreeJob = urlParams.get('free_job')
    
    if (showFreeJob === 'true' && freeJobEligible) {
      setShowFreeJobForm(true)
      // Clean up URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [freeJobEligible])

  useEffect(() => {
    console.log('Employer Dashboard useEffect - user:', user)
    console.log('Employer Dashboard useEffect - loading:', loading)
    
    if (!loading && !user) {
      console.log('No user found, redirecting to login')
      router.push('/auth/login')
      return
    }
    
    if (user) {
      console.log('User found, loading employer data')
      loadEmployerData()
    }
  }, [user, loading, router])

  // NEW: Check subscription status on component mount
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch(`/api/check-subscription-status?userId=${user.id}`)
        const data = await response.json()
        
        setSubscriptionCheck({
          loading: false,
          hasActiveSubscription: data.hasActiveSubscription,
          currentPlan: data.currentPlan,
          canPurchaseNew: data.canPurchaseNew
        })

        // Also update the subscription state with more accurate data
        if (data.subscription) {
          setSubscription({
            tier: data.subscription.plan_type || 'free',
            credits: data.subscription.credits || 0,
            activeJobs: data.subscription.active_jobs_limit || 0,
            status: data.subscription.status,
            currentPeriodEnd: data.subscription.current_period_end
          })
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
        setSubscriptionCheck(prev => ({ ...prev, loading: false }))
      }
    }

    checkSubscriptionStatus()
  }, [user?.id])

  // Auto-refresh applications every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !user) return
    
    const interval = setInterval(() => {
      loadApplications()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [user, autoRefresh])

  // Handle successful subscription payments
  useEffect(() => {
    const handleSubscriptionPaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const success = urlParams.get('success')
      const sessionId = urlParams.get('session_id')
      const planType = urlParams.get('plan')
      
      if (success === 'true' && sessionId && planType) {
        try {
          console.log('Processing successful subscription payment...', { sessionId, planType })
          
          const response = await fetch('/api/process-subscription-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: sessionId,
              planType: planType,
              userId: user.id
            }),
          })
          
          const data = await response.json()
          
          if (data.success) {
            alert(`🎉 ${data.message} Welcome to your new plan!`)
            
            // Refresh subscription data
            await loadSubscription()
            
            // Clean up URL parameters
            const newUrl = window.location.pathname
            window.history.replaceState({}, document.title, newUrl)
            
          } else {
            console.error('Subscription processing failed:', data.error)
            alert('❌ Error processing subscription. Please contact support.')
          }
        } catch (error) {
          console.error('Error processing subscription payment:', error)
          alert('❌ Error processing subscription. Please contact support.')
        }
      }
    }
    
    if (user) {
      handleSubscriptionPaymentSuccess()
    }
  }, [user])

  // Handle successful subscription upgrades
  useEffect(() => {
    const handleUpgradeSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const upgradeSuccess = urlParams.get('upgrade_success')
      const planType = urlParams.get('plan')
      
      if (upgradeSuccess === 'true' && planType && !notificationShown) {
        // Determine if upgrade or downgrade
        const currentPlanHierarchy = { 'free': 0, 'starter': 1, 'growth': 2, 'professional': 3, 'enterprise': 4 }
        const currentLevel = currentPlanHierarchy[subscription.tier] || 0
        const newLevel = currentPlanHierarchy[planType] || 0
        const isUpgrade = newLevel > currentLevel
        
        // Set notification as shown immediately
        setNotificationShown(true)
        
        alert(`🎉 Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${planType} plan! Your new plan is now active.`)
        
        // Refresh subscription data
        await loadSubscription()
        
        // Clean up URL parameters immediately
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
      }
      
      const upgradeCancelled = urlParams.get('upgrade_cancelled')
      if (upgradeCancelled === 'true' && !notificationShown) {
        setNotificationShown(true)
        alert('Upgrade was cancelled. Your current plan remains active.')
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
      }
    }
    
    if (user && subscription.tier) {
      handleUpgradeSuccess()
    }
  }, [user, subscription.tier, notificationShown])

  // Reset notification state when URL changes (for new upgrades)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasUpgradeParams = urlParams.get('upgrade_success') || urlParams.get('upgrade_cancelled')
    
    if (!hasUpgradeParams) {
      setNotificationShown(false)
    }
  }, [])

  // Handle successful feature payments
  useEffect(() => {
    const handleFeaturePaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionId = urlParams.get('session_id')
      const featureSuccess = urlParams.get('feature_success')
      
      if (sessionId && featureSuccess === 'true') {
        try {
          console.log('Processing successful feature payment...', sessionId)
          
          const response = await fetch('/api/process-feature-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: sessionId
            }),
          })
          
          const data = await response.json()
          
          if (data.success) {
            alert(`🎉 ${data.message} Your job promotion is now active!`)
            await loadJobs()
            const newUrl = window.location.pathname
            window.history.replaceState({}, document.title, newUrl)
          } else {
            console.error('Payment processing failed:', data.error)
            alert('❌ Error processing payment. Please contact support.')
          }
        } catch (error) {
          console.error('Error processing feature payment:', error)
          alert('❌ Error processing payment. Please contact support.')
        }
      }
      
      const featureCancelled = urlParams.get('feature_cancelled')
      if (featureCancelled === 'true') {
        alert('Payment was cancelled. Your job was not promoted.')
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
      }
    }
    
    if (user) {
      handleFeaturePaymentSuccess()
    }
  }, [user])

  const loadEmployerData = async () => {
    try {
      setIsLoading(true)
      await Promise.all([
        loadJobs(),
        loadApplications(),
        loadAnalytics(),
        loadProfile(),
        loadUserCredits(),
        loadSubscription()
      ])
    } catch (error) {
      console.error('Error loading employer data:', error)
    } finally {
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
    return applications.filter(app => app.status === 'new').length
  }

  const submitJob = async (e) => {
    e.preventDefault()
    
    try {
      const method = editingJob ? 'PUT' : 'POST'
      const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...jobForm,
          userId: user.id,
          id: editingJob?.id
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

  const updateApplicationStatus = async (applicationId, newStatus) => {
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
      
      if (response.ok) {
        await loadApplications()
        alert('Application status updated successfully!')
      } else {
        const error = await response.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error updating application:', error)
      alert('Error updating application status')
    }
  }

  const editJob = (job) => {
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

  const deleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await loadJobs()
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

  const openApplicationModal = (application) => {
    setSelectedApplication(application)
    setShowApplicationModal(true)
  }

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // Helper function to check if feature is expired
  const isFeatureExpired = (expirationDate) => {
    if (!expirationDate) return false
    return new Date(expirationDate) < new Date()
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <div>Loading your dashboard...</div>
        </div>
      </div>
    )
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
            </div>
            {/* UPDATED: Header button section with free job feature */}
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
                    onClick={() => setShowJobForm(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Post Job
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowJobForm(true)}
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
                  ? 'Unlimited'
                  : `${Math.max(0, (subscription.activeJobs || 0) - jobs.length)}`
                }
              </div>
              <div className="text-sm text-gray-600">
                {subscription.tier === 'enterprise' ? 'Job Postings' : 'Jobs Left'}
              </div>
              {subscription.tier !== 'enterprise' && subscription.activeJobs === 0 && (
                <div className="text-xs text-gray-500 mt-1">Upgrade for more</div>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-500">{applications.length}</div>
              <div className="text-sm text-gray-600">Total Applications</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-500">{getNewApplicationsCount()}</div>
              <div className="text-sm text-gray-600">New Applications</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-500">{userCredits}</div>
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
              { id: 'applications', label: 'Applications', icon: '📧', badge: getNewApplicationsCount() },
              { id: 'resume-search', label: 'Resume Search', icon: '🔍' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
              { id: 'billing', label: 'Billing & Plans', icon: '💳' }
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
                {tab.badge > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg p-6 shadow">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Dashboard Overview</h2>
              
              {/* Recent Activity */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recent Job Postings</h3>
                  {jobs.slice(0, 3).map(job => (
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
                          {job.isFeatured && !isFeatureExpired(job.featuredUntil) && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">⭐ Featured</span>
                          )}
                          {job.isUrgent && !isFeatureExpired(job.urgentUntil) && (
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
                  {applications.slice(0, 3).map(app => (
                    <div key={app.id} className="border border-gray-200 p-4 mb-2 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">{app.first_name} {app.last_name}</div>
                          <div className="text-gray-600 text-sm">{app.jobs?.title}</div>
                          <div className="text-gray-500 text-xs">Applied: {new Date(app.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          app.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                          app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                          app.status === 'interviewed' ? 'bg-purple-100 text-purple-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {app.status || 'new'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <p className="text-gray-500 italic">No applications yet. Applications will appear here when candidates apply to your jobs.</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
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
                    onClick={() => setShowJobForm(true)}
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
                <h2 className="text-xl font-bold">Your Job Postings</h2>
                <div className="flex gap-3">
                  {freeJobEligible && !checkingEligibility && (
                    <button
                      onClick={() => setShowFreeJobForm(true)}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      🎁 First Job Free
                    </button>
                  )}
                  <button
                    onClick={() => setShowJobForm(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                  >
                    Post New Job
                  </button>
                </div>
              </div>
              
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💼</div>
                  <h3 className="text-lg font-semibold mb-2">No jobs posted yet</h3>
                  <p className="text-gray-600 mb-4">Create your first job posting to start receiving applications</p>
                  <div className="space-y-2">
                    {freeJobEligible && !checkingEligibility && (
                      <button
                        onClick={() => setShowFreeJobForm(true)}
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg mr-4"
                      >
                        🎁 Post Your First Job Free
                      </button>
                    )}
                    <button
                      onClick={() => setShowJobForm(true)}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
                    >
                      Post Your First Job
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* UPDATED: Jobs display with free job status */}
                  {jobs.map(job => (
                    <div key={job.id} className={`border p-6 rounded-lg ${
                      job.is_free_job ? 'border-green-300 bg-green-50' :
                      job.isFeatured && !isFeatureExpired(job.featuredUntil) 
                        ? 'border-yellow-300 bg-yellow-50' 
                        : 'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-semibold text-lg">{job.title}</div>
                            {job.is_free_job && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                🎁 FREE JOB
                              </span>
                            )}
                            {job.isFeatured && !isFeatureExpired(job.featuredUntil) && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                                ⭐ Featured
                              </span>
                            )}
                            {job.isUrgent && !isFeatureExpired(job.urgentUntil) && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                                🚨 Urgent
                              </span>
                            )}
                          </div>
                          <div className="text-gray-600 mb-2">{job.company}</div>
                          <div className="text-sm text-gray-500">
                            {job.region} • {job.hourly_rate} • Posted: {new Date(job.created_at).toLocaleDateString()}
                            {job.is_free_job && job.free_job_expires_at && (
                              <span className="text-orange-600 font-medium">
                                • Expires: {new Date(job.free_job_expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Feature Expiration Info */}
                          {(job.isFeatured || job.isUrgent) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {job.isFeatured && job.featuredUntil && (
                                <div>Featured until: {formatDate(job.featuredUntil)}</div>
                              )}
                              {job.isUrgent && job.urgentUntil && (
                                <div>Urgent until: {formatDate(job.urgentUntil)}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status || 'active'}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {job.description}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => editJob(job)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setActiveTab('applications')}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          View Applications
                        </button>
                        
                        {/* ALL EXISTING ADD-ON FEATURES WORK THE SAME for free jobs */}
                        {job.isFeatured && !isFeatureExpired(job.featuredUntil) ? (
                          <button
                            onClick={() => toggleJobFeature(job.id, 'featured', true)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                          >
                            ⭐ Remove Featured
                          </button>
                        ) : (
                          <button
                            onClick={() => openFeaturePurchase(job, 'featured')}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                          >
                            ⭐ Make Featured ($29)
                          </button>
                        )}
                        
                        {job.isUrgent && !isFeatureExpired(job.urgentUntil) ? (
                          <button
                            onClick={() => toggleJobFeature(job.id, 'urgent', true)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            🚨 Remove Urgent
                          </button>
                        ) : (
                          <button
                            onClick={() => openFeaturePurchase(job, 'urgent')}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            🚨 Add Urgent ($19)
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
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
                <h2 className="text-xl font-bold">Job Applications</h2>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedJobFilter}
                    onChange={(e) => setSelectedJobFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Jobs ({applications.length} applications)</option>
                    {jobs.map(job => {
                      const jobApplications = applications.filter(app => app.job_id === job.id)
                      return (
                        <option key={job.id} value={job.id}>
                          {job.title} ({jobApplications.length} applications)
                        </option>
                      )
                    })}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="new">New</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interviewed">Interviewed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📧</div>
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-gray-600">Applications will appear here once candidates apply to your jobs</p>
                </div>
              ) : selectedJobFilter ? (
                // Single Job View - Detailed applications for one job
                <div>
                  {(() => {
                    const selectedJob = jobs.find(j => j.id === selectedJobFilter)
                    const jobApplications = filteredApplications.filter(app => app.job_id === selectedJobFilter)
                    
                    return (
                      <div>
                        <div className="bg-blue-50 p-4 rounded-lg mb-6">
                          <h3 className="text-lg font-semibold text-blue-800">{selectedJob?.title}</h3>
                          <p className="text-blue-600">{selectedJob?.company} • {jobApplications.length} Applications</p>
                        </div>
                        
                        <div className="space-y-4">
                          {jobApplications.map(app => (
                            <div key={app.id} className="border border-gray-200 p-6 rounded-lg">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <div className="font-semibold text-lg mb-1">{app.first_name} {app.last_name}</div>
                                  <div className="text-gray-600 mb-1">{app.email} • {app.phone}</div>
                                  <div className="text-sm text-gray-500 mb-2">
                                    Applied: {new Date(app.created_at).toLocaleDateString()} • Classification: {app.classification}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-2">
                                    Resume: {app.resume_url ? (
                                      <div className="flex gap-2 mt-1">
                                        <button
                                          onClick={() => {
                                            if (app.resume_url.toLowerCase().includes('.pdf')) {
                                              window.open(app.resume_url, '_blank')
                                            } else if (app.resume_url.toLowerCase().includes('.doc')) {
                                              window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(app.resume_url)}&embedded=true`, '_blank')
                                            } else {
                                              window.open(app.resume_url, '_blank')
                                            }
                                          }}
                                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                        >
                                          📄 View Resume
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-red-500">No resume uploaded</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                  <div className={`px-3 py-1 rounded-full text-sm font-medium text-center ${
                                    app.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                                    app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                                    app.status === 'interviewed' ? 'bg-purple-100 text-purple-800' :
                                    app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                  </div>
                                  <select
                                    value={app.status}
                                    onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  >
                                    <option value="new">New</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="interviewed">Interviewed</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                // All Jobs View - Grouped by job posting
                <div className="space-y-6">
                  {jobs.map(job => {
                    const jobApplications = filteredApplications.filter(app => app.job_id === job.id)
                    
                    if (jobApplications.length === 0) return null
                    
                    return (
                      <div key={job.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold text-lg">{job.title}</h3>
                              <p className="text-gray-600 text-sm">{job.company} • {jobApplications.length} Applications</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedJobFilter(job.id)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                              >
                                View All {jobApplications.length}
                              </button>
                              <div className="text-sm text-gray-500">
                                Posted {Math.floor((new Date() - new Date(job.created_at)) / (1000 * 60 * 60 * 24))} days ago
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <div className="grid gap-4">
                            {jobApplications.slice(0, 3).map(app => (
                              <div key={app.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium">{app.first_name} {app.last_name}</div>
                                  <div className="text-sm text-gray-600">{app.email} • {app.classification}</div>
                                  <div className="text-xs text-gray-500">Applied {new Date(app.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    app.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                                    app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                                    app.status === 'interviewed' ? 'bg-purple-100 text-purple-800' :
                                    app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                  </div>
                                  <select
                                    value={app.status}
                                    onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  >
                                    <option value="new">New</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="interviewed">Interviewed</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                  {app.resume_url && (
                                    <button
                                      onClick={() => {
                                        if (app.resume_url.toLowerCase().includes('.pdf')) {
                                          window.open(app.resume_url, '_blank')
                                        } else if (app.resume_url.toLowerCase().includes('.doc')) {
                                          window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(app.resume_url)}&embedded=true`, '_blank')
                                        } else {
                                          window.open(app.resume_url, '_blank')
                                        }
                                      }}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                                    >
                                      📄 Resume
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {jobApplications.length > 3 && (
                              <div className="text-center pt-2">
                                <button
                                  onClick={() => setSelectedJobFilter(job.id)}
                                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                                >
                                  View {jobApplications.length - 3} more applications →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Resume Search Tab */}
          {activeTab === 'resume-search' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Resume Search</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Credits: <span className="font-bold text-orange-500">{userCredits}</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Buy Credits
                  </button>
                </div>
              </div>

              {/* Search Filters */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">Search Filters</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                    <input
                      type="text"
                      value={searchFilters.keywords}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, keywords: e.target.value }))}
                      placeholder="engineer, nuclear, welding..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={searchFilters.location}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="City, State or Region"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                    <select
                      value={searchFilters.classification}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, classification: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Any Level</option>
                      <option value="junior">Junior (0-5 years)</option>
                      <option value="intermediate">Intermediate (5-10 years)</option>
                      <option value="senior">Senior (10-15 years)</option>
                      <option value="expert">Expert (15+ years)</option>
                      <option value="specialist">Specialist</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <input
                      type="text"
                      value={searchFilters.specialization}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, specialization: e.target.value }))}
                      placeholder="Nuclear Engineering..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Experience</label>
                    <select
                      value={searchFilters.minExperience}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, minExperience: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Any</option>
                      <option value="0">0+ years</option>
                      <option value="2">2+ years</option>
                      <option value="5">5+ years</option>
                      <option value="10">10+ years</option>
                      <option value="15">15+ years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Clearance</label>
                    <select
                      value={searchFilters.clearance}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, clearance: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Any</option>
                      <option value="true">Has Clearance</option>
                      <option value="false">No Clearance Required</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desired Rate</label>
                    <input
                      type="text"
                      value={searchFilters.minRate}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, minRate: e.target.value }))}
                      placeholder="$50/hr minimum"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={searchResumes}
                    disabled={searchLoading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    {searchLoading ? 'Searching...' : '🔍 Search Resumes'}
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

              {/* Search Results */}
              <div>
                {searchLoading ? (
                  <div className="text-center py-12">
                    <div className="text-2xl mb-4">🔍</div>
                    <div>Searching resumes...</div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold mb-2">No results yet</h3>
                    <p className="text-gray-600">Use the search filters above to find qualified candidates</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Search Results ({searchResults.length})</h3>
                      <div className="text-sm text-gray-600">
                        1 credit per contact unlock • {userCredits} credits remaining
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {searchResults.map(profile => (
                        <div key={profile.id} className="border border-gray-200 p-6 rounded-lg">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="font-semibold text-lg mb-2">
                                {unlockedProfiles.has(profile.id) ? 
                                  `${profile.first_name} ${profile.last_name}` : 
                                  `${profile.first_name} ${profile.last_name?.charAt(0)}.`
                                }
                              </div>
                              <div className="text-gray-600 mb-2">
                                {profile.classification} • {profile.years_experience || 'N/A'} years experience
                              </div>
                              <div className="text-sm text-gray-500 mb-2">
                                📍 {profile.location || 'Location not specified'} • 
                                💰 {profile.desired_rate || 'Rate not specified'}
                              </div>
                              {profile.specialization && (
                                <div className="text-sm text-gray-600 mb-2">
                                  🎯 Specialization: {profile.specialization}
                                </div>
                              )}
                              {profile.has_security_clearance && (
                                <div className="text-sm text-green-600 mb-2">
                                  🔒 Security Clearance: {profile.clearance_level || 'Yes'}
                                </div>
                              )}
                              {profile.skills && profile.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {profile.skills.slice(0, 6).map((skill, index) => (
                                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                      {skill}
                                    </span>
                                  ))}
                                  {profile.skills.length > 6 && (
                                    <span className="text-xs text-gray-500">+{profile.skills.length - 6} more</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              {unlockedProfiles.has(profile.id) ? (
                                <div className="text-center">
                                  <div className="text-sm font-medium text-green-600 mb-2">✅ Unlocked</div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    📧 {profile.email}
                                  </div>
                                  <div className="text-sm text-gray-600 mb-3">
                                    📞 {profile.phone || 'No phone'}
                                  </div>
                                  {profile.resume_url && (
                                    <button
                                      onClick={() => {
                                        if (profile.resume_url.toLowerCase().includes('.pdf')) {
                                          window.open(profile.resume_url, '_blank')
                                        } else if (profile.resume_url.toLowerCase().includes('.doc')) {
                                          window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(profile.resume_url)}&embedded=true`, '_blank')
                                        } else {
                                          window.open(profile.resume_url, '_blank')
                                        }
                                      }}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm w-full"
                                    >
                                      📄 View Resume
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center">
                                  <button
                                    onClick={() => unlockProfile(profile.id)}
                                    disabled={userCredits < 1}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                  >
                                    🔓 Unlock Contact
                                    <div className="text-xs">1 credit</div>
                                  </button>
                                  <div className="text-xs text-gray-500 mt-1">
                                    View email, phone & resume
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {profile.availability_date && (
                            <div className="text-sm text-gray-600 border-t pt-3">
                              📅 Available: {profile.availability_date}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (            
            <div>
              <h2 className="text-xl font-bold mb-6">Job Analytics</h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
                    <p className="text-gray-600">Analytics will appear here once you have active jobs</p>
                  </div>
                ) : Object.keys(analytics).length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
                    <p className="text-gray-600">Analytics will appear here once you have active jobs</p>
                  </div>
                ) : (
                  Object.entries(analytics).map(([jobId, data]) => {
                    const job = jobs.find(j => j.id.toString() === jobId)
                    if (!job) return null
                    
                    return (
                      <div key={jobId} className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">{job.title}</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Views:</span>
                            <span className="font-semibold">{data.views || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Applications:</span>
                            <span className="font-semibold">{data.applications || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Saves:</span>
                            <span className="font-semibold">{data.saves || 0}</span>
                          </div>
                          {data.statusBreakdown && (
                            <div className="pt-2 border-t border-gray-300">
                              <div className="text-sm text-gray-600 mb-1">Application Status:</div>
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span>New:</span>
                                  <span>{data.statusBreakdown.new || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Shortlisted:</span>
                                  <span>{data.statusBreakdown.shortlisted || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Interviewed:</span>
                                  <span>{data.statusBreakdown.interviewed || 0}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Billing & Subscription</h2>
              
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-2">Current Plan: {subscriptionCheck.currentPlan === 'free' ? 'Free Account' : subscriptionCheck.currentPlan}</h3>
                <p>Manage your subscription and billing information</p>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                {/* Single Job Option */}
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Single Job</h3>
                  <div className="text-3xl font-bold text-orange-500 mb-2">$99</div>
                  <div className="text-gray-600 mb-4">one-time</div>
                  <ul className="space-y-2 text-sm mb-6">
                    <li>✓ 1 job posting (30 days)</li>
                    <li>✓ Basic applicant management</li>
                    <li>✓ Email support</li>
                  </ul>
                  <button 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
                    onClick={() => handleSingleJobPurchase()}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Post Job - $99'}
                  </button>
                </div>

                {/* Starter Plan */}
                <div className={`border-2 ${subscriptionCheck.currentPlan === 'starter' ? 'border-green-500 bg-green-50' : 'border-gray-200'} rounded-lg p-6`}>
                  {subscriptionCheck.currentPlan === 'starter' && (
                    <div className="text-center mb-2">
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">CURRENT PLAN</span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold mb-4">Starter</h3>
                  <div className="text-3xl font-bold text-orange-500 mb-2">$199</div>
                  <div className="text-gray-600 mb-4">per month</div>
                  <ul className="space-y-2 text-sm mb-6">
                    <li>✓ 3 active job postings</li>
                    <li>✓ Basic applicant management</li>
                    <li>✓ Email support</li>
                  </ul>
                  {renderSubscriptionButton('starter', process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID)}
                </div>

                {/* Growth Plan */}
                <div className={`border-2 ${subscriptionCheck.currentPlan === 'growth' ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'} rounded-lg p-6`}>
                  <div className="text-center mb-2">
                    {subscriptionCheck.currentPlan === 'growth' ? (
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">CURRENT PLAN</span>
                    ) : (
                      <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">MOST POPULAR</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-4">Growth</h3>
                  <div className="text-3xl font-bold text-orange-500 mb-2">$299</div>
                  <div className="text-gray-600 mb-4">per month</div>
                  <ul className="space-y-2 text-sm mb-6">
                    <li>✓ 6 active job postings</li>
                    <li>✓ Resume credits included</li>
                    <li>✓ Priority support</li>
                  </ul>
                  {renderSubscriptionButton('growth', process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID)}
                </div>

                {/* Professional Plan */}
                <div className={`border-2 ${subscriptionCheck.currentPlan === 'professional' ? 'border-green-500 bg-green-50' : 'border-gray-200'} rounded-lg p-6`}>
                  {subscriptionCheck.currentPlan === 'professional' && (
                    <div className="text-center mb-2">
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">CURRENT PLAN</span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold mb-4">Professional</h3>
                  <div className="text-3xl font-bold text-orange-500 mb-2">$599</div>
                  <div className="text-gray-600 mb-4">per month</div>
                  <ul className="space-y-2 text-sm mb-6">
                    <li>✓ 15 active job postings</li>
                    <li>✓ 25 resume credits included</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Featured listings</li>
                  </ul>
                  {renderSubscriptionButton('professional', process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID)}
                </div>
              </div>

              {/* Enterprise Plan - Full Width */}
              <div className="mt-6">
                <div className={`border-2 ${subscriptionCheck.currentPlan === 'enterprise' ? 'border-green-500 bg-green-50' : 'border-purple-500 bg-purple-50'} rounded-lg p-6`}>
                  <div className="text-center">
                    {subscriptionCheck.currentPlan === 'enterprise' && (
                      <div className="mb-2">
                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">CURRENT PLAN</span>
                      </div>
                    )}
                    <h3 className="text-xl font-semibold mb-4">Enterprise</h3>
                    <div className="text-4xl font-bold text-purple-600 mb-2">$1,999</div>
                    <div className="text-gray-600 mb-4">per month</div>
                    <div className="grid md:grid-cols-3 gap-4 text-sm mb-6">
                      <div>✓ Unlimited job postings</div>
                      <div>✓ Unlimited resume access</div>
                      <div>✓ Dedicated account manager</div>
                    </div>
                    {renderSubscriptionButton('enterprise', process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID)}
                  </div>
                </div>
              </div>

              {/* Add-On Features Section */}
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Premium Add-Ons</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold mb-2">Resume Credits - 10 Pack</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$39</div>
                    <div className="text-sm text-gray-600 mb-3">10 credits for candidate contact</div>
                    <button 
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm"
                      onClick={() => handleAddonPurchase('resume_credits_10')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Buy 10 Credits'}
                    </button>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold mb-2">Resume Credits - 25 Pack</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$79</div>
                    <div className="text-sm text-gray-600 mb-3">25 credits - Best Value</div>
                    <button 
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm"
                      onClick={() => handleAddonPurchase('resume_credits_25')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Buy 25 Credits'}
                    </button>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold mb-2">Resume Credits - 50 Pack</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$129</div>
                    <div className="text-sm text-gray-600 mb-3">50 credits for high volume</div>
                    <button 
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm"
                      onClick={() => handleAddonPurchase('resume_credits_50')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Buy 50 Credits'}
                    </button>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold mb-2">Featured Listing</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$29</div>
                    <div className="text-sm text-gray-600 mb-3">Top of search results with bright highlight badge</div>
                    <p className="text-xs text-gray-500 mb-3">Apply to individual jobs in the Job Postings tab</p>
                    <button 
                      onClick={() => setActiveTab('jobs')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
                    >
                      ⭐ Manage Featured Jobs
                    </button>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold mb-2">Urgent Badge</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$19</div>
                    <div className="text-sm text-gray-600 mb-3">Bright "URGENT" badge for immediate attention</div>
                    <p className="text-xs text-gray-500 mb-3">Apply to individual jobs in the Job Postings tab</p>
                    <button 
                      onClick={() => setActiveTab('jobs')}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
                    >
                      🚨 Manage Urgent Jobs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Feature Purchase Modal */}
      {showFeatureModal && selectedJobForFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                Add {featureType === 'featured' ? 'Featured' : 'Urgent'} to Job
              </h2>
              <button
                onClick={() => setShowFeatureModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">{selectedJobForFeature.title}</h3>
                <p className="text-gray-600">{selectedJobForFeature.company}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-3 mb-2">
                  {featureType === 'featured' ? (
                    <>
                      <span className="text-2xl">⭐</span>
                      <div>
                        <div className="font-semibold">Featured Job Listing</div>
                        <div className="text-sm text-gray-600">$29 for 30 days</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🚨</span>
                      <div>
                        <div className="font-semibold">Urgent Badge</div>
                        <div className="text-sm text-gray-600">$19 for 30 days</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {featureType === 'featured' 
                    ? 'Your job will appear at the top of search results with a bright highlight badge'
                    : 'Add a bright "URGENT" badge to get immediate attention from job seekers'
                  }
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeatureModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleJobFeaturePurchase(selectedJobForFeature.id, featureType)
                    setShowFeatureModal(false)
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${
                    featureType === 'featured' 
                      ? 'bg-yellow-500 hover:bg-yellow-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  Purchase ${featureType === 'featured' ? '29' : '19'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free Job Form Modal - Uses existing job form */}
      {showFreeJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div>
                <h2 className="text-xl font-semibold text-green-800">🎁 Post Your First Job Free!</h2>
                <p className="text-sm text-green-600">30 days of visibility • All add-on features available</p>
              </div>
              <button
                onClick={() => setShowFreeJobForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-green-100 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-green-800 mb-2">What's Included:</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ 30 days of active visibility</li>
                  <li>✓ Unlimited applications</li>
                  <li>✓ Full applicant management</li>
                  <li>✓ All existing add-on features available (Featured, Urgent, etc.)</li>
                  <li>✓ Same functionality as paid job postings</li>
                </ul>
              </div>
              
              {/* Use your EXISTING job form - just change the submit handler */}
              <form onSubmit={submitFreeJob} className="space-y-6">
                {/* Copy all your existing job form fields here */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Job Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                      <input
                        type="text"
                        value={jobForm.title}
                        onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={jobForm.company}
                        onChange={(e) => setJobForm(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Location & Compensation */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Location & Compensation</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                      <select
                        value={jobForm.region}
                        onChange={(e) => setJobForm(prev => ({ ...prev, region: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate *</label>
                      <input
                        type="text"
                        value={jobForm.hourlyRate}
                        onChange={(e) => setJobForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                        placeholder="$35 - $45/hr"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                      <select
                        value={jobForm.duration}
                        onChange={(e) => setJobForm(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select Duration</option>
                        <option value="1-3-months">1-3 months</option>
                        <option value="3-6-months">3-6 months</option>
                        <option value="6-12-months">6-12 months</option>
                        <option value="1-2-years">1-2 years</option>
                        <option value="permanent">Permanent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Industry & Classification */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Industry & Requirements</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                      <select
                        value={jobForm.industry}
                        onChange={(e) => setJobForm(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">Select Industry</option>
                        <option value="nuclear">Nuclear Power</option>
                        <option value="power-generation">Power Generation</option>
                        <option value="petrochem">Petro-Chem/Fossil/Offshore</option>
                        <option value="alt-energy">Alternative Energy</option>
                        <option value="electric-td">Electric T&D</option>
                        <option value="construction">Construction</option>
                        <option value="homeland">Homeland/DoD/Fed Gov</option>
                        <option value="shipyard">Shipyard/Marine</option>
                        <option value="computer">Computer/Telecom</option>
                        <option value="aerospace">Aerospace</option>
                        <option value="overseas">Overseas</option>
                        <option value="medical">Medical/Pharma</option>
                        <option value="manufacturing">Manufacturing</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Classification *</label>
                      <select
                        value={jobForm.classification}
                        onChange={(e) => setJobForm(prev => ({ ...prev, classification: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">Select Classification</option>
                        <option value="junior">Junior (0-5 years)</option>
                        <option value="intermediate">Intermediate (5-10 years)</option>
                        <option value="senior">Senior (10-15 years)</option>
                        <option value="expert">Expert (15+ years)</option>
                        <option value="specialist">Specialist</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Describe the job responsibilities, requirements, and benefits..."
                    required
                  />
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                  <textarea
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm(prev => ({ ...prev, requirements: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="List specific requirements, certifications, or qualifications..."
                  />
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                      <input
                        type="email"
                        value={jobForm.contactEmail}
                        onChange={(e) => setJobForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        value={jobForm.contactPhone}
                        onChange={(e) => setJobForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFreeJobForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    {isLoading ? 'Posting...' : '🎁 Post Free Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && currentPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🚀</div>
                <h2 className="text-xl font-semibold mb-2">
                  {currentPrompt.prompt_type === 'first_application' && "Congratulations! Your first application!"}
                  {currentPrompt.prompt_type === '2_weeks_before' && "Your free job expires in 2 weeks"}
                  {currentPrompt.prompt_type === '1_day_before' && "Your free job expires tomorrow"}
                  {currentPrompt.prompt_type === 'expiration_day' && "Your free job expires today"}
                </h2>
                <p className="text-gray-600">
                  {currentPrompt.prompt_type === 'first_application' && 
                    "Great news! Someone applied to your free job. Ready to upgrade for more features?"
                  }
                  {currentPrompt.prompt_type !== 'first_application' && 
                    "Upgrade to a paid plan to keep your job active and get more applications."
                  }
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => handlePromptAction('upgrade')}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium"
                >
                  🚀 View Paid Plans
                </button>
                <button
                  onClick={() => handlePromptAction('dismiss')}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Form Modal */}
      {showJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">{editingJob ? 'Edit Job' : 'Post New Job'}</h2>
              <button
                onClick={() => {
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
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={submitJob} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Job Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={jobForm.company}
                      onChange={(e) => setJobForm(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Location & Compensation */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Location & Compensation</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                    <select
                      value={jobForm.region}
                      onChange={(e) => setJobForm(prev => ({ ...prev, region: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate *</label>
                    <input
                      type="text"
                      value={jobForm.hourlyRate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="$35 - $45/hr"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <select
                      value={jobForm.duration}
                      onChange={(e) => setJobForm(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Duration</option>
                      <option value="1-3-months">1-3 months</option>
                      <option value="3-6-months">3-6 months</option>
                      <option value="6-12-months">6-12 months</option>
                      <option value="1-2-years">1-2 years</option>
                      <option value="permanent">Permanent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Industry & Classification */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Industry & Requirements</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                    <select
                      value={jobForm.industry}
                      onChange={(e) => setJobForm(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Select Industry</option>
                      <option value="nuclear">Nuclear Power</option>
                      <option value="power-generation">Power Generation</option>
                      <option value="petrochem">Petro-Chem/Fossil/Offshore</option>
                      <option value="alt-energy">Alternative Energy</option>
                      <option value="electric-td">Electric T&D</option>
                      <option value="construction">Construction</option>
                      <option value="homeland">Homeland/DoD/Fed Gov</option>
                      <option value="shipyard">Shipyard/Marine</option>
                      <option value="computer">Computer/Telecom</option>
                      <option value="aerospace">Aerospace</option>
                      <option value="overseas">Overseas</option>
                      <option value="medical">Medical/Pharma</option>
                      <option value="manufacturing">Manufacturing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classification *</label>
                    <select
                      value={jobForm.classification}
                      onChange={(e) => setJobForm(prev => ({ ...prev, classification: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Select Classification</option>
                      <option value="junior">Junior (0-5 years)</option>
                      <option value="intermediate">Intermediate (5-10 years)</option>
                      <option value="senior">Senior (10-15 years)</option>
                      <option value="expert">Expert (15+ years)</option>
                      <option value="specialist">Specialist</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
                <textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe the job responsibilities, requirements, and benefits..."
                  required
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm(prev => ({ ...prev, requirements: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="List specific requirements, certifications, or qualifications..."
                />
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                    <input
                      type="email"
                      value={jobForm.contactEmail}
                      onChange={(e) => setJobForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={jobForm.contactPhone}
                      onChange={(e) => setJobForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJobForm(false)
                    setEditingJob(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
                >
                  {editingJob ? 'Update Job' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}