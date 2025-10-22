'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useJobViewTracking } from '@/hooks/useJobViewTracking'

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Job data and filtering
  const [jobs, setJobs] = useState<any[]>([])
  const [filteredJobs, setFilteredJobs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [jobsPerPage] = useState<number>(10)
  const [sortBy, setSortBy] = useState<string>('recent')
  
  // Search and filters (matching HTML demo)
  const [searchInput, setSearchInput] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<string>('')
  const [compensationFilter, setCompensationFilter] = useState<string>('')
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('')
  const [classificationFilter, setClassificationFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')
  
  // Industry filters (matching HTML demo exactly)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  
  // Job seeker features
  const [savedJobs, setSavedJobs] = useState<number[]>([])
  const [appliedJobs, setAppliedJobs] = useState<number[]>([])
  const [expandedJobs, setExpandedJobs] = useState<number[]>([])
  
  // Modals
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false)
  const [showApplicationModal, setShowApplicationModal] = useState<boolean>(false)
  const [showJobDetailModal, setShowJobDetailModal] = useState<boolean>(false)
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [searchComplete, setSearchComplete] = useState<boolean>(false)
  
  // Track job views when job detail modal is open
  useJobViewTracking(selectedJob?.id, user?.id || null)
  
  // NEW: Employer banner state variables
  const [showEmployerBanner, setShowEmployerBanner] = useState<boolean>(true)
  const [freeJobEligible, setFreeJobEligible] = useState<boolean>(false)
  const [checkingEligibility, setCheckingEligibility] = useState<boolean>(false)
  
  // Forms
  const [applicationForm, setApplicationForm] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    classification: '',
  })
  
  const [alertForm, setAlertForm] = useState<any>({
    name: '',
    keywords: '',
    region: '',
    industry: '',
    classification: '',
    salary: '',
    frequency: 'daily'
  })

  useEffect(() => {
    loadJobs()
    if (user) {
      loadSavedJobs()
      loadAppliedJobs()
    }
  }, [user])

  useEffect(() => {
    filterAndSortJobs()
  }, [jobs, searchInput, locationFilter, compensationFilter, jobTypeFilter, classificationFilter, dateFilter, activeFilters, sortBy])

  // NEW: Check free job eligibility when user logs in
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

  // UPDATED: Load jobs function with free job filtering
  const loadJobs = async () => {
    try {
      setIsLoading(true)
      
      // Load real jobs from database with featured/urgent fields
      const response = await fetch('/api/jobs?limit=100')
      if (response.ok) {
        const data = await response.json()
        let allJobs = data.jobs || data // Handle both {jobs: []} and [] formats
        
        // Filter out expired free jobs for public view
        allJobs = allJobs.filter((job: any) => {
          if (job.is_free_job && job.free_job_expires_at) {
            const expirationDate = new Date(job.free_job_expires_at)
            const now = new Date()
            return expirationDate > now && job.status === 'active'
          }
          return job.status === 'active'
        })
        
        setJobs(allJobs)
        setFilteredJobs(allJobs)
      } else {
        console.error('Failed to load jobs')
        setJobs([])
        setFilteredJobs([])
      }
    } catch (error) {
      console.error('Error loading jobs:', error)
      setJobs([])
      setFilteredJobs([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadSavedJobs = async () => {
    try {
      if (!user?.id) return
      
      const response = await fetch(`/api/saved-jobs?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        const savedJobIds = data.savedJobs.map((saved: any) => saved.job_id)
        setSavedJobs(savedJobIds)
      }
    } catch (error) {
      console.error('Error loading saved jobs:', error)
    }
  }

  const loadAppliedJobs = async () => {
    try {
      if (!user?.id) return
      
      const response = await fetch(`/api/applied-jobs?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        // Extract just the job IDs for the appliedJobs array
        const appliedJobIds = data.appliedJobs.map((app: any) => app.jobs.id)
        setAppliedJobs(appliedJobIds)
      }
    } catch (error) {
      console.error('Error loading applied jobs:', error)
    }
  }

  // NEW: Handle employer banner clicks
  const handleEmployerBannerClick = () => {
    if (!user) {
      // Not logged in - redirect to account creation
      router.push('/auth/signup?redirect=free_job&type=employer')
      return
    }

    // Check if user is employer by looking at multiple possible locations
    const isEmployer = 
      user.user_metadata?.account_type === 'employer' ||
      user.app_metadata?.account_type === 'employer' ||
      user.user_metadata?.accountType === 'employer'

    if (!isEmployer) {
      // Logged in but not employer - go to create employer account
      router.push('/auth/signup?type=employer&redirect=free_job')
      return
    }

    // Logged in employer - check free job eligibility
    if (freeJobEligible) {
      router.push('/employer?action=post-free-job')
    } else {
      router.push('/employer')
    }
  }

  // NEW: Logic for showing thin banner
  const shouldShowThinBanner = () => {
    if (!showEmployerBanner) return false // User closed it
    
    if (!user) return true // Show to non-logged in users
    
    // Check if user is employer by looking at multiple possible locations
    const isEmployer = 
      user.user_metadata?.account_type === 'employer' ||
      user.app_metadata?.account_type === 'employer' ||
      user.user_metadata?.accountType === 'employer'
    
    if (user && isEmployer && freeJobEligible) {
      return true // Show to eligible employers
    }
    
    return false // Hide for everyone else
  }

  // Check if a feature is still active (works with both old and new field names)
  const isFeatureActive = (featureUntil: string | null) => {
    if (!featureUntil) return false
    return new Date(featureUntil) > new Date()
  }

  // Get feature status for a job
  const getJobFeatureStatus = (job: any) => {
    const isFeatured = job.is_featured && isFeatureActive(job.featured_until)
    const isUrgent = job.is_urgent && isFeatureActive(job.urgent_until)
    
    // Fallback to old field names if new ones don't exist
    const legacyFeatured = job.isFeatured || (job.badges && job.badges.includes('featured'))
    const legacyUrgent = job.badges && job.badges.includes('urgent')
    
    return {
      isFeatured: isFeatured || legacyFeatured,
      isUrgent: isUrgent || legacyUrgent
    }
  }

  const toggleJobDescription = (jobId: number) => {
    if (expandedJobs.includes(jobId)) {
      setExpandedJobs((prev: any) => prev.filter((id: any) => id !== jobId))
    } else {
      setExpandedJobs((prev: any) => [...prev, jobId])
    }
  }

  const filterAndSortJobs = () => {
    let filtered = jobs.filter((job: any) => {
      // Search input filter
      const matchesSearch = !searchInput || 
        job.title.toLowerCase().includes(searchInput.toLowerCase()) ||
        job.company.toLowerCase().includes(searchInput.toLowerCase()) ||
        job.description.toLowerCase().includes(searchInput.toLowerCase())
      
      // Location filter - handle both location and region fields
      const jobLocation = job.location || job.region || ''
      const matchesLocation = !locationFilter || jobLocation.toLowerCase().includes(locationFilter.toLowerCase())
      
      // Compensation filter - handle both hourly_rate and hourlyRate fields
      const jobRate = job.hourly_rate || job.hourlyRate || job.salary_range || ''
      const matchesCompensation = !compensationFilter || checkCompensationMatch(jobRate, compensationFilter)

      // Job type filter - handle both jobType and job_type
      const jobType = job.jobType || job.job_type || ''
      const matchesJobType = !jobTypeFilter || jobType === jobTypeFilter
      
      // Classification filter
      const matchesClassification = !classificationFilter || job.classification === classificationFilter
      
      // Industry filters - handle both type and category
      const jobIndustry = job.type || job.category || ''
      const matchesIndustry = activeFilters.length === 0 || activeFilters.includes(jobIndustry)
      
      // Date filter
      const postedDays = job.postedDays || calculateDaysAgo(job.created_at)
      const matchesDate = !dateFilter || checkDateMatch(postedDays, dateFilter)
      
      return matchesSearch && matchesLocation && matchesCompensation && matchesJobType && matchesClassification && matchesIndustry && matchesDate
    })
    
    // Sort jobs - featured jobs should stay at top regardless of sort
    filtered.sort((a: any, b: any) => {
      const aFeatures = getJobFeatureStatus(a)
      const bFeatures = getJobFeatureStatus(b)
      
      // Always prioritize featured jobs first
      if (aFeatures.isFeatured && !bFeatures.isFeatured) return -1
      if (!aFeatures.isFeatured && bFeatures.isFeatured) return 1
      
      // Then prioritize urgent jobs
      if (aFeatures.isUrgent && !bFeatures.isUrgent) return -1
      if (!aFeatures.isUrgent && bFeatures.isUrgent) return 1
      
      // If both or neither are featured/urgent, apply the selected sort
      switch(sortBy) {
        case 'recent':
          const aDate = new Date(a.created_at || a.createdAt)
          const bDate = new Date(b.created_at || b.createdAt)
          return bDate.getTime() - aDate.getTime()
        case 'salary-high':
          return extractMaxSalary(b.hourly_rate || b.hourlyRate || b.salary_range || '') - extractMaxSalary(a.hourly_rate || a.hourlyRate || a.salary_range || '')
        case 'salary-low':
          return extractMaxSalary(a.hourly_rate || a.hourlyRate || a.salary_range || '') - extractMaxSalary(b.hourly_rate || b.hourlyRate || b.salary_range || '')
        case 'company':
          return a.company.localeCompare(b.company)
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })
    
    setFilteredJobs(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const calculateDaysAgo = (dateString: string) => {
    if (!dateString) return 0
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const extractMaxSalary = (hourlyRate: string) => {
    if (!hourlyRate) return 0
    const matches = hourlyRate.match(/\$?(\d+)(?:k|,000)?(?:\s*-\s*\$?(\d+)(?:k|,000)?)?/i)
    if (!matches) return 0
    
    const max = matches[2] ? parseInt(matches[2]) : parseInt(matches[1])
    return max * (hourlyRate.includes('k') || hourlyRate.includes(',000') ? 1000 : 1)
  }

  const checkCompensationMatch = (jobRate: string, filterRange: string) => {
    if (!jobRate) return false
    
    const matches = jobRate.match(/\$?(\d+)(?:k|,000)?(?:\s*-\s*\$?(\d+)(?:k|,000)?)?/i)
    if (!matches) return false
    
    const jobMin = parseInt(matches[1]) * (jobRate.includes('k') || jobRate.includes(',000') ? 1000 : 1)
    const jobMax = matches[2] ? parseInt(matches[2]) * (jobRate.includes('k') || jobRate.includes(',000') ? 1000 : 1) : jobMin
    
    // Convert hourly to annual for comparison if needed
    const annualMin = jobRate.includes('/hr') || jobRate.includes('hour') ? jobMin * 2080 : jobMin
    const annualMax = jobRate.includes('/hr') || jobRate.includes('hour') ? jobMax * 2080 : jobMax
    
    switch(filterRange) {
      case '0-25': return jobMax <= 25
      case '25-35': return jobMin >= 25 && jobMax <= 35
      case '35-50': return jobMin >= 35 && jobMax <= 50
      case '50-75': return jobMin >= 50 && jobMax <= 75
      case '75+': return jobMin >= 75
      default: return true
    }
  }

  const checkDateMatch = (postedDays: number, filterDays: string) => {
    const days = parseInt(filterDays)
    return postedDays <= days
  }

  const toggleFilter = (industry: string) => {
    if (activeFilters.includes(industry)) {
      setActiveFilters((prev: any) => prev.filter((f: any) => f !== industry))
    } else {
      setActiveFilters((prev: any) => [...prev, industry])
    }
  }

  const performSearch = () => {
    // Show loading state briefly for user feedback
    setIsLoading(true)
    setSearchComplete(false)
    
    // Perform the search
    filterAndSortJobs()
    
    // Auto-scroll to results after a brief delay to show loading feedback
    setTimeout(() => {
      setIsLoading(false)
      setSearchComplete(true)
      
      // Scroll to results section smoothly
      const resultsSection = document.querySelector('[data-results-section]')
      if (resultsSection) {
        resultsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }
      
      // Hide search complete notification after 3 seconds
      setTimeout(() => {
        setSearchComplete(false)
      }, 3000)
    }, 500) // Brief loading animation for user feedback
  }

  const toggleSaveJob = async (jobId: number) => {
    try {
      if (!user?.id) {
        setShowAuthModal(true)
        return
      }
      
      const job = jobs.find((j: any) => j.id === jobId)
      if (!job) {
        alert('Job not found')
        return
      }
      
      if (savedJobs.includes(jobId)) {
        // Remove from saved
        const response = await fetch(`/api/saved-jobs?userId=${user.id}&jobId=${jobId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          setSavedJobs((prev: any) => prev.filter((id: any) => id !== jobId))
          alert('Job removed from saved jobs')
        } else {
          const error = await response.json()
          alert('Error removing job: ' + error.error)
        }
      } else {
        // Add to saved
        const response = await fetch('/api/saved-jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            jobId: jobId,
            jobData: job
          }),
        })
        
        if (response.ok) {
          setSavedJobs((prev: any) => [...prev, jobId])
          alert('Job saved successfully! View it in your dashboard.')
        } else {
          const error = await response.json()
          if (error.error === 'Job already saved') {
            setSavedJobs((prev: any) => [...prev, jobId])
            alert('Job was already saved!')
          } else {
            alert('Error saving job: ' + error.error)
          }
        }
      }
    } catch (error) {
      console.error('Error toggling save job:', error)
      alert('Error saving job')
    }
  }

  const applyToJob = (job: any) => {
    if (!user?.id) {
      setShowAuthModal(true)
      return
    }
    
    if (appliedJobs.includes(job.id)) {
      alert('You have already applied to this job!')
      return
    }
    
    setSelectedJob(job)
    setApplicationForm({
      firstName: '',
      lastName: '',
      email: user.email || '',
      phone: '',
      classification: '',
    })
    setShowApplicationModal(true)
  }

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id || !selectedJob) return
    
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          userId: user.id,
          firstName: applicationForm.firstName,
          lastName: applicationForm.lastName,
          email: applicationForm.email,
          phone: applicationForm.phone,
          classification: applicationForm.classification,
        }),
      })
      
      if (response.ok) {
        setAppliedJobs((prev: any) => [...prev, selectedJob.id])
        alert('🎉 Application submitted successfully! The employer will review your application and contact you if selected.')
        setShowApplicationModal(false)
        setSelectedJob(null)
        setApplicationForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          classification: '',
        })
      } else {
        const error = await response.json()
        
        // Handle duplicate application error specifically
        if (response.status === 409) {
          alert('❌ You have already applied to this job! Check your dashboard to see your application status.')
          setAppliedJobs((prev: any) => [...prev, selectedJob.id])  // Add to local state
          setShowApplicationModal(false)
          setSelectedJob(null)
        } else {
          alert('Error submitting application: ' + error.error)
        }
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Error submitting application')
    }
  }

  const createJobAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) {
      setShowAuthModal(true)
      return
    }
    
    try {
      const response = await fetch('/api/job-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: alertForm.name,
          keywords: alertForm.keywords,
          region: alertForm.region,
          industry: alertForm.industry,
          classification: alertForm.classification,
          salary: alertForm.salary,
          frequency: alertForm.frequency
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        alert('🎉 ' + data.message)
        setAlertForm({
          name: '',
          keywords: '',
          region: '',
          industry: '',
          classification: '',
          salary: '',
          frequency: 'daily'
        })
        setShowAlertModal(false)
      } else {
        const error = await response.json()
        alert('Error creating job alert: ' + error.error)
      }
    } catch (error) {
      console.error('Error creating job alert:', error)
      alert('Error creating job alert')
    }
  }

  const showJobDetails = (job: any) => {
    setSelectedJob(job)
    setShowJobDetailModal(true)
  }

  const getPostedText = (job: any) => {
    const days = job.postedDays || calculateDaysAgo(job.created_at)
    if (days === 1) return 'Posted 1 day ago'
    if (days < 7) return `Posted ${days} days ago`
    if (days < 30) return `Posted ${Math.floor(days/7)} week${Math.floor(days/7) > 1 ? 's' : ''} ago`
    return 'Posted over a month ago'
  }

  const getBadgeText = (badge: string) => {
    switch(badge) {
      case 'featured': return 'Featured'
      case 'urgent': return 'Urgent'
      case 'high-pay': return 'High Pay'
      case 'popular': return 'Popular'
      default: return badge
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setLocationFilter('')
    setCompensationFilter('')
    setJobTypeFilter('')
    setClassificationFilter('')
    setDateFilter('')
    setActiveFilters([])
  }

  // Pagination
  const indexOfLastJob = currentPage * jobsPerPage
  const indexOfFirstJob = indexOfLastJob - jobsPerPage
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob)
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage)

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ margin: 0, padding: 0, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', background: '#f5f5f5' }}>
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        div::-webkit-scrollbar {
          height: 8px;
        }
        div::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 10px;
        }
        div::-webkit-scrollbar-thumb {
          background: #ff6b35;
          border-radius: 10px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #e55a25;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Thin Free Job Notification Bar */}
      {shouldShowThinBanner() && freeJobEligible && user && (
        <div style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', 
          color: 'white', 
          padding: '0.75rem 2rem', 
          textAlign: 'center',
          position: 'relative',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          🎁 Post Your First Job Free - 30 days of visibility at no cost
          <button
            onClick={handleEmployerBannerClick}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '600',
              marginLeft: '1rem',
              cursor: 'pointer'
            }}
          >
            Get Started
          </button>
          <button
            onClick={() => setShowEmployerBanner(false)}
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

      {/* For non-logged in users */}
      {shouldShowThinBanner() && !user && (
        <div style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', 
          color: 'white', 
          padding: '0.75rem 2rem', 
          textAlign: 'center',
          position: 'relative',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          🎁 Employers: Post Your First Job Free - 30 days of visibility, no credit card required
          <button
            onClick={handleEmployerBannerClick}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '600',
              marginLeft: '1rem',
              cursor: 'pointer'
            }}
          >
            Sign Up Free
          </button>
          <button
            onClick={() => setShowEmployerBanner(false)}
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

      {/* Search Hero */}
      <div style={{ background: '#1a1a1a', color: 'white', padding: '4rem 2rem', textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', margin: 0 }}>Find Your Next Technical Opportunity</h1>
        <p style={{ margin: '1rem 0 2rem 0' }}>Connect with top employers in nuclear, energy, aerospace, defense, and technical industries</p>
        
        {/* Simplified Search - One Line */}
        <div style={{ display: 'flex', gap: '0', maxWidth: '800px', margin: '2rem auto 0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search jobs by title, company, or keywords..."
            style={{ 
              flex: 1, 
              padding: '1rem 1.5rem', 
              border: 'none',
              fontSize: '1.1rem', 
              outline: 'none',
              backgroundColor: 'white',
              color: 'black'
            }}
          />
          <button
            onClick={performSearch}
            style={{ 
              padding: '1rem 2.5rem', 
              background: '#ff6b35', 
              color: 'white', 
              border: 'none',
              cursor: 'pointer', 
              fontSize: '1.1rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#e55a2b'}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#ff6b35'}
          >
            🔍 Search Jobs
          </button>
        </div>

        {/* Industry Filters - Horizontal Scrollable Carousel */}
        <div style={{ position: 'relative', marginTop: '2rem' }}>
          {/* Left Arrow */}
          <button
            onClick={() => {
              const container = document.getElementById('industry-carousel')
              if (container) {
                container.scrollBy({ left: -200, behavior: 'smooth' })
              }
            }}
            style={{
              position: 'absolute',
              left: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            ‹
          </button>
          
          {/* Right Arrow */}
          <button
            onClick={() => {
              const container = document.getElementById('industry-carousel')
              if (container) {
                container.scrollBy({ left: 200, behavior: 'smooth' })
              }
            }}
            style={{
              position: 'absolute',
              right: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            ›
          </button>
          
          <div 
            id="industry-carousel"
            style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              overflowX: 'auto',
              padding: '1rem',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            className="scrollbar-hide"
          >
            {[
              { key: 'nuclear', label: 'Nuclear Power', icon: '❄️' },
              { key: 'power-generation', label: 'Power Gen (Fossil)', icon: '⚡' },
              { key: 'ogc', label: 'OG&C', icon: '🛢️' },
              { key: 'offshore', label: 'Offshore', icon: '🚢' },
              { key: 'renewable', label: 'Renewable', icon: '🌱' },
              { key: 'construction', label: 'Construction', icon: '🏗️' },
              { key: 'aerospace', label: 'Aerospace', icon: '🚀' },
              { key: 'defense', label: 'Defense', icon: '🛡️' },
              { key: 'electric-td', label: 'Electric T&D', icon: '⚡' },
              { key: 'pulp-paper', label: 'Pulp & Paper', icon: '📄' },
              { key: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
              { key: 'mining', label: 'Mining', icon: '⛏️' }
            ].map((industry) => (
              <button
                key={industry.key}
                onClick={() => {
                  toggleFilter(industry.key)
                  performSearch()
                }}
                style={{
                  minWidth: '140px',
                  padding: '1rem',
                  background: activeFilters.includes(industry.key) ? '#ff6b35' : '#1a1a1a',
                  color: 'white',
                  border: '2px solid #ff6b35',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  if (!activeFilters.includes(industry.key)) {
                    (e.target as HTMLButtonElement).style.background = '#333'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!activeFilters.includes(industry.key)) {
                    (e.target as HTMLButtonElement).style.background = '#1a1a1a'
                  }
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{industry.icon}</span>
                <span>{industry.label}</span>
              </button>
            ))}
          </div>
        </div>        
        
        {/* UPDATED: Search hero buttons section */}
        <div style={{ marginTop: '2rem' }}>
          <p style={{ marginBottom: '1rem' }}>Want jobs delivered to your inbox?</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setShowAlertModal(true)}
              style={{ background: '#28a745', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              📧 Set Up Job Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Search Complete Notification */}
      {searchComplete && (
        <div style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          background: '#28a745', 
          color: 'white', 
          padding: '1rem 1.5rem', 
          borderRadius: '8px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <span style={{ fontWeight: '500' }}>Search completed! Found {filteredJobs.length} jobs</span>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        {/* Filters Container */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '10px', marginBottom: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>

          {/* Advanced Filters */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>Job Type</label>
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.9rem' }}
              >
                <option value="">All Types</option>
                <option value="in-house">In-house</option>
                <option value="project-hire">Project Hire</option>
                <option value="1099">1099 Contract</option>
                <option value="temp-perm">Temp-to-Perm</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>Experience Level</label>
                  <select
                    value={classificationFilter}
                    onChange={(e) => setClassificationFilter(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.9rem' }}
                  >
                    <option value="">All Experience Levels</option>
                    <option value="junior">Junior (0-5 years)</option>
                    <option value="intermediate">Intermediate (5-10 years)</option>
                    <option value="senior">Senior (10-15 years)</option>
                    <option value="expert">Expert (15+ years)</option>
                    <option value="specialist">Specialist</option>
                  </select>
                </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>Posted Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.9rem' }}
              >
                <option value="">Any Time</option>
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>&nbsp;</label>
              <button
                onClick={clearFilters}
                style={{ padding: '0.5rem', background: 'transparent', color: '#ff6b35', border: '2px solid #ff6b35', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Results Header */}
        <div data-results-section style={{ background: 'white', padding: '2rem', borderRadius: '10px', marginBottom: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#1a1a1a', fontWeight: '700' }}>
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #ff6b35', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Loading Jobs...
                  </span>
                ) : (
                  <span style={{ color: filteredJobs.length === 0 ? '#666' : '#ff6b35' }}>
                    {filteredJobs.length === 0 ? 'No Jobs Found' : `${filteredJobs.length} Job${filteredJobs.length === 1 ? '' : 's'} Available`}
                  </span>
                )}
              </h2>
              {filteredJobs.length > 0 && (
                <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '1rem' }}>
                  Showing {indexOfFirstJob + 1}-{Math.min(indexOfLastJob, filteredJobs.length)} of {filteredJobs.length} results
                </p>
              )}
            </div>
            {filteredJobs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500', color: '#333', fontSize: '0.9rem' }}>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                >
                  <option value="recent">Most Recent</option>
                  <option value="salary-high">Compensation: High to Low</option>
                  <option value="salary-low">Compensation: Low to High</option>
                  <option value="company">Company A-Z</option>
                  <option value="title">Job Title A-Z</option>
                </select>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {(searchInput || activeFilters.length > 0 || locationFilter || compensationFilter) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontWeight: '500', color: '#333', fontSize: '0.9rem' }}>Active filters:</span>
              {searchInput && (
                <span style={{ background: '#e8f4fd', color: '#1976d2', padding: '0.25rem 0.75rem', borderRadius: '15px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔍 "{searchInput}"
                  <button onClick={() => setSearchInput('')} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', padding: '0', fontSize: '12px' }}>✕</button>
                </span>
              )}
              {activeFilters.map(filter => (
                <span key={filter} style={{ background: '#fff3e0', color: '#f57c00', padding: '0.25rem 0.75rem', borderRadius: '15px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {filter.replace('-', ' ')}
                  <button onClick={() => toggleFilter(filter)} style={{ background: 'none', border: 'none', color: '#f57c00', cursor: 'pointer', padding: '0', fontSize: '12px' }}>✕</button>
                </span>
              ))}
              <button 
                onClick={() => {
                  setSearchInput('')
                  setActiveFilters([])
                  setLocationFilter('')
                  setCompensationFilter('')
                  performSearch()
                }}
                style={{ background: '#ff6b35', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '15px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', fontWeight: '500' }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* UPDATED: Job Listings - Single Column Layout for Better Readability */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <div>Loading the latest job opportunities...</div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <h3>No jobs found</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>Try adjusting your search criteria or filters</p>
              <button
                onClick={() => setShowAlertModal(true)}
                style={{ background: '#ff6b35', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Create Job Alert for These Criteria
              </button>
            </div>
          ) : (
            currentJobs.map((job: any) => {
              const features = getJobFeatureStatus(job)
              const { isFeatured, isUrgent } = features
              const isFreeJob = job.is_free_job && job.free_job_expires_at
              
              return (
                <div
                  key={job.id}
                  onClick={() => showJobDetails(job)}
                  style={{
                    background: isFeatured 
                      ? 'linear-gradient(135deg, #fff5f0 0%, #ffffff 100%)' 
                      : isFreeJob
                        ? 'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)'
                        : 'white',
                    border: isFeatured 
                      ? '2px solid #ffd700' 
                      : isUrgent 
                        ? '2px solid #ff4444' 
                        : isFreeJob
                          ? '2px solid #22c55e'
                          : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    boxShadow: isFeatured 
                      ? '0 4px 20px rgba(255, 215, 0, 0.15)' 
                      : isUrgent 
                        ? '0 4px 20px rgba(255, 68, 68, 0.15)' 
                        : isFreeJob
                          ? '0 4px 20px rgba(34, 197, 94, 0.15)'
                          : '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = isFeatured 
                      ? '0 8px 25px rgba(255, 215, 0, 0.2)' 
                      : isUrgent 
                        ? '0 8px 25px rgba(255, 68, 68, 0.2)' 
                        : isFreeJob
                          ? '0 8px 25px rgba(34, 197, 94, 0.2)'
                          : '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = isFeatured 
                      ? '0 4px 20px rgba(255, 215, 0, 0.15)' 
                      : isUrgent 
                        ? '0 4px 20px rgba(255, 68, 68, 0.15)' 
                        : isFreeJob
                          ? '0 4px 20px rgba(34, 197, 94, 0.15)'
                          : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  
                  {/* NEW: Add free job badge */}
                  {isFreeJob && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: isFeatured ? '120px' : '20px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '15px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                      border: '2px solid #fff'
                    }}>
                      🎁 NEW EMPLOYER
                    </div>
                  )}
                  
                  {/* Featured Badge */}
                  {isFeatured && (
                    <div style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '20px',
                      background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                      color: '#b8860b',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                      border: '2px solid #fff'
                    }}>
                      ⭐ FEATURED
                    </div>
                  )}
                  
                  {/* Urgent Badge */}
                  {isUrgent && (
                    <div style={{
                      position: 'absolute',
                      top: isFeatured ? '-15px' : '-12px',
                      right: '20px',
                      background: 'linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%)',
                      color: 'white',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '15px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 15px rgba(255, 68, 68, 0.4)',
                      border: '2px solid #fff',
                      animation: 'pulse 2s infinite'
                    }}>
                      🚨 URGENT
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '1rem', marginTop: (isFeatured || isUrgent || isFreeJob) ? '1rem' : '0' }}>
                    {/* Legacy badges support */}
                    {job.badges?.filter((badge: string) => badge !== 'featured' && badge !== 'urgent').map((badge: string) => (
                      <span
                        key={badge}
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          marginRight: '0.5rem',
                          background: badge === 'high-pay' ? '#00d4aa' : '#1a1a1a',
                          color: 'white'
                        }}
                      >
                        {getBadgeText(badge)}
                      </span>
                    ))}
                    {appliedJobs.includes(job.id) && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        marginRight: '0.5rem',
                        background: '#28a745',
                        color: 'white'
                      }}>
                        Applied
                      </span>
                    )}
                  </div>
                  
                  {/* Header Section */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: isFeatured ? '1.3rem' : '1.2rem', 
                        fontWeight: '700', 
                        color: '#1f2937',
                        marginBottom: '0.25rem',
                        lineHeight: '1.3'
                      }}>
                        {job.title}
                      </div>
                      <div style={{ 
                        fontSize: '1rem', 
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        {job.company}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#6b7280',
                      textAlign: 'right'
                    }}>
                      {getPostedText(job)}
                    </div>
                  </div>

                  {/* Job Details Row */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '2rem', 
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#4b5563',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>💰</span>
                      <span style={{ fontWeight: '600' }}>
                        {job.hourly_rate || job.hourlyRate || job.salary_range || 'Competitive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>📍</span>
                      <span>{job.region || job.location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>💼</span>
                      <span>{job.jobType || job.job_type || 'Full Time'}</span>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div style={{ 
                    color: '#4b5563', 
                    lineHeight: '1.5', 
                    fontSize: '0.9rem',
                    marginBottom: '1rem'
                  }}>
                    {job.description.substring(0, 200)}...
                  </div>
                  
                  {/* Footer */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          applyToJob(job)
                        }}
                        disabled={appliedJobs.includes(job.id)}
                        style={{ 
                          background: appliedJobs.includes(job.id) 
                            ? '#6b7280' 
                            : isFeatured 
                              ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' 
                              : '#ff6b35', 
                          color: appliedJobs.includes(job.id) 
                            ? 'white' 
                            : isFeatured 
                              ? '#b8860b' 
                              : 'white',
                          padding: '0.75rem 1.5rem', 
                          border: 'none', 
                          borderRadius: '6px', 
                          cursor: appliedJobs.includes(job.id) ? 'not-allowed' : 'pointer', 
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          opacity: appliedJobs.includes(job.id) ? 0.6 : 1,
                          boxShadow: isFeatured ? '0 2px 8px rgba(255, 215, 0, 0.3)' : '0 2px 4px rgba(255, 107, 53, 0.2)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {appliedJobs.includes(job.id) ? 'Applied' : 'Apply Now'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSaveJob(job.id)
                        }}
                        style={{
                          background: savedJobs.includes(job.id) ? '#ff6b35' : 'transparent',
                          color: savedJobs.includes(job.id) ? 'white' : '#ff6b35',
                          border: '2px solid #ff6b35',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {savedJobs.includes(job.id) ? 'Saved' : 'Save Job'}
                      </button>
                    </div>
                    <div style={{ 
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      Click anywhere to view details
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', padding: '2rem' }}>
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                background: currentPage === 1 ? '#f5f5f5' : 'white',
                opacity: currentPage === 1 ? 0.6 : 1
              }}
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => paginate(pageNum)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    background: currentPage === pageNum ? '#ff6b35' : 'white',
                    color: currentPage === pageNum ? 'white' : 'black',
                    fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                background: currentPage === totalPages ? '#f5f5f5' : 'white',
                opacity: currentPage === totalPages ? 0.6 : 1
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* All existing modals remain the same... */}
      {/* Enhanced Job Alert Modal */}
      {showAlertModal && (
        <div style={{ position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', margin: '5% auto', padding: '2rem', borderRadius: '10px', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Create Job Alert</h2>
              <button
                onClick={() => setShowAlertModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>Get notified when jobs matching your preferences are posted!</p>
            
            <form onSubmit={createJobAlert}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Alert Name *</label>
                <input
                  type="text"
                  value={alertForm.name}
                  onChange={(e) => setAlertForm((prev: any) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Senior Engineering Roles"
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Keywords</label>
                  <input
                    type="text"
                    value={alertForm.keywords}
                    onChange={(e) => setAlertForm((prev: any) => ({ ...prev, keywords: e.target.value }))}
                    placeholder="engineer, drilling, offshore"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Region</label>
                  <select
                    value={alertForm.region}
                    onChange={(e) => setAlertForm((prev: any) => ({ ...prev, region: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  >
                    <option value="">Any Region</option>
                    <option value="northeast">Northeast US</option>
                    <option value="southeast">Southeast US</option>
                    <option value="midwest">Midwest US</option>
                    <option value="southwest">Southwest US</option>
                    <option value="west">West US</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Industry</label>
                  <select
                    value={alertForm.industry}
                    onChange={(e) => setAlertForm((prev: any) => ({ ...prev, industry: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  >
                    <option value="">Any Industry</option>
                    <option value="nuclear">Nuclear Power</option>
                    <option value="petrochem">Petro-Chem</option>
                    <option value="alt-energy">Alt Energy</option>
                    <option value="power-generation">Power Generation</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Experience</label>
                  <select
                    value={alertForm.classification}
                    onChange={(e) => setAlertForm((prev: any) => ({ ...prev, classification: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  >
                    <option value="">Any Level</option>
                    <option value="junior">Junior</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="senior">Senior</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Frequency *</label>
                  <select
                    value={alertForm.frequency}
                    onChange={(e) => setAlertForm((prev: any) => ({ ...prev, frequency: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="immediate">Immediate</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'end', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  style={{ padding: '0.75rem 1.5rem', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', background: 'white' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#ff6b35', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Create Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && selectedJob && (
        <div style={{ position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', margin: '5% auto', padding: '2rem', borderRadius: '10px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Apply for: {selectedJob.title}</h2>
              <button
                onClick={() => setShowApplicationModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            
            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '5px', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 'bold' }}>{selectedJob.company}</div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                {selectedJob.region || selectedJob.location} • {selectedJob.hourlyRate || selectedJob.salary_range}
              </div>
            </div>
            
            <form onSubmit={submitApplication}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>First Name *</label>
                  <input
                    type="text"
                    value={applicationForm.firstName}
                    onChange={(e) => setApplicationForm((prev: any) => ({ ...prev, firstName: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Last Name *</label>
                  <input
                    type="text"
                    value={applicationForm.lastName}
                    onChange={(e) => setApplicationForm((prev: any) => ({ ...prev, lastName: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email *</label>
                <input
                  type="email"
                  value={applicationForm.email}
                  onChange={(e) => setApplicationForm((prev: any) => ({ ...prev, email: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone *</label>
                <input
                  type="tel"
                  value={applicationForm.phone}
                  onChange={(e) => setApplicationForm((prev: any) => ({ ...prev, phone: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Resume Status Indicator */}
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '5px', fontSize: '0.9rem' }}>
                📄 Resume: <span style={{ color: '#007bff', fontWeight: '500' }}>Will be automatically attached from your profile</span>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  No resume on file? <Link href="/dashboard?tab=profile" style={{ color: '#ff6b35' }}>Upload one in your dashboard</Link>
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Experience Level *</label>
                <select
                  value={applicationForm.classification}
                  onChange={(e) => setApplicationForm((prev: any) => ({ ...prev, classification: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px' }}
                >
                  <option value="">Select Experience Level</option>
                  <option value="junior">Junior (0-5 years)</option>
                  <option value="intermediate">Intermediate (5-10 years)</option>
                  <option value="senior">Senior (10-15 years)</option>
                  <option value="expert">Expert (15+ years)</option>
                  <option value="specialist">Specialist</option>
                </select>
              </div>
                            
              <div style={{ display: 'flex', justifyContent: 'end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowApplicationModal(false)}
                  style={{ padding: '0.75rem 1.5rem', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', background: 'white' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#ff6b35', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobDetailModal && selectedJob && (
        <div style={{ position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', margin: '5% auto', padding: '2rem', borderRadius: '10px', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>{selectedJob.title}</h2>
              <button
                onClick={() => setShowJobDetailModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            
            <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '5px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div><strong>Company:</strong> {selectedJob.company}</div>
                <div><strong>Location:</strong> {selectedJob.location || selectedJob.region}</div>
                <div><strong>Hourly Rate:</strong> {selectedJob.hourly_rate || selectedJob.hourlyRate || selectedJob.salary_range}</div>
                <div><strong>Job Type:</strong> {selectedJob.jobType || selectedJob.job_type}</div>
                <div><strong>Experience:</strong> {selectedJob.classification}</div>
                <div><strong>Posted:</strong> {getPostedText(selectedJob)}</div>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3>Job Description</h3>
              <p style={{ lineHeight: 1.6, color: '#555' }}>{selectedJob.description}</p>
            </div>
            
            {selectedJob.requirements && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Requirements</h3>
                <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#555' }}>{selectedJob.requirements}</pre>
              </div>
            )}
            
            {selectedJob.benefits && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Benefits</h3>
                <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#555' }}>{selectedJob.benefits}</pre>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={() => {
                  setShowJobDetailModal(false)
                  applyToJob(selectedJob)
                }}
                disabled={appliedJobs.includes(selectedJob.id)}
                style={{ 
                  background: appliedJobs.includes(selectedJob.id) ? '#6c757d' : '#ff6b35', 
                  color: 'white', 
                  padding: '0.75rem 1.5rem', 
                  border: 'none', 
                  borderRadius: '5px', 
                  cursor: appliedJobs.includes(selectedJob.id) ? 'not-allowed' : 'pointer', 
                  fontWeight: '500',
                  opacity: appliedJobs.includes(selectedJob.id) ? 0.6 : 1
                }}
              >
                {appliedJobs.includes(selectedJob.id) ? 'Applied' : 'Apply Now'}
              </button>
              <button
                onClick={() => {
                  setShowJobDetailModal(false)
                  toggleSaveJob(selectedJob.id)
                }}
                style={{
                  background: savedJobs.includes(selectedJob.id) ? '#ff6b35' : 'transparent',
                  color: savedJobs.includes(selectedJob.id) ? 'white' : '#ff6b35',
                  border: '2px solid #ff6b35',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {savedJobs.includes(selectedJob.id) ? 'Saved' : 'Save Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '10px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Login Required</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>Please log in to save jobs and apply for positions.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                <button style={{ background: '#ff6b35', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '500' }}>
                  Login
                </button>
              </Link>
              <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'transparent', color: '#ff6b35', border: '2px solid #ff6b35', padding: '0.75rem 1.5rem', borderRadius: '5px', cursor: 'pointer', fontWeight: '500' }}>
                  Sign Up
                </button>
              </Link>
            </div>
            <button
              onClick={() => setShowAuthModal(false)}
              style={{ background: 'none', border: 'none', color: '#666', marginTop: '1rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
