'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function JobSeekerDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [showLinkedInResumePrompt, setShowLinkedInResumePrompt] = useState(false)
  
  // Data states with proper types
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [appliedJobs, setAppliedJobs] = useState<any[]>([])
  const [jobAlerts, setJobAlerts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>({})
  const [messages, setMessages] = useState<any[]>([])
  
  // Modal states
  const [showAlertModal, setShowAlertModal] = useState(false)
  
  // New alert form
  const [newAlert, setNewAlert] = useState({
    name: '',
    keywords: '',
    region: '',
    industry: '',
    classification: '',
    frequency: 'daily'
  })

  const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
      console.log('Dashboard useEffect - user:', user)
      console.log('Dashboard useEffect - loading:', loading)
      
      if (!loading && !user) {
        console.log('No user found, redirecting to login')
        router.push('/auth/login')
        return
      }
      
      if (user) {
        console.log('User found, loading dashboard data')
        loadDashboardData()
        
        // Auto-refresh applied jobs every 45 seconds to see status updates
        const interval = setInterval(() => {
          loadAppliedJobs()
        }, 45000)
        
        return () => clearInterval(interval)
      }
    }, [user, loading, router])

    // Check for LinkedIn resume prompt and auto-fill data
    useEffect(() => {
      try {
        // Check for OAuth resume prompt (LinkedIn or Google)
        const oauthPrompt = localStorage.getItem('oauth_resume_prompt')
        const linkedinPrompt = localStorage.getItem('linkedin_resume_prompt')
        
        if ((oauthPrompt === 'true' || linkedinPrompt === 'true') && !profile.resumeUploaded) {
          setShowLinkedInResumePrompt(true)
          localStorage.removeItem('oauth_resume_prompt')
          localStorage.removeItem('linkedin_resume_prompt')
        }

        // Auto-fill profile with LinkedIn data
        const linkedinData = localStorage.getItem('linkedin_profile_data')
        // Auto-fill profile with Google data
        const googleData = localStorage.getItem('google_profile_data')
        if (linkedinData && profile.id) {
          try {
            const data = JSON.parse(linkedinData)
            console.log('Auto-filling profile with LinkedIn data:', data)
            console.log('Current profile state:', profile)
            
            // Update profile state if fields are empty or have default values
            const shouldUpdate = 
              !profile.first_name || 
              profile.first_name === 'Job' || 
              !profile.last_name || 
              profile.last_name === 'Seeker' ||
              !profile.linkedin_url

            if (shouldUpdate) {
              console.log('Updating profile with LinkedIn data...')
              setProfile((prev: any) => ({
                ...prev,
                first_name: (prev.first_name === 'Job' || !prev.first_name) ? data.firstName : prev.first_name,
                last_name: (prev.last_name === 'Seeker' || !prev.last_name) ? data.lastName : prev.last_name,
                email: prev.email || data.email,
                linkedin_url: prev.linkedin_url || data.linkedinUrl
              }))
              
            // Also save to backend immediately after state update
            const updatedProfile = {
              ...profile,
              first_name: (profile.first_name === 'Job' || !profile.first_name) ? data.firstName : profile.first_name,
              last_name: (profile.last_name === 'Seeker' || !profile.last_name) ? data.lastName : profile.last_name,
              firstName: (profile.first_name === 'Job' || !profile.first_name) ? data.firstName : profile.first_name,
              lastName: (profile.last_name === 'Seeker' || !profile.last_name) ? data.lastName : profile.last_name,
              email: profile.email || data.email,
              linkedin_url: profile.linkedin_url || data.linkedinUrl
            }
            
            // Update state first, then save (setTimeout ensures state is updated)
            setProfile(updatedProfile)
            setTimeout(() => saveProfile(), 100)
            }
            
            // Clear the stored data after using it
            localStorage.removeItem('linkedin_profile_data')
          } catch (err) {
            console.error('Error parsing LinkedIn data:', err)
          }
        }
        
        // Auto-fill with Google data if available
        if (googleData && profile.id) {
          try {
            const data = JSON.parse(googleData)
            console.log('Auto-filling profile with Google data:', data)
            console.log('Current profile state:', profile)
            
            // Update profile state if fields are empty or have default values
            const shouldUpdate = 
              !profile.first_name || 
              profile.first_name === 'Job' || 
              !profile.last_name || 
              profile.last_name === 'Seeker'

            if (shouldUpdate) {
              console.log('Updating profile with Google data...')
              const updatedProfile = {
                ...profile,
                first_name: (profile.first_name === 'Job' || !profile.first_name) ? data.firstName : profile.first_name,
                last_name: (profile.last_name === 'Seeker' || !profile.last_name) ? data.lastName : profile.last_name,
                firstName: (profile.first_name === 'Job' || !profile.first_name) ? data.firstName : profile.first_name,
                lastName: (profile.last_name === 'Seeker' || !profile.last_name) ? data.lastName : profile.last_name,
                email: profile.email || data.email
              }
              
              // Update state first, then save (setTimeout ensures state is updated)
              setProfile(updatedProfile)
              setTimeout(() => saveProfile(), 100)
            }
            
            // Clear the stored data after using it
            localStorage.removeItem('google_profile_data')
          } catch (err) {
            console.error('Error parsing Google data:', err)
          }
        }
      } catch (err) {
        console.error('Error processing OAuth data:', err)
      }
    }, [profile.resumeUploaded, profile.id])

  // PERMANENT FIX: Check for LinkedIn users on every page load
  useEffect(() => {
    const checkLinkedInProfile = async () => {
      if (!user || !profile.id) return
      
      try {
        // Check if this is a LinkedIn user with incorrect data
        const { data: userData } = await supabase.auth.getUser()
        const isLinkedInUser = userData?.user?.app_metadata?.provider === 'linkedin_oidc'
        
        if (isLinkedInUser && (profile.first_name === 'Job' || profile.last_name === 'Seeker')) {
          console.log('🔧 Detected LinkedIn user with incorrect profile data, fixing...')
          
          const userMetadata = userData?.user?.user_metadata || {}
          const correctedProfile = {
            ...profile,
            first_name: userMetadata.given_name || userMetadata.first_name || profile.first_name,
            last_name: userMetadata.family_name || userMetadata.last_name || profile.last_name,
            firstName: userMetadata.given_name || userMetadata.first_name || profile.first_name,
            lastName: userMetadata.family_name || userMetadata.last_name || profile.last_name,
            linkedin_url: profile.linkedin_url || userMetadata.profile_url || userMetadata.linkedin_url || ''
          }
          
          if (correctedProfile.first_name !== profile.first_name || correctedProfile.last_name !== profile.last_name) {
            setProfile(correctedProfile)
            // Use setTimeout to ensure state is updated before saving
            setTimeout(() => saveProfile(), 100)
            console.log('✅ LinkedIn profile corrected automatically')
          }
        }
      } catch (error) {
        console.error('Error checking LinkedIn profile:', error)
      }
    }
    
    checkLinkedInProfile()
  }, [user, profile.id, profile.first_name, profile.last_name])

    // URL tab detection - separate useEffect
    useEffect(() => {
      // Check URL for tab parameter
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      if (tabParam && ['overview', 'saved', 'applied', 'alerts', 'profile'].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }, [])

  const loadDashboardData = async () => {
    if (!user?.id) return // Add null check
    
    try {
      setIsLoading(true)
      
      // Load real saved jobs from API
      let realSavedJobs: any[] = []
      try {
        const response = await fetch(`/api/saved-jobs?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          realSavedJobs = data.savedJobs.map((saved: any) => ({
            id: saved.jobs.id,
            title: saved.jobs.title,
            company: saved.jobs.company,
            region: saved.jobs.region,
            hourlyRate: saved.jobs.hourly_rate,
            savedDate: new Date(saved.created_at).toLocaleDateString(),
            status: saved.jobs.status || 'active'
          }))
        }
      } catch (error) {
        console.error('Error loading saved jobs:', error)
        // Keep empty array if error
      }
      
      // Load real applied jobs from API
      let realAppliedJobs: any[] = []
      try {
        const appliedResponse = await fetch(`/api/applied-jobs?userId=${user.id}`)
        if (appliedResponse.ok) {
          const appliedData = await appliedResponse.json()
          realAppliedJobs = appliedData.appliedJobs.map((app: any) => ({
            id: app.jobs.id,
            title: app.jobs.title,
            company: app.jobs.company,
            region: app.jobs.region,
            hourlyRate: app.jobs.hourly_rate,
            appliedDate: new Date(app.created_at).toLocaleDateString(),
            status: app.status,
            applicationStatus: app.status === 'new' ? 'Under Review' : 
                              app.status === 'shortlisted' ? 'Shortlisted' :
                              app.status === 'interviewed' ? 'Interview Scheduled' :
                              app.status === 'rejected' ? 'Not Selected' : 'Under Review'
          }))
        }
      } catch (error) {
        console.error('Error loading applied jobs:', error)
        // Keep empty array if error
      }
      
      // Load real job alerts from API
      let realJobAlerts: any[] = []
      try {
        const alertsResponse = await fetch(`/api/job-alerts?userId=${user.id}`)
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json()
          realJobAlerts = alertsData.jobAlerts.map((alert: any) => ({
            id: alert.id,
            name: alert.name,
            keywords: alert.keywords,
            region: alert.region,
            industry: alert.industry,
            classification: alert.classification,
            frequency: alert.frequency,
            active: alert.active,
            created: new Date(alert.created_at).toLocaleDateString(),
            lastSent: alert.last_sent ? new Date(alert.last_sent).toLocaleDateString() : 'Never',
            matchesCount: alert.matches_count || 0,
            totalSent: alert.total_sent || 0
          }))
        }
      } catch (error) {
        console.error('Error loading job alerts:', error)
        // Keep empty array if error
      }
      
      // Load real profile data with proper fallbacks
      let realProfile = {
        firstName: 'Job',  // ← Default fallback, not email-derived
        lastName: 'Seeker',
        email: user.email,
        phone: '',
        location: '',
        classification: '',
        specialization: '',
        resumeUploaded: false
      }

      try {
        const profileResponse = await fetch(`/api/profile?userId=${user.id}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (profileData.profile) {
            realProfile = {
              firstName: profileData.profile.first_name || 'Job',  // ← Use clean fallbacks
              lastName: profileData.profile.last_name || 'Seeker',
              email: user.email,
              phone: profileData.profile.phone || '',
              location: profileData.profile.location || '',
              classification: profileData.profile.classification || '',
              specialization: profileData.profile.specialization || '',
              resumeUploaded: !!profileData.profile.resume_url
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        // realProfile already has good defaults
      }
      
      // Mock messages for now
      const mockMessages = [
        {
          id: 1,
          from: 'Energy Solutions Corp',
          subject: 'Your Application - Nuclear Reactor Operator',
          message: 'Thank you for your application. We will review and get back to you within 5 business days.',
          date: '2024-01-15',
          read: false
        }
      ]
      
      setSavedJobs(realSavedJobs)
      setAppliedJobs(realAppliedJobs)
      setJobAlerts(realJobAlerts)
      setProfile(realProfile)
      setMessages(mockMessages)
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!user?.id) return // Add null check
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          location: profile.location,
          classification: profile.classification,
          specialization: profile.specialization
        }),
      })
      
      if (response.ok) {
        alert('✅ Profile saved successfully!')
      } else {
        const error = await response.json()
        alert('Error saving profile: ' + error.error)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile')
    }
  }

  const updateProfile = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document (.pdf, .doc, .docx)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('resume', file)
      formData.append('userId', user.id)

      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        // Update profile state
        setProfile((prev: any) => ({
          ...prev,
          resumeUploaded: true,
          resumeUrl: data.resumeUrl
        }))
        alert('✅ Resume uploaded successfully!')
      } else {
        const error = await response.json()
        alert('Error uploading resume: ' + error.error)
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
      alert('Error uploading resume')
    } finally {
      setIsUploading(false)
    }
  }

  const createJobAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) return // Add null check
    
    try {
      const response = await fetch('/api/job-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: newAlert.name,
          keywords: newAlert.keywords,
          region: newAlert.region,
          industry: newAlert.industry,
          classification: newAlert.classification,
          salary: '',
          frequency: newAlert.frequency
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Add to local state
        const newAlertData = {
          id: data.jobAlert.id,
          name: data.jobAlert.name,
          keywords: data.jobAlert.keywords,
          region: data.jobAlert.region,
          industry: data.jobAlert.industry,
          classification: data.jobAlert.classification,
          frequency: data.jobAlert.frequency,
          active: data.jobAlert.active,
          created: new Date(data.jobAlert.created_at).toLocaleDateString(),
          lastSent: 'Never',
          matchesCount: 0,
          totalSent: 0
        }
        
        setJobAlerts((prev: any[]) => [...prev, newAlertData])
        
        alert('🎉 ' + data.message)
        setNewAlert({
          name: '',
          keywords: '',
          region: '',
          industry: '',
          classification: '',
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

  const deleteJobAlert = async (alertId: number) => {
    if (!user?.id) return // Add null check
    
    if (!confirm('Are you sure you want to delete this job alert?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/job-alerts?alertId=${alertId}&userId=${user.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Remove from local state
        setJobAlerts((prev: any[]) => prev.filter((alert: any) => alert.id !== alertId))
        alert('Job alert deleted successfully')
      } else {
        const error = await response.json()
        alert('Error deleting job alert: ' + error.error)
      }
    } catch (error) {
      console.error('Error deleting job alert:', error)
      alert('Error deleting job alert')
    }
  }

  const toggleJobAlert = async (alertId: number, currentActive: boolean) => {
    if (!user?.id) return // Add null check
    
    try {
      const response = await fetch('/api/job-alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: alertId,
          userId: user.id,
          active: !currentActive
        }),
      })
      
      if (response.ok) {
        // Update local state
        setJobAlerts((prev: any[]) => prev.map((alert: any) => 
          alert.id === alertId 
            ? { ...alert, active: !currentActive }
            : alert
        ))
        alert(`Job alert ${!currentActive ? 'activated' : 'deactivated'}`)
      } else {
        const error = await response.json()
        alert('Error updating job alert: ' + error.error)
      }
    } catch (error) {
      console.error('Error updating job alert:', error)
      alert('Error updating job alert')
    }
  }

  const loadAppliedJobs = async () => {
    if (!user?.id) return // Add null check
    
    try {
      const appliedResponse = await fetch(`/api/applied-jobs?userId=${user.id}`)
      if (appliedResponse.ok) {
        const appliedData = await appliedResponse.json()
        const realAppliedJobs = appliedData.appliedJobs.map((app: any) => ({
          id: app.jobs.id,
          title: app.jobs.title,
          company: app.jobs.company,
          region: app.jobs.region,
          hourlyRate: app.jobs.hourly_rate,
          appliedDate: new Date(app.created_at).toLocaleDateString(),
          status: app.status,
          applicationStatus: app.status === 'new' ? 'Under Review' : 
                            app.status === 'shortlisted' ? 'Shortlisted' :
                            app.status === 'interviewed' ? 'Interview Scheduled' :
                            app.status === 'rejected' ? 'Not Selected' : 'Under Review'
        }))
        setAppliedJobs(realAppliedJobs)
      }
    } catch (error) {
      console.error('Error loading applied jobs:', error)
    }
  }

  const removeSavedJob = async (jobId: number) => {
    if (!user?.id) return // Add null check
    
    if (!confirm('Remove this job from your saved jobs?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/saved-jobs?userId=${user.id}&jobId=${jobId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setSavedJobs((prev: any[]) => prev.filter((job: any) => job.id !== jobId))
        alert('Job removed from saved jobs')
      } else {
        const error = await response.json()
        alert('Error removing job: ' + error.error)
      }
    } catch (error) {
      console.error('Error removing saved job:', error)
      alert('Error removing saved job')
    }
  }

  const applyToSavedJob = (jobId: number) => {
    // Find the job details from saved jobs
    const job = savedJobs.find((j: any) => j.id === jobId)
    if (!job) {
      alert('Job not found')
      return
    }
    
    // Check if already applied
    if (appliedJobs.some((app: any) => app.id === jobId)) {
      alert('You have already applied to this job!')
      return
    }
    
    // For now, just redirect to homepage to apply
    // You can enhance this later with a modal
    window.open(`/?search=${encodeURIComponent(job.title)}`, '_blank')
  }

  if (isLoading) {
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
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600">Welcome back, {profile.firstName}! Manage your job search here.</p>
            </div>
            <Link href="/" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium">
              Browse Jobs
            </Link>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-500">{savedJobs.length}</div>
              <div className="text-sm text-gray-600">Saved Jobs</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-500">{appliedJobs.length}</div>
              <div className="text-sm text-gray-600">Applications</div>
              {appliedJobs.filter((job: any) => job.applicationStatus === 'Shortlisted' || job.applicationStatus === 'Interview Scheduled').length > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  {appliedJobs.filter((job: any) => job.applicationStatus === 'Shortlisted' || job.applicationStatus === 'Interview Scheduled').length} Active
                </div>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-500">{jobAlerts.length}</div>
              <div className="text-sm text-gray-600">Job Alerts</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow">
          <div className="flex flex-wrap gap-2 md:gap-3">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'saved', label: 'Saved Jobs', icon: '❤️' },
              { key: 'applied', label: 'Applied Jobs', icon: '📝' },
              { key: 'alerts', label: 'Job Alerts', icon: '🔔' },
              { key: 'profile', label: 'Profile', icon: '👤' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-2 py-2 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
                  activeTab === tab.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="md:hidden">{tab.icon}</span>
                <span className="hidden md:inline">{tab.icon} {tab.label}</span>
                <span className="md:hidden ml-1 text-xs">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white rounded-lg p-6 shadow">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
              
              {/* Recent Saved Jobs */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Recently Saved Jobs</h3>
                {savedJobs.slice(0, 3).map((job: any) => (
                  <div key={job.id} className="border border-gray-200 p-4 mb-2 rounded-lg">
                    <div className="font-semibold">{job.title}</div>
                    <div className="text-gray-600 text-sm">{job.company} • {job.region} • {job.hourlyRate}</div>
                    <div className="text-gray-500 text-xs">Saved on {job.savedDate}</div>
                  </div>
                ))}
                {savedJobs.length === 0 && (
                  <p className="text-gray-500 italic">No saved jobs yet. <Link href="/" className="text-orange-500">Browse jobs</Link> to get started!</p>
                )}
              </div>
              
              {/* Recent Applications */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Recent Applications</h3>
                {appliedJobs.slice(0, 3).map((job: any) => (
                  <div key={job.id} className="border border-gray-200 p-4 mb-2 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold">{job.title}</div>
                        <div className="text-gray-600 text-sm">{job.company} • {job.region}</div>
                        <div className="text-gray-500 text-xs">Applied on {job.appliedDate}</div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.applicationStatus === 'Under Review' ? 'bg-yellow-100 text-yellow-800' : 
                        job.applicationStatus === 'Shortlisted' ? 'bg-green-100 text-green-800' :
                        job.applicationStatus === 'Interview Scheduled' ? 'bg-blue-100 text-blue-800' :
                        job.applicationStatus === 'Not Selected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.applicationStatus}
                      </div>
                    </div>
                  </div>
                ))}
                {appliedJobs.length === 0 && (
                  <p className="text-gray-500 italic">No applications yet. <Link href="/" className="text-orange-500">Find jobs</Link> to apply to!</p>
                )}
              </div>
              
              {/* Active Alerts */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Active Job Alerts</h3>
                {jobAlerts.filter((alert: any) => alert.active).map((alert: any) => (
                  <div key={alert.id} className="border border-gray-200 p-4 mb-2 rounded-lg">
                    <div className="font-semibold">{alert.name}</div>
                    <div className="text-gray-600 text-sm">Keywords: {alert.keywords}</div>
                    <div className="text-gray-500 text-xs">{alert.matchesCount} matches found • {alert.totalSent} alerts sent</div>
                  </div>
                ))}
                {jobAlerts.filter((alert: any) => alert.active).length === 0 && (
                  <p className="text-gray-500 italic">No active job alerts. <button onClick={() => setShowAlertModal(true)} className="text-orange-500 underline">Create one now</button>!</p>
                )}
              </div>
            </div>
          )}

          {/* Saved Jobs Tab */}
          {activeTab === 'saved' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Saved Jobs</h2>
                <Link href="/" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
                  Browse More Jobs
                </Link>
              </div>
              
              {savedJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💼</div>
                  <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
                  <p className="text-gray-600 mb-4">Save jobs you're interested in to keep track of them</p>
                  <Link href="/" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg">
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedJobs.map((job: any) => (
                    <div key={job.id} className="border border-gray-200 p-6 rounded-lg flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-2">{job.title}</div>
                        <div className="text-gray-600 mb-2">{job.company}</div>
                        <div className="text-sm text-gray-500">
                          {job.region} • {job.hourlyRate} • Saved on {job.savedDate}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyToSavedJob(job.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
                        >
                          Apply Now
                        </button>
                        <button
                          onClick={() => removeSavedJob(job.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applied Jobs Tab */}
          {activeTab === 'applied' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Applied Jobs</h2>
              
              {appliedJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-gray-600 mb-4">Start applying to jobs to track your applications here</p>
                  <Link href="/" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg">
                    Find Jobs to Apply
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {appliedJobs.map((job: any) => (
                    <div key={job.id} className="border border-gray-200 p-6 rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-2">{job.title}</div>
                          <div className="text-gray-600 mb-2">{job.company}</div>
                          <div className="text-sm text-gray-500">
                            {job.region} • {job.hourlyRate} • Applied on {job.appliedDate}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          job.applicationStatus === 'Under Review' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : job.applicationStatus === 'Shortlisted'
                            ? 'bg-green-100 text-green-800'
                            : job.applicationStatus === 'Interview Scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : job.applicationStatus === 'Not Selected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.applicationStatus}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Application Status: <strong>{job.applicationStatus}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Job Alerts Tab */}
          {activeTab === 'alerts' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Job Alerts</h2>
                <button
                  onClick={() => setShowAlertModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                >
                  Create New Alert
                </button>
              </div>
              
              {jobAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔔</div>
                  <h3 className="text-lg font-semibold mb-2">No job alerts set up</h3>
                  <p className="text-gray-600 mb-4">Create job alerts to get notified when new matching jobs are posted</p>
                  <button
                    onClick={() => setShowAlertModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
                  >
                    Create Your First Alert
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobAlerts.map((alert: any) => (
                    <div key={alert.id} className="border border-gray-200 p-6 rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-2">{alert.name}</div>
                          <div className="text-gray-600 mb-2">
                            Keywords: {alert.keywords || 'None'} • {alert.region || 'All regions'} • {alert.frequency} alerts
                          </div>
                          <div className="text-sm text-gray-500">
                            Created: {alert.created} • {alert.matchesCount} matches • {alert.totalSent} alerts sent
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          alert.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {alert.active ? 'Active' : 'Paused'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleJobAlert(alert.id, alert.active)}
                          className={`px-4 py-2 rounded text-sm font-medium ${
                            alert.active 
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {alert.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteJobAlert(alert.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
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

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold mb-6">My Profile</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => updateProfile('firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Your first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => updateProfile('lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Your last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => updateProfile('location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
                      <select
                        value={profile.classification}
                        onChange={(e) => updateProfile('classification', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Classification</option>
                        <option value="junior">Junior (0-5 years)</option>
                        <option value="intermediate">Intermediate (5-10 years)</option>
                        <option value="senior">Senior (10-15 years)</option>
                        <option value="expert">Expert (15+ years)</option>
                        <option value="specialist">Specialist</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                      <input
                        type="text"
                        value={profile.specialization}
                        onChange={(e) => updateProfile('specialization', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., Nuclear Engineering, Drilling Operations"
                      />
                    </div>
                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">Resume *</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        {profile.resumeUploaded ? (
                          <div>
                            <div className="text-2xl mb-2">📄</div>
                            <div className="mb-4 text-green-600 font-medium">Resume uploaded successfully</div>
                            <div className="mb-4">
                              <label className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg cursor-pointer inline-block">
                                {isUploading ? 'Uploading...' : 'Replace Resume'}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={handleResumeUpload}
                                  disabled={isUploading}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div className="text-xs text-gray-500">PDF, DOC, or DOCX • Max 5MB</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-2xl mb-2">📤</div>
                            <div className="mb-4 text-red-600 font-medium">Resume required for job applications</div>
                            <div className="mb-4">
                              <label className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg cursor-pointer inline-block">
                                {isUploading ? 'Uploading...' : 'Choose Resume File'}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={handleResumeUpload}
                                  disabled={isUploading}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div className="text-xs text-gray-500">PDF, DOC, or DOCX • Max 5MB</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={saveProfile}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg text-lg font-medium"
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Job Alert Modal */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold">Create Job Alert</h2>
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={createJobAlert} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alert Name *</label>
                  <input
                    type="text"
                    value={newAlert.name}
                    onChange={(e) => setNewAlert((prev: any) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Senior Engineering Roles"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                  <input
                    type="text"
                    value={newAlert.keywords}
                    onChange={(e) => setNewAlert((prev: any) => ({ ...prev, keywords: e.target.value }))}
                    placeholder="engineer, drilling, offshore"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                      value={newAlert.region}
                      onChange={(e) => setNewAlert((prev: any) => ({ ...prev, region: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Any Region</option>
                      <option value="northeast">Northeast US</option>
                      <option value="southeast">Southeast US</option>
                      <option value="midwest">Midwest US</option>
                      <option value="southwest">Southwest US</option>
                      <option value="west">West US</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                    <select
                      value={newAlert.frequency}
                      onChange={(e) => setNewAlert((prev: any) => ({ ...prev, frequency: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="immediate">Immediate</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAlertModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                  >
                    Create Alert
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OAuth Resume Prompt Modal */}
        {showLinkedInResumePrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-xl font-bold mb-3">Welcome! 🎉</h3>
                <p className="text-gray-600 mb-6">
                  We've auto-filled your profile with your account data! Complete your setup by uploading your resume. 
                  This will help employers find you and enable you to apply for jobs with one click!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowLinkedInResumePrompt(false)
                      setActiveTab('profile')
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Upload Resume
                  </button>
                  <button
                    onClick={() => setShowLinkedInResumePrompt(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
