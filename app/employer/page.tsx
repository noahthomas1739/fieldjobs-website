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
  
  // Data states with proper types
  const [jobs, setJobs] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>({})
  const [profile, setProfile] = useState<any>({})
  const [subscription, setSubscription] = useState<any>({ tier: 'free', credits: 0, activeJobs: 0 })
  
  // NEW: Free job feature states
  const [freeJobEligible, setFreeJobEligible] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(true)
  const [showFreeJobForm, setShowFreeJobForm] = useState(false)
  const [pendingPrompts, setPendingPrompts] = useState<any[]>([])
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState<any>(null)
  
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

  // NEW: Helper functions for subscription management
  const getPlanLevel = (plan: string) => {
    const levels: Record<string, number> = { free: 0, starter: 1, growth: 2, professional: 3, enterprise: 4 }
    return levels[plan] || 0
  }

  const handleUpgrade = async (priceId: string, planType: string) => {
    if (!user?.id) return
    
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

  const handleDowngrade = async (priceId: string, planType: string) => {
    if (!user?.id) return
    
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
  const renderSubscriptionButton = (plan: string, priceId: string) => {
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
  const handleSubscriptionPurchase = async (planType: string) => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      
      // Prevent multiple subscriptions
      if (subscriptionCheck.hasActiveSubscription) {
        alert(`You already have an active ${subscriptionCheck.currentPlan} subscription. Please use the upgrade/downgrade options instead.`)
        return
      }
      
      const priceMapping: Record<string, string> = {
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
  const handleAddonPurchase = async (addonType: string) => {
    try {
      setIsLoading(true)
      
      const priceMapping: Record<string, string> = {
        'resume_credits_10': process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_10_PRICE_ID || '',
        'resume_credits_25': process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_25_PRICE_ID || '',
        'resume_credits_50': process.env.NEXT_PUBLIC_STRIPE_RESUME_CREDITS_50_PRICE_ID || '',
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
  const handleJobFeaturePurchase = async (jobId: number, featureType: string) => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      
      const priceMapping: Record<string, string> = {
        'featured': process.env.NEXT_PUBLIC_STRIPE_FEATURED_LISTING_PRICE_ID || '',
        'urgent': process.env.NEXT_PUBLIC_STRIPE_URGENT_BADGE_PRICE_ID || ''
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
  const toggleJobFeature = async (jobId: number, featureType: string, isEnabled: boolean) => {
    if (!user?.id) return
    
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
  const openFeaturePurchase = (job: any, type: string) => {
    setSelectedJobForFeature(job)
    setFeatureType(type)
    setShowFeatureModal(true)
  }

  // Load user's current credits
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
  const unlockProfile = async (profileId: number) => {
    if (!user?.id) return
    
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
  const filteredApplications = applications.filter((app: any) => {
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
      
      if (success === 'true' && sessionId && planType && user?.id) {
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
        const currentPlanHierarchy: Record<string, number> = { 'free': 0, 'starter': 1, 'growth': 2, 'professional': 3, 'enterprise': 4 }
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
    return applications.filter((app: any) => app.status === 'new').length
  }

  const submitJob = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return
    
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

  const updateApplicationStatus = async (applicationId: number, newStatus: string) => {
    if (!user?.id) return
    
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

  const openApplicationModal = (application: any) => {
    setSelectedApplication(application)
    setShowApplicationModal(true)
  }

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // Helper function to check if feature is expired
  const isFeatureExpired = (expirationDate: string) => {
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
                {tab.badge && tab.badge > 0 && (
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
                  {applications.slice(0, 3).map((app: any) => (
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
                <h2 className="text-xl font-bold">Job Postings ({jobs.length})</h2>
                <button
                  onClick={() => setShowJobForm(true)}
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
                              {job.isFeatured && !isFeatureExpired(job.featuredUntil) && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">⭐ Featured</span>
                              )}
                              {job.isUrgent && !isFeatureExpired(job.urgentUntil) && (
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
                      
                      {/* Job Actions */}
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openFeaturePurchase(job, 'featured')}
                            className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center gap-1"
                          >
                            ⭐ Feature Job
                          </button>
                          <button
                            onClick={() => openFeaturePurchase(job, 'urgent')}
                            className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                          >
                            🚨 Mark Urgent
                          </button>
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

              {/* Filters */}
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
                      <option value="new">New</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interviewed">Interviewed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
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
                              app.status === 'new' ? 'bg-blue-100 text-blue-800' : 
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
                          <select
                            value={app.status || 'new'}
                            onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
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
              )}
            </div>
          )}

          {/* Resume Search Tab */}
          {activeTab === 'resume-search' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Resume Search</h2>
                <div className="text-sm text-gray-600">
                  Credits: {userCredits} • Each contact unlock uses 1 credit
                </div>
              </div>

              {/* Search Filters */}
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
                      <option value="Contract">Contract</option>
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

              {/* Search Results */}
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
              
              {/* Key Metrics */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalViews || 0}</div>
                  <div className="text-sm text-gray-600">Total Job Views</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.totalApplications || 0}</div>
                  <div className="text-sm text-gray-600">Total Applications</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics.totalApplications > 0 
                      ? Math.round((analytics.totalApplications / Math.max(analytics.totalViews, 1)) * 100)
                      : 0
                    }%
                  </div>
                  <div className="text-sm text-gray-600">Application Rate</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{analytics.activeJobs || 0}</div>
                  <div className="text-sm text-gray-600">Active Jobs</div>
                </div>
              </div>

              {/* Job Performance */}
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

              {/* Recent Activity */}
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

          {/* Billing & Plans Tab */}
          {activeTab === 'billing' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Billing & Plans</h2>
              
              {/* Current Plan Status */}
              <div className="bg-blue-50 p-6 rounded-lg mb-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">Current Plan: {subscription.tier}</h3>
                    <p className="text-gray-600">
                      {subscription.tier === 'free' 
                        ? 'You are on the free plan with limited features'
                        : `Your ${subscription.tier} plan is active`
                      }
                    </p>
                    {subscription.currentPeriodEnd && (
                      <p className="text-sm text-gray-500">
                        Renews on: {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{subscription.credits || 0}</div>
                    <div className="text-sm text-gray-600">Resume Credits</div>
                  </div>
                </div>
              </div>

              {/* Subscription Plans */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Starter Plan */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold">Starter</h3>
                    <div className="text-3xl font-bold text-orange-500 my-2">$29</div>
                    <div className="text-gray-600 text-sm">per month</div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li>✅ 3 active job postings</li>
                    <li>✅ 10 resume credits/month</li>
                    <li>✅ Basic analytics</li>
                    <li>✅ Email support</li>
                  </ul>
                  {renderSubscriptionButton('starter', process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '')}
                </div>

                {/* Growth Plan */}
                <div className="border border-orange-300 rounded-lg p-6 relative bg-orange-50">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      POPULAR
                    </span>
                  </div>
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold">Growth</h3>
                    <div className="text-3xl font-bold text-orange-500 my-2">$79</div>
                    <div className="text-gray-600 text-sm">per month</div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li>✅ 10 active job postings</li>
                    <li>✅ 50 resume credits/month</li>
                    <li>✅ Advanced analytics</li>
                    <li>✅ Priority support</li>
                    <li>✅ Featured job listings</li>
                  </ul>
                  {renderSubscriptionButton('growth', process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID || '')}
                </div>

                {/* Professional Plan */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold">Professional</h3>
                    <div className="text-3xl font-bold text-orange-500 my-2">$149</div>
                    <div className="text-gray-600 text-sm">per month</div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    <li>✅ 25 active job postings</li>
                    <li>✅ 100 resume credits/month</li>
                    <li>✅ Premium analytics</li>
                    <li>✅ Phone support</li>
                    <li>✅ All job features</li>
                    <li>✅ Bulk posting tools</li>
                  </ul>
                  {renderSubscriptionButton('professional', process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || '')}
                </div>
              </div>

              {/* Add-ons */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold mb-4">Add-ons</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">10 Resume Credits</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$19</div>
                    <p className="text-gray-600 text-sm mb-4">One-time purchase</p>
                    <button
                      onClick={() => handleAddonPurchase('resume_credits_10')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Purchase'}
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">25 Resume Credits</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$39</div>
                    <p className="text-gray-600 text-sm mb-4">One-time purchase</p>
                    <button
                      onClick={() => handleAddonPurchase('resume_credits_25')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Purchase'}
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">50 Resume Credits</h4>
                    <div className="text-2xl font-bold text-orange-500 mb-2">$69</div>
                    <p className="text-gray-600 text-sm mb-4">One-time purchase</p>
                    <button
                      onClick={() => handleAddonPurchase('resume_credits_50')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Purchase'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Job Form Modal */}
        {showJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
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
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Region *</label>
                    <input
                      type="text"
                      value={jobForm.region}
                      onChange={(e) => setJobForm(prev => ({ ...prev, region: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                    <input
                      type="text"
                      value={jobForm.hourlyRate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="$50-75/hr"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration</label>
                    <input
                      type="text"
                      value={jobForm.duration}
                      onChange={(e) => setJobForm(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="6 months"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={jobForm.startDate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Industry</label>
                    <select
                      value={jobForm.industry}
                      onChange={(e) => setJobForm(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select Industry</option>
                      <option value="Technology">Technology</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Finance">Finance</option>
                      <option value="Education">Education</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
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
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
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
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Region *</label>
                    <input
                      type="text"
                      value={jobForm.region}
                      onChange={(e) => setJobForm(prev => ({ ...prev, region: e.target.value }))}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                    <input
                      type="text"
                      value={jobForm.hourlyRate}
                      onChange={(e) => setJobForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="$50-75/hr"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
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
                  <strong>Status:</strong> 
                  <select
                    value={selectedApplication.status || 'new'}
                    onChange={(e) => {
                      updateApplicationStatus(selectedApplication.id, e.target.value)
                      setSelectedApplication(prev => ({ ...prev, status: e.target.value }))
                    }}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="new">New</option>
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
                  {featureType === 'featured' ? '$49' : '$29'}
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
                  Purchase {featureType === 'featured' ? '$49' : '$29'}
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
