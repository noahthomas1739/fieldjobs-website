'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [step, setStep] = useState(1) // 1: Choose type, 2: Basic info, 3: Additional info
  const [accountType, setAccountType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Shared fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Job Seeker fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [classification, setClassification] = useState('')
  const [willingToTravel, setWillingToTravel] = useState('')
  const [industries, setIndustries] = useState([])
  const [skills, setSkills] = useState([])
  const [yearsExperience, setYearsExperience] = useState('')
  const [desiredRate, setDesiredRate] = useState('')
  const [availabilityDate, setAvailabilityDate] = useState('')
  const [hasSecurityClearance, setHasSecurityClearance] = useState('no')
  const [clearanceLevel, setClearanceLevel] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeParsing, setResumeParsing] = useState(false)
  
  // Employer fields
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [yearEstablished, setYearEstablished] = useState('')
  const [companyIndustries, setCompanyIndustries] = useState([])
  const [companyLinkedin, setCompanyLinkedin] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [ein, setEin] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  
  // Terms and preferences
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true)
  const [enableSmsAlerts, setEnableSmsAlerts] = useState(false)
  const [enable2FA, setEnable2FA] = useState(false)

  // Handle resume upload and parsing
  const handleResumeUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    setResumeFile(file)
    setResumeParsing(true)
    setError('')
    
    try {
      // In a real app, you'd send this to a resume parsing API
      // For demo, we'll simulate parsing with a timeout
      setTimeout(() => {
        // Simulate extracted data
        setFirstName('John')
        setLastName('Smith')
        setPhone('(555) 123-4567')
        setLocation('Houston, TX')
        setYearsExperience('10')
        setSkills(['Welding', 'Project Management', 'Safety Protocols', 'AutoCAD'])
        setDesiredRate('$45-55')
        setClassification('senior')
        setResumeParsing(false)
        
        alert('✅ Resume parsed successfully! We\'ve auto-filled your information. Please review and update as needed.')
      }, 2000)
    } catch (err) {
      setError('Error parsing resume. Please fill in the information manually.')
      setResumeParsing(false)
    }
  }

  // Industry toggle handler
  const toggleIndustry = (industry, isEmployer = false) => {
    if (isEmployer) {
      setCompanyIndustries(prev => 
        prev.includes(industry) 
          ? prev.filter(i => i !== industry)
          : [...prev, industry]
      )
    } else {
      setIndustries(prev => 
        prev.includes(industry) 
          ? prev.filter(i => i !== industry)
          : [...prev, industry]
      )
    }
  }

  // Validate Step 2 (Basic Info)
  const validateStep2 = () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields')
      return false
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    
    if (accountType === 'job_seeker') {
      if (!firstName || !lastName || !phone || !location) {
        setError('Please fill in all required fields')
        return false
      }
    } else {
      if (!companyName || !contactName || !companyPhone) {
        setError('Please fill in all required fields')
        return false
      }
    }
    
    setError('')
    return true
  }

  // Handle final signup
  const handleSignup = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            account_type: accountType,
            first_name: firstName || contactName.split(' ')[0],
            last_name: lastName || contactName.split(' ').slice(1).join(' ')
          }
        }
      })
      
      if (authError) throw authError
      
      // Create profile based on account type
      if (accountType === 'job_seeker') {
        const profileData = {
          user_id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          location,
          classification,
          willing_to_travel: willingToTravel,
          industries,
          skills,
          years_experience: parseInt(yearsExperience) || 0,
          desired_rate: desiredRate,
          availability_date: availabilityDate,
          has_security_clearance: hasSecurityClearance === 'yes',
          clearance_level: clearanceLevel,
          linkedin_url: linkedinUrl,
          email_alerts: enableEmailAlerts,
          sms_alerts: enableSmsAlerts,
          two_factor_enabled: enable2FA,
          created_at: new Date().toISOString()
        }
        
        const { error: profileError } = await supabase
          .from('job_seeker_profiles')
          .insert(profileData)
          
        if (profileError) throw profileError
        
        // Upload resume if provided
        if (resumeFile) {
          const fileExt = resumeFile.name.split('.').pop()
          const fileName = `${authData.user.id}/resume.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(fileName, resumeFile)
            
          if (uploadError) console.error('Resume upload error:', uploadError)
        }
        
      } else {
        // Employer profile
        const profileData = {
          id: authData.user.id,
          email,
          company_name: companyName,
          contact_name: contactName,
          phone: companyPhone,
          website,
          company_size: companySize,
          year_established: parseInt(yearEstablished) || null,
          industries: companyIndustries,
          linkedin_url: companyLinkedin,
          description: companyDescription,
          ein_tax_id: ein,
          email_alerts: enableEmailAlerts,
          two_factor_enabled: enable2FA,
          subscription_tier: 'free',
          created_at: new Date().toISOString()
        }
        
        const { error: profileError } = await supabase
          .from('employer_profiles')
          .insert(profileData)
          
        if (profileError) throw profileError
        
        // Upload logo if provided
        if (logoFile) {
          const fileExt = logoFile.name.split('.').pop()
          const fileName = `${authData.user.id}/logo.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(fileName, logoFile)
            
          if (uploadError) console.error('Logo upload error:', uploadError)
        }
      }
      
      // Send verification email
      alert('✅ Account created successfully! Please check your email to verify your account.')
      
      // Redirect to appropriate dashboard
      router.push(accountType === 'job_seeker' ? '/dashboard' : '/employer')
      
    } catch (error) {
      console.error('Signup error:', error)
      setError(error.message || 'An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <div className={`w-24 h-1 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-300'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <div className={`w-24 h-1 ${step >= 3 ? 'bg-orange-500' : 'bg-gray-300'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-orange-500 text-white' : 'bg-gray-300'}`}>
              3
            </div>
          </div>
          <div className="text-center text-sm text-gray-600">
            {step === 1 && 'Choose Account Type'}
            {step === 2 && 'Basic Information'}
            {step === 3 && 'Complete Your Profile'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Step 1: Choose Account Type */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-center mb-8">Join FieldJobs</h2>
              <p className="text-center text-gray-600 mb-8">Choose how you want to use FieldJobs</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={() => {
                    setAccountType('job_seeker')
                    setStep(2)
                  }}
                  className="p-8 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-lg transition-all text-center"
                >
                  <div className="text-4xl mb-4">👷</div>
                  <h3 className="text-xl font-semibold mb-2">I'm Looking for Work</h3>
                  <p className="text-gray-600">Find technical jobs, get alerts, and apply with one click</p>
                </button>
                
                <button
                  onClick={() => {
                    setAccountType('employer')
                    setStep(2)
                  }}
                  className="p-8 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-lg transition-all text-center"
                >
                  <div className="text-4xl mb-4">🏢</div>
                  <h3 className="text-xl font-semibold mb-2">I'm an Employer</h3>
                  <p className="text-gray-600">Post jobs, search resumes, and find qualified candidates</p>
                </button>
              </div>
              
              <p className="text-center mt-8 text-gray-600">
                Already have an account? <Link href="/auth/login" className="text-orange-500 hover:underline">Log in</Link>
              </p>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">
                {accountType === 'job_seeker' ? 'Create Your Profile' : 'Company Information'}
              </h2>
              
              {accountType === 'job_seeker' ? (
                <>
                  {/* Resume Upload Section */}
                  <div className="mb-6 p-6 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
                    <h3 className="text-lg font-semibold mb-2">📄 Quick Setup with Resume</h3>
                    <p className="text-gray-600 mb-4">Upload your resume and we'll auto-fill your information</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      disabled={resumeParsing}
                      className="w-full"
                    />
                    {resumeParsing && (
                      <div className="mt-2 text-blue-600">
                        ⏳ Parsing your resume...
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Hiring Manager Name"
                      required
                    />
                  </div>
                </>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={accountType === 'job_seeker' ? phone : companyPhone}
                  onChange={(e) => accountType === 'job_seeker' ? setPhone(e.target.value) : setCompanyPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              {accountType === 'job_seeker' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="City, State"
                    required
                  />
                </div>
              )}

              {accountType === 'employer' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Website *
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://yourcompany.com"
                    required
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (validateStep2()) {
                      setStep(3)
                    }
                  }}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Additional Information */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>
              
              {accountType === 'job_seeker' ? (
                <>
                  {/* Job Seeker Additional Info */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Classification *
                        </label>
                        <select
                          value={classification}
                          onChange={(e) => setClassification(e.target.value)}
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Years of Experience *
                        </label>
                        <input
                          type="number"
                          value={yearsExperience}
                          onChange={(e) => setYearsExperience(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Desired Hourly Rate
                        </label>
                        <input
                          type="text"
                          value={desiredRate}
                          onChange={(e) => setDesiredRate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="$45-55/hr"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Available Starting
                        </label>
                        <input
                          type="date"
                          value={availabilityDate}
                          onChange={(e) => setAvailabilityDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Willing to Travel? *
                      </label>
                      <select
                        value={willingToTravel}
                        onChange={(e) => setWillingToTravel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      >
                        <option value="">Select Option</option>
                        <option value="yes">Yes - Willing to travel</option>
                        <option value="no">No - Local only</option>
                        <option value="limited">Limited travel (less than 25%)</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Clearance
                      </label>
                      <select
                        value={hasSecurityClearance}
                        onChange={(e) => {
                          setHasSecurityClearance(e.target.value)
                          if (e.target.value === 'no') setClearanceLevel('')
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="no">No security clearance</option>
                        <option value="yes">Yes - I have clearance</option>
                      </select>
                    </div>

                    {hasSecurityClearance === 'yes' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Clearance Level
                        </label>
                        <select
                          value={clearanceLevel}
                          onChange={(e) => setClearanceLevel(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Select Level</option>
                          <option value="confidential">Confidential</option>
                          <option value="secret">Secret</option>
                          <option value="top_secret">Top Secret</option>
                          <option value="ts_sci">TS/SCI</option>
                        </select>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn Profile (Optional)
                      </label>
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industries of Interest * (Select all that apply)
                      </label>
                      <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-4">
                          <div>
                            <div className="font-semibold text-orange-500 mb-2">Energy & Power</div>
                            <div className="grid grid-cols-2 gap-2 ml-4">
                              {['nuclear', 'power-generation', 'alt-energy', 'electric-td'].map(ind => (
                                <label key={ind} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={industries.includes(ind)}
                                    onChange={() => toggleIndustry(ind)}
                                    className="mr-2"
                                  />
                                  {ind.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-orange-500 mb-2">Defense & Government</div>
                            <div className="grid grid-cols-2 gap-2 ml-4">
                              {['homeland', 'aerospace'].map(ind => (
                                <label key={ind} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={industries.includes(ind)}
                                    onChange={() => toggleIndustry(ind)}
                                    className="mr-2"
                                  />
                                  {ind === 'homeland' ? 'Homeland/DoD/Fed Gov' : 'Aerospace'}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-semibold text-orange-500 mb-2">Industrial</div>
                            <div className="grid grid-cols-2 gap-2 ml-4">
                              {['construction', 'manufacturing', 'shipyard', 'petrochem'].map(ind => (
                                <label key={ind} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={industries.includes(ind)}
                                    onChange={() => toggleIndustry(ind)}
                                    className="mr-2"
                                  />
                                  {ind.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Skills (comma separated)
                      </label>
                      <input
                        type="text"
                        value={skills.join(', ')}
                        onChange={(e) => setSkills(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Welding, AutoCAD, Project Management"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Employer Additional Info */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Company Details</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Size
                        </label>
                        <select
                          value={companySize}
                          onChange={(e) => setCompanySize(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Select Size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="501-1000">501-1000 employees</option>
                          <option value="1000+">1000+ employees</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Year Established
                        </label>
                        <input
                          type="number"
                          value={yearEstablished}
                          onChange={(e) => setYearEstablished(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="1900"
                          max={new Date().getFullYear()}
                          placeholder="2010"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        EIN/Tax ID (Optional - for verification)
                      </label>
                      <input
                        type="text"
                        value={ein}
                        onChange={(e) => setEin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="12-3456789"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company LinkedIn (Optional)
                      </label>
                      <input
                        type="url"
                        value={companyLinkedin}
                        onChange={(e) => setCompanyLinkedin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="https://linkedin.com/company/yourcompany"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industries * (Select all that apply)
                      </label>
                      <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'nuclear', 'power-generation', 'petrochem', 'alt-energy',
                            'electric-td', 'construction', 'homeland', 'shipyard',
                            'computer', 'aerospace', 'medical', 'manufacturing'
                          ].map(ind => (
                            <label key={ind} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={companyIndustries.includes(ind)}
                                onChange={() => toggleIndustry(ind, true)}
                                className="mr-2"
                              />
                              {ind.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Description
                      </label>
                      <textarea
                        value={companyDescription}
                        onChange={(e) => setCompanyDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="Brief description of your company..."
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Logo (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                        className="w-full"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Terms and Preferences */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Preferences & Security</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enableEmailAlerts}
                      onChange={(e) => setEnableEmailAlerts(e.target.checked)}
                      className="mr-3"
                    />
                    <span>Send me email notifications about {accountType === 'job_seeker' ? 'new jobs' : 'applications'}</span>
                  </label>
                  
                  {accountType === 'job_seeker' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={enableSmsAlerts}
                        onChange={(e) => setEnableSmsAlerts(e.target.checked)}
                        className="mr-3"
                      />
                      <span>Send SMS alerts for urgent opportunities (standard rates apply)</span>
                    </label>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enable2FA}
                      onChange={(e) => setEnable2FA(e.target.checked)}
                      className="mr-3"
                    />
                    <span>Enable two-factor authentication (recommended)</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mr-3"
                      required
                    />
                    <span>
                      I agree to the <Link href="/terms" className="text-orange-500 hover:underline">Terms of Service</Link> and{' '}
                      <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link> *
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSignup}
                  disabled={!agreeToTerms || isLoading || (accountType === 'job_seeker' ? industries.length === 0 : companyIndustries.length === 0)}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}