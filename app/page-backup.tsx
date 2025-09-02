'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const { user } = useAuth()
  
  // Job data and filtering
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Search and filters (matching HTML demo)
  const [searchInput, setSearchInput] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [compensationFilter, setCompensationFilter] = useState('')
  const [jobTypeFilter, setJobTypeFilter] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  // Industry filters (matching HTML demo exactly)
  const [activeFilters, setActiveFilters] = useState([])
  
  // Job seeker features
  const [savedJobs, setSavedJobs] = useState([])
  const [showAlertModal, setShowAlertModal] = useState(false)

  useEffect(() => {
    loadJobs()
    if (user) {
      loadSavedJobs()
    }
  }, [user])

  useEffect(() => {
    filterJobs()
  }, [jobs, searchInput, locationFilter, compensationFilter, jobTypeFilter, classificationFilter, dateFilter, activeFilters])

  const loadJobs = async () => {
    try {
      setIsLoading(true)
      
      // Mock data matching HTML demo structure exactly
      const mockJobs = [
        {
          id: 1,
          title: "Nuclear Reactor Operator",
          company: "Energy Solutions Corp",
          region: "southwest",
          hourlyRate: "$45 - $55/hr",
          badges: ["urgent", "high-pay"],
          type: "nuclear",
          jobType: "in-house",
          classification: "senior",
          discipline: "operations",
          primaryIndustry: "nuclear",
          postedDays: 2,
          description: "We are seeking an experienced Nuclear Reactor Operator to join our team at our Phoenix facility. The successful candidate will be responsible for monitoring and controlling nuclear reactor operations to ensure safe and efficient power generation. This role requires strict adherence to safety protocols and regulatory compliance. You will work closely with engineering teams to optimize reactor performance and maintain operational excellence. Benefits include comprehensive health insurance, retirement plans, and ongoing professional development opportunities."
        },
        {
          id: 2,
          title: "Offshore Platform Engineer",
          company: "Petro-Marine Industries",
          region: "southeast",
          hourlyRate: "$55 - $70/hr",
          badges: ["high-pay", "popular"],
          type: "petrochem",
          jobType: "project-hire",
          classification: "expert",
          discipline: "mechanical",
          primaryIndustry: "petrochem",
          postedDays: 1,
          description: "Join our offshore engineering team working on cutting-edge petroleum extraction platforms in the Gulf of Mexico. This position involves designing, implementing, and maintaining complex offshore systems in challenging marine environments. The role requires extensive travel to offshore locations and the ability to work in physically demanding conditions. We offer competitive compensation, comprehensive safety training, and opportunities for career advancement in the energy sector. Strong problem-solving skills and experience with offshore equipment are essential."
        },
        {
          id: 3,
          title: "Wind Turbine Technician",
          company: "GreenTech Energy",
          region: "midwest",
          hourlyRate: "$32 - $42/hr",
          badges: ["urgent"],
          type: "alt-energy",
          jobType: "temp-perm",
          classification: "intermediate",
          discipline: "maintenance",
          primaryIndustry: "alt-energy",
          postedDays: 3,
          description: "We are looking for skilled Wind Turbine Technicians to maintain and repair our growing fleet of wind energy systems. This hands-on role involves climbing turbines, performing routine maintenance, and troubleshooting electrical and mechanical issues. Candidates should be comfortable working at heights and in various weather conditions. The position offers excellent growth opportunities in the renewable energy sector. Training will be provided for specialized equipment and safety procedures specific to wind turbine operations."
        }
      ]
      
      setJobs(mockJobs)
      setFilteredJobs(mockJobs)
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSavedJobs = async () => {
  try {
    if (!user) return
    
    const response = await fetch(`/api/saved-jobs?userId=${user.id}`)
    if (response.ok) {
      const data = await response.json()
      const savedJobIds = data.savedJobs.map(saved => saved.job_id)
      setSavedJobs(savedJobIds)
    }
  } catch (error) {
    console.error('Error loading saved jobs:', error)
  }
}

  const toggleFilter = (industry) => {
    if (activeFilters.includes(industry)) {
      setActiveFilters(prev => prev.filter(f => f !== industry))
    } else {
      setActiveFilters(prev => [...prev, industry])
    }
  }

  const filterJobs = () => {
    let filtered = jobs.filter(job => {
      // Search input filter
      const matchesSearch = !searchInput || 
        job.title.toLowerCase().includes(searchInput.toLowerCase()) ||
        job.company.toLowerCase().includes(searchInput.toLowerCase()) ||
        job.description.toLowerCase().includes(searchInput.toLowerCase())
      
      // Location filter
      const matchesLocation = !locationFilter || job.region === locationFilter
      
      // Compensation filter
      const matchesCompensation = !compensationFilter || checkCompensationMatch(job.hourlyRate, compensationFilter)
      
      // Job type filter
      const matchesJobType = !jobTypeFilter || job.jobType === jobTypeFilter
      
      // Classification filter
      const matchesClassification = !classificationFilter || job.classification === classificationFilter
      
      // Industry filters
      const matchesIndustry = activeFilters.length === 0 || activeFilters.includes(job.type)
      
      // Date filter
      const matchesDate = !dateFilter || checkDateMatch(job.postedDays, dateFilter)
      
      return matchesSearch && matchesLocation && matchesCompensation && matchesJobType && matchesClassification && matchesIndustry && matchesDate
    })
    
    setFilteredJobs(filtered)
  }

  const checkCompensationMatch = (jobRate, filterRange) => {
    // Extract numbers from job rate (e.g., "$45 - $55/hr" -> [45, 55])
    const matches = jobRate.match(/\$(\d+)\s*-\s*\$(\d+)/);
    if (!matches) return false;
    
    const jobMin = parseInt(matches[1]);
    const jobMax = parseInt(matches[2]);
    
    switch(filterRange) {
      case '0-25': return jobMax <= 25;
      case '25-35': return jobMin >= 25 && jobMax <= 35;
      case '35-50': return jobMin >= 35 && jobMax <= 50;
      case '50-75': return jobMin >= 50 && jobMax <= 75;
      case '75+': return jobMin >= 75;
      default: return true;
    }
  }

  const checkDateMatch = (postedDays, filterDays) => {
    const days = parseInt(filterDays);
    return postedDays <= days;
  }

const toggleSaveJob = async (jobId) => {
  try {
    if (!user) {
      alert('Please log in to save jobs')
      return
    }
    
    const job = jobs.find(j => j.id === jobId)
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
        setSavedJobs(prev => prev.filter(id => id !== jobId))
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
        setSavedJobs(prev => [...prev, jobId])
        alert('Job saved successfully! View it in your dashboard.')
      } else {
        const error = await response.json()
        if (error.error === 'Job already saved') {
          setSavedJobs(prev => [...prev, jobId])
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

  const getPostedText = (days) => {
    if (days === 1) return 'Posted 1 day ago';
    if (days < 7) return `Posted ${days} days ago`;
    if (days < 30) return `Posted ${Math.floor(days/7)} week${Math.floor(days/7) > 1 ? 's' : ''} ago`;
    return 'Posted over a month ago';
  }

  const getBadgeText = (badge) => {
    switch(badge) {
      case 'urgent': return 'Urgent';
      case 'high-pay': return 'High Pay';
      case 'popular': return 'Popular';
      default: return badge;
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

  const toggleJobDescription = (jobId) => {
    // Toggle expanded description (placeholder for now)
    console.log('Toggle description for job:', jobId)
  }

  return (
    <div style={{ margin: 0, padding: 0, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', background: '#f5f5f5' }}>
      {/* Search Hero - NO NAVBAR HERE (uses existing navbar component) */}
      <div style={{ background: '#1a1a1a', color: 'white', padding: '4rem 2rem', textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', margin: 0 }}>Find Your Next Technical Opportunity</h1>
        <p style={{ margin: '1rem 0 2rem 0' }}>Connect with top employers in nuclear, energy, aerospace, defense, and technical industries</p>
        
        {/* ✅ UPDATED SEARCH FIELDS WITH BORDERS */}
        <div style={{ display: 'flex', gap: '1rem', maxWidth: '800px', margin: '2rem auto 0', flexWrap: 'wrap' }}>
  <input
    type="text"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    placeholder="Job title, company, or keywords"
    style={{ 
      flex: 1, 
      padding: '0.75rem', 
      border: '3px solid #ff6b35',  // ✅ ORANGE border - will show against dark AND white
      borderRadius: '5px', 
      fontSize: '1rem', 
      minWidth: '200px',
      outline: 'none',
      boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
      backgroundColor: 'white',
      color: 'black'
    }}
  />
  <select
    value={locationFilter}
    onChange={(e) => setLocationFilter(e.target.value)}
    style={{ 
      flex: 1, 
      padding: '0.75rem', 
      border: '3px solid #ff6b35',  // ✅ ORANGE border - will show against dark AND white
      borderRadius: '5px', 
      fontSize: '1rem', 
      minWidth: '200px',
      outline: 'none',
      boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
      backgroundColor: 'white',
      color: 'black'
    }}
  >
    <option value="">All Regions</option>
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
  <select
    value={compensationFilter}
    onChange={(e) => setCompensationFilter(e.target.value)}
    style={{ 
      flex: 1, 
      padding: '0.75rem', 
      border: '3px solid #ff6b35',  // ✅ ORANGE border - will show against dark AND white
      borderRadius: '5px', 
      fontSize: '1rem', 
      minWidth: '200px',
      outline: 'none',
      boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
      backgroundColor: 'white',
      color: 'black'
    }}
  >
    <option value="">All Compensation</option>
    <option value="0-25">Under $25/hr</option>
    <option value="25-35">$25 - $35/hr</option>
    <option value="35-50">$35 - $50/hr</option>
    <option value="50-75">$50 - $75/hr</option>
    <option value="75+">$75+/hr</option>
    <option value="project">Project Rate</option>
  </select>
  <button
    onClick={filterJobs}
    style={{ 
      padding: '0.75rem 2rem', 
      background: '#ff6b35', 
      color: 'white', 
      border: '3px solid #ff6b35',
      borderRadius: '5px', 
      cursor: 'pointer', 
      fontSize: '1rem',
      fontWeight: '600',
      boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
      transition: 'all 0.3s ease'
    }}
  >
    Search Jobs
  </button>
</div>        
        <div style={{ marginTop: '2rem' }}>
          <p style={{ marginBottom: '1rem' }}>Want jobs delivered to your inbox?</p>
          <button
            onClick={() => setShowAlertModal(true)}
            style={{ background: '#28a745', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            📧 Set Up Job Alerts
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        {/* Filters Container */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '10px', marginBottom: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          {/* Industry Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { key: 'nuclear', label: 'Nuclear Power' },
              { key: 'power-generation', label: 'Power Generation' },
              { key: 'petrochem', label: 'Petro-Chem/Fossil/Offshore' },
              { key: 'alt-energy', label: 'Alt Energy' },
              { key: 'electric-td', label: 'Electric T&D' },
              { key: 'construction', label: 'Construction' },
              { key: 'homeland', label: 'Homeland/DoD/Fed Gov' },
              { key: 'shipyard', label: 'Shipyard/Marine' },
              { key: 'computer', label: 'Computer/Telecom' },
              { key: 'aerospace', label: 'Aerospace' },
              { key: 'overseas', label: 'Overseas' },
              { key: 'medical', label: 'Medical/Pharma' },
              { key: 'manufacturing', label: 'Manufacturing' }
            ].map((industry) => (
              <button
                key={industry.key}
                onClick={() => toggleFilter(industry.key)}
                style={{
                  padding: '0.75rem',
                  background: activeFilters.includes(industry.key) ? '#ff6b35' : 'white',
                  color: activeFilters.includes(industry.key) ? 'white' : 'black',
                  border: `2px solid ${activeFilters.includes(industry.key) ? '#ff6b35' : '#ddd'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  fontWeight: '500',
                  fontSize: '0.9rem'
                }}
              >
                {industry.label}
              </button>
            ))}
          </div>

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
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>Classification</label>
              <select
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.9rem' }}
              >
                <option value="">All Classifications</option>
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

        {/* Job Listings */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <h3>No jobs found</h3>
              <p>Try adjusting your search criteria or filters</p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <div
                key={job.id}
                style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  {job.badges?.map(badge => (
                    <span
                      key={badge}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        marginRight: '0.5rem',
                        background: badge === 'urgent' ? '#ff6b35' : badge === 'high-pay' ? '#00d4aa' : '#1a1a1a',
                        color: 'white'
                      }}
                    >
                      {getBadgeText(badge)}
                    </span>
                  ))}
                </div>
                
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1a1a1a' }}>
                  {job.title}
                </div>
                <div style={{ fontSize: '1rem', color: '#666', marginBottom: '1rem' }}>
                  {job.company}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>💰 {job.hourlyRate}</div>
                  <div>📍 {job.region}</div>
                  <div>📅 {getPostedText(job.postedDays)}</div>
                  <div>💼 {job.jobType}</div>
                </div>
                
                <div style={{ margin: '1rem 0', padding: '0.75rem 0', color: '#666', lineHeight: 1.5, fontSize: '0.95rem', borderTop: '1px solid #f0f0f0' }}>
                  {job.description.substring(0, 200)}...
                  <span
                    onClick={() => toggleJobDescription(job.id)}
                    style={{ color: '#ff6b35', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', marginLeft: '0.5rem' }}
                  >
                    See more
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button style={{ background: '#ff6b35', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '500' }}>
                    Apply Now
                  </button>
                  <button
                    onClick={() => toggleSaveJob(job.id)}
                    style={{
                      background: savedJobs.includes(job.id) ? '#ff6b35' : 'transparent',
                      color: savedJobs.includes(job.id) ? 'white' : '#ff6b35',
                      border: '2px solid #ff6b35',
                      padding: '0.5rem 1rem',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {savedJobs.includes(job.id) ? 'Saved' : 'Save Job'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Job Alert Modal */}
      {showAlertModal && (
        <div style={{ position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', margin: '5% auto', padding: '2rem', borderRadius: '10px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Set Up Job Alerts</h2>
              <button
                onClick={() => setShowAlertModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>Get notified when jobs matching your preferences are posted!</p>
            <button
              onClick={() => {
                alert('Job alert created successfully!')
                setShowAlertModal(false)
              }}
              style={{ background: '#ff6b35', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
            >
              Create Alert
            </button>
          </div>
        </div>
      )}
    </div>
  )
}