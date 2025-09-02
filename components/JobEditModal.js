// components/JobEditModal.js
'use client'

import { useState, useEffect } from 'react'

const JobEditModal = ({ job, isOpen, onClose, onJobUpdated, user }) => {
  const [formData, setFormData] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Initialize form data when job changes
  useEffect(() => {
    if (job) {
      console.log('🔍 JobEditModal received job:', job)
      console.log('📊 Available job fields:', Object.keys(job))
      
setFormData({
  title: job.title || '',
  company: job.company || '',
  region: job.region || '',  // Now matches database
  estimatedDuration: job.duration || '',
  primaryIndustry: job.primary_industry || '',  // Now matches database  
  secondaryIndustry: job.secondary_industry || '',
  classification: job.classification || '',
  discipline: job.discipline || '',
  jobType: job.job_type || '',
  hourlyRate: job.hourly_rate || '',  // Now matches database
  perDiem: job.per_diem || '',
  mobilization: job.mobilization || '',
  demobilization: job.demobilization || '',
  description: job.description || '',
  contactEmail: job.contact_email || '',
  status: job.status || 'active'
})
      setIsDirty(false)
      
      console.log('✅ Form data populated:', {
        title: job.title,
        company: job.company,
        region: job.region,
        primaryIndustry: job.primary_industry || job.primaryIndustry,
        hourlyRate: job.hourly_rate || job.hourlyRate
      })
    }
  }, [job])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setIsDirty(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isDirty) {
      onClose()
      return
    }

    try {
      setIsLoading(true)
      
      console.log('🚀 Submitting job update:', {
        jobId: job.id,
        userId: user.id,
        formData: formData
      })
      
      const response = await fetch('/api/jobs/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobData: formData,
          userId: user.id
        })
      })

      console.log('📡 API response status:', response.status)
      
      const data = await response.json()
      console.log('📄 API response data:', data)
      
      if (data.success) {
        console.log('✅ Job update successful, closing modal...')
        
        // Update the parent component with the new job data
        if (onJobUpdated && data.job) {
          onJobUpdated(data.job)
        }
        
        // Close the modal
        setIsDirty(false)
        onClose()
        
        // Show success message
        alert('✅ Job updated successfully!')
        
        console.log('✅ Modal should be closed now')
      } else {
        console.error('❌ API returned error:', data)
        alert(`Error updating job: ${data.error || 'Unknown error'}${data.details ? '\nDetails: ' + data.details : ''}`)
      }
    } catch (error) {
      console.error('❌ Error updating job:', error)
      alert(`Error updating job: ${error.message}. Check the browser console for more details.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/jobs/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          status: newStatus,
          userId: user.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Status change successful')
        
        // Update the form data to reflect the new status
        setFormData(prev => ({ ...prev, status: newStatus }))
        setIsDirty(false)
        
        // Update the parent component with the new job data
        if (onJobUpdated && data.job) {
          onJobUpdated(data.job)
        }
        
        // Show success message
        alert(`✅ Job ${newStatus === 'active' ? 'activated' : newStatus === 'paused' ? 'paused' : 'expired'} successfully!`)
      } else {
        alert('Error updating job status: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Error updating job status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    console.log('🚪 Attempting to close modal, isDirty:', isDirty)
    
    if (isDirty) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?')
      if (!confirmClose) {
        console.log('❌ User cancelled modal close')
        return
      }
    }
    
    console.log('✅ Closing modal and resetting state')
    setIsDirty(false)
    onClose()
  }

  if (!isOpen || !job) return null

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Edit Job Posting</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)}`}>
                {formData.status?.charAt(0).toUpperCase() + formData.status?.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                Created: {formatDate(job.created_at)}
              </span>
              <span className="text-sm text-gray-500">
                Expires: {formatDate(job.expires_at)}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Status Controls */}
        <div className="p-6 border-b bg-gray-50">
          <h3 className="font-medium mb-3">Job Status</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('active')}
              disabled={isLoading || formData.status === 'active'}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Activate'}
            </button>
            <button
              onClick={() => handleStatusChange('paused')}
              disabled={isLoading || formData.status === 'paused'}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Pause'}
            </button>
            <button
              onClick={() => handleStatusChange('expired')}
              disabled={isLoading || formData.status === 'expired'}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Expire'}
            </button>
          </div>
        </div>

        {/* Edit Form - Match HTML structure exactly */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Job Basics Section */}
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-orange-500">
            <h4 className="font-medium mb-4 text-lg">📝 Job Basics</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region *
                </label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration *
                </label>
                <select
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Duration</option>
                  <option value="1-3-months">1-3 months</option>
                  <option value="3-6-months">3-6 months</option>
                  <option value="6-12-months">6-12 months</option>
                  <option value="1-2-years">1-2 years</option>
                  <option value="2-5-years">2-5 years</option>
                  <option value="permanent">Permanent</option>
                  <option value="ongoing">Ongoing/As-needed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Industry & Classification Section */}
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-orange-500">
            <h4 className="font-medium mb-4 text-lg">🏭 Industry & Classification</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Industry *
                </label>
                <select
                  name="primaryIndustry"
                  value={formData.primaryIndustry}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Primary Industry</option>
                  <option value="nuclear">Nuclear Power (SIC 4911)</option>
                  <option value="power-generation">Power Generation (SIC 4911)</option>
                  <option value="petrochem">Petro-Chem/Fossil/Offshore (SIC 2911)</option>
                  <option value="alt-energy">Alternative Energy (SIC 4911)</option>
                  <option value="electric-td">Electric T&D (SIC 4911)</option>
                  <option value="construction">Construction (SIC 1541)</option>
                  <option value="homeland">Homeland/DoD/Fed Gov (SIC 9711)</option>
                  <option value="shipyard">Shipyard/Marine (SIC 3731)</option>
                  <option value="computer">Computer/Telecom (SIC 7372)</option>
                  <option value="aerospace">Aerospace (SIC 3721)</option>
                  <option value="overseas">Overseas Operations</option>
                  <option value="medical">Medical/Pharma (SIC 2834)</option>
                  <option value="manufacturing">Manufacturing (SIC 3300)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Industry
                </label>
                <select
                  name="secondaryIndustry"
                  value={formData.secondaryIndustry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Secondary Industry (Optional)</option>
                  <option value="nuclear">Nuclear Power (SIC 4911)</option>
                  <option value="power-generation">Power Generation (SIC 4911)</option>
                  <option value="petrochem">Petro-Chem/Fossil/Offshore (SIC 2911)</option>
                  <option value="alt-energy">Alternative Energy (SIC 4911)</option>
                  <option value="electric-td">Electric T&D (SIC 4911)</option>
                  <option value="construction">Construction (SIC 1541)</option>
                  <option value="homeland">Homeland/DoD/Fed Gov (SIC 9711)</option>
                  <option value="shipyard">Shipyard/Marine (SIC 3731)</option>
                  <option value="computer">Computer/Telecom (SIC 7372)</option>
                  <option value="aerospace">Aerospace (SIC 3721)</option>
                  <option value="overseas">Overseas Operations</option>
                  <option value="medical">Medical/Pharma (SIC 2834)</option>
                  <option value="manufacturing">Manufacturing (SIC 3300)</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Classification *
                </label>
                <select
                  name="classification"
                  value={formData.classification}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discipline
                </label>
                <select
                  name="discipline"
                  value={formData.discipline}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Discipline (Optional)</option>
                  <option value="electrical">Electrical</option>
                  <option value="mechanical">Mechanical</option>
                  <option value="civil">Civil</option>
                  <option value="instrumentation">Instrumentation & Control</option>
                  <option value="welding">Welding</option>
                  <option value="operations">Operations</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="project-management">Project Management</option>
                  <option value="quality-assurance">Quality Assurance</option>
                  <option value="safety">Safety</option>
                  <option value="engineering">Engineering</option>
                  <option value="technician">Technician</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job Type & Compensation Section */}
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-orange-500">
            <h4 className="font-medium mb-4 text-lg">💰 Job Type & Compensation</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type *
                </label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  <option value="in-house">In-house</option>
                  <option value="project-hire">Project Hire</option>
                  <option value="1099">1099 Contract</option>
                  <option value="temp-perm">Temp-to-Perm</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate/Compensation *
                </label>
                <input
                  type="text"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleInputChange}
                  placeholder="$35 - $45/hr or DOE"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Diem
                </label>
                <input
                  type="text"
                  name="perDiem"
                  value={formData.perDiem}
                  onChange={handleInputChange}
                  placeholder="$75/day or $0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobilization
                </label>
                <input
                  type="text"
                  name="mobilization"
                  value={formData.mobilization}
                  onChange={handleInputChange}
                  placeholder="$2,000 or N/A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Demobilization
                </label>
                <input
                  type="text"
                  name="demobilization"
                  value={formData.demobilization}
                  onChange={handleInputChange}
                  placeholder="$2,000 or N/A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Job Description Section */}
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-orange-500">
            <h4 className="font-medium mb-4 text-lg">📋 Job Description</h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={6}
                placeholder="Describe the job responsibilities, requirements, and benefits..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                style={{ minHeight: '120px' }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div>
              {isDirty && (
                <span className="text-orange-600 text-sm">
                  ⚠️ You have unsaved changes
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !isDirty}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JobEditModal