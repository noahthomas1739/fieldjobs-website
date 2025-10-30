// components/SubscriptionManagement.js
'use client'

import { useState, useEffect } from 'react'

const SubscriptionManagement = ({ user, subscription, onSubscriptionUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [billingHistory, setBillingHistory] = useState([])
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [scheduledChanges, setScheduledChanges] = useState([])

  useEffect(() => {
    if (activeTab === 'billing' && subscription?.stripe_customer_id) {
      loadBillingHistory()
    }
    // Load scheduled changes when component mounts or user changes
    if (user?.id) {
      loadScheduledChanges()
    }
  }, [activeTab, subscription, user?.id])

  const loadBillingHistory = async () => {
    try {
      setIsLoading(true)
      console.log('📜 Loading billing history for user:', user.id)
      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_billing_history',
          userId: user.id
        })
      })

      const data = await response.json()
      console.log('📜 Billing history response:', data)
      if (data.success) {
        console.log('✅ Setting billing history:', data.billingHistory?.length || 0, 'invoices')
        setBillingHistory(data.billingHistory || [])
      } else {
        console.error('❌ Error loading billing history:', data.error)
        alert(`Unable to load billing history: ${data.message || data.error}`)
      }
    } catch (error) {
      console.error('❌ Error loading billing history:', error)
      alert('Error loading billing history. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadScheduledChanges = async () => {
    try {
      const response = await fetch(`/api/subscription-schedule-status?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success && data.scheduledChanges) {
        setScheduledChanges(data.scheduledChanges)
        console.log('📅 Loaded scheduled changes:', data.scheduledChanges)
      }
    } catch (error) {
      console.error('Error loading scheduled changes:', error)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          userId: user.id
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        onSubscriptionUpdate()
        setShowCancelConfirm(false)
      } else {
        alert('Error cancelling subscription. Please try again.')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Error cancelling subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reactivate',
          userId: user.id
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('✅ Subscription reactivated successfully!')
        onSubscriptionUpdate()
      } else {
        alert('Error reactivating subscription. Please try again.')
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      alert('Error reactivating subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgradeSubscription = async (newPriceId, planName) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upgrade_immediate',
          userId: user.id,
          newPriceId: newPriceId,
          newPlanType: planName.toLowerCase()
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ Successfully upgraded to ${planName} plan!`)
        onSubscriptionUpdate()
        loadScheduledChanges() // Reload scheduled changes
        setShowUpgradeModal(false)
      } else {
        alert('Error upgrading subscription. Please try again.')
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Error upgrading subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDowngradeSubscription = async (newPriceId, planName) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'downgrade_end_cycle',
          userId: user.id,
          newPriceId: newPriceId,
          newPlanType: planName.toLowerCase()
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        onSubscriptionUpdate()
        loadScheduledChanges() // Reload scheduled changes
      } else {
        // Show detailed error message for job slot issues
        if (data.requiresAction && data.activeJobCount && data.newJobLimit) {
          alert(`⚠️ ${data.message}\n\nYou have ${data.activeJobCount} active jobs, but the new plan only allows ${data.newJobLimit}.\n\nPlease go to the Jobs tab and deactivate ${data.excessJobs} job${data.excessJobs > 1 ? 's' : ''} before downgrading.`)
        } else {
          alert(`Error scheduling downgrade: ${data.message || data.error || 'Please try again.'}`)
        }
      }
    } catch (error) {
      console.error('Error scheduling downgrade:', error)
      alert('Error scheduling downgrade. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBillingPortal = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_billing_portal',
          userId: user.id
        })
      })

      const data = await response.json()
      if (data.success) {
        window.open(data.url, '_blank')
      } else {
        alert('Error accessing billing portal. Please try again.')
      }
    } catch (error) {
      console.error('Error accessing billing portal:', error)
      alert('Error accessing billing portal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getPlanDisplayName = (planType) => {
    const names = {
      'free': 'Free Account',
      'single_job': 'Single Job Purchase',
      'starter': 'Starter Plan',
      'professional': 'Professional Plan',
      'enterprise': 'Enterprise Plan'
    }
    return names[planType] || planType
  }

  const getNextBillingDate = () => {
    if (subscription?.current_period_end) {
      return formatDate(subscription.current_period_end)
    }
    return 'N/A'
  }

  const isSubscriptionCancelled = subscription?.status === 'cancelled' || subscription?.cancelled_at

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold mb-6">Subscription Management</h3>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'billing', label: 'Billing History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id 
                ? 'text-orange-500 border-b-2 border-orange-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan Status */}
          <div className={`p-6 rounded-lg ${isSubscriptionCancelled ? 'bg-red-50 border border-red-200' : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className={`text-xl font-bold ${isSubscriptionCancelled ? 'text-red-800' : 'text-white'}`}>
                  {getPlanDisplayName(subscription?.plan_type || 'free')}
                  {isSubscriptionCancelled && (
                    <span className="ml-2 text-sm bg-red-600 text-white px-2 py-1 rounded-full">
                      Cancelled
                    </span>
                  )}
                </div>
                <div className={`${isSubscriptionCancelled ? 'text-red-700' : 'text-white'}`}>
                  {subscription?.plan_type === 'free' 
                    ? 'Upgrade to unlock premium features'
                    : subscription?.plan_type === 'single_job'
                    ? `${subscription?.active_jobs_limit || 0} job posting${subscription?.active_jobs_limit !== 1 ? 's' : ''} available`
                    : isSubscriptionCancelled
                    ? `Active until ${getNextBillingDate()}`
                    : `${formatPrice(subscription?.price || 0)}/month • Next billing: ${getNextBillingDate()}`
                  }
                </div>
              </div>
              
              {subscription?.plan_type !== 'free' && subscription?.plan_type !== 'single_job' && (
                <div className="flex gap-2">
                  {isSubscriptionCancelled ? (
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={isLoading}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {isLoading ? 'Processing...' : 'Reactivate'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="bg-white text-orange-500 hover:bg-gray-50 px-4 py-2 rounded-lg"
                    >
                      Change Plan
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Changes Alert */}
          {scheduledChanges.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">📅 Upcoming Changes</h4>
              {scheduledChanges.map((change, index) => (
                <div key={change.id || index} className="text-blue-700">
                  Your plan will change from <strong>{change.currentPlan}</strong> to <strong>{change.newPlan}</strong> on{' '}
                  <strong>{formatDate(change.effectiveDate)}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Plan Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-500">
                {subscription?.active_jobs_limit === 999999 ? '∞' : (subscription?.active_jobs_limit || 0)}
              </div>
              <div className="text-sm text-gray-600">Active Job Limit</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-500">
                {subscription?.credits === 999999 ? '∞' : (subscription?.credits || 0)}
              </div>
              <div className="text-sm text-gray-600">Resume Credits</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-500">
                {subscription?.plan_type === 'free' ? '30 days' : '∞'}
              </div>
              <div className="text-sm text-gray-600">Job Duration</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Actions</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('billing')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                View Billing History
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
              >
                {subscription?.plan_type === 'free' || subscription?.plan_type === 'single_job' ? 'Upgrade Plan' : 'Change Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plans Tab - REMOVED */}
      {false && (
        <div className="space-y-6">
          <h4 className="text-lg font-semibold">Subscription Plans</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Starter Plan */}
            <div className={`border-2 rounded-lg p-6 ${subscription?.plan_type === 'starter' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
              <div className="text-center">
                <div className="text-xl font-bold mb-2">Starter</div>
                <div className="text-3xl font-bold text-orange-500 mb-2">$199</div>
                <div className="text-gray-600 mb-4">per month</div>
                <ul className="text-left space-y-2 mb-6 text-sm">
                  <li>✓ 3 active job postings</li>
                  <li>✓ Jobs stay active indefinitely</li>
                  <li>✓ Basic applicant management</li>
                  <li>✓ Email support</li>
                </ul>
                
                {subscription?.plan_type === 'starter' ? (
                  <div className="bg-orange-500 text-white py-2 px-4 rounded-lg">
                    Current Plan
                  </div>
                ) : subscription?.plan_type === 'free' ? (
                  <button
                    onClick={() => handleUpgradeSubscription(process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '', 'Starter')}
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Upgrade Now'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleDowngradeSubscription(process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '', 'Starter')}
                    disabled={isLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Downgrade'}
                  </button>
                )}
              </div>
            </div>

            {/* Growth Plan */}
            <div className={`border-2 rounded-lg p-6 relative ${subscription?.plan_type === 'growth' ? 'border-orange-500 bg-orange-50' : 'border-orange-300 bg-orange-50'}`}>
              {subscription?.plan_type !== 'growth' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                  MOST POPULAR
                </div>
              )}
              <div className="text-center">
                <div className="text-xl font-bold mb-2">Growth</div>
                <div className="text-3xl font-bold text-orange-500 mb-2">$299</div>
                <div className="text-gray-600 mb-4">per month</div>
                <ul className="text-left space-y-2 mb-6 text-sm">
                  <li>✓ 6 active job postings</li>
                  <li>✓ Jobs stay active indefinitely</li>
                  <li>✓ Resume credits included</li>
                  <li>✓ Priority support</li>
                </ul>
                
                {subscription?.plan_type === 'growth' ? (
                  <div className="bg-orange-500 text-white py-2 px-4 rounded-lg">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const isUpgrade = subscription?.plan_type === 'free' || subscription?.plan_type === 'starter';
                      if (isUpgrade) {
                        handleUpgradeSubscription(process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID || '', 'Growth');
                      } else {
                        handleDowngradeSubscription(process.env.NEXT_PUBLIC_STRIPE_GROWTH_PLAN_PRICE_ID || '', 'Growth');
                      }
                    }}
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : (subscription?.plan_type === 'professional' || subscription?.plan_type === 'enterprise') ? 'Downgrade' : 'Upgrade Now'}
                  </button>
                )}
              </div>
            </div>

            {/* Professional Plan */}
            <div className={`border-2 rounded-lg p-6 ${subscription?.plan_type === 'professional' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
              <div className="text-center">
                <div className="text-xl font-bold mb-2">Professional</div>
                <div className="text-3xl font-bold text-orange-500 mb-2">$599</div>
                <div className="text-gray-600 mb-4">per month</div>
                <ul className="text-left space-y-2 mb-6 text-sm">
                  <li>✓ 15 active job postings</li>
                  <li>✓ Jobs stay active indefinitely</li>
                  <li>✓ 25 resume credits</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Featured listings</li>
                </ul>
                
                {subscription?.plan_type === 'professional' ? (
                  <div className="bg-orange-500 text-white py-2 px-4 rounded-lg">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => subscription?.plan_type === 'enterprise' 
                      ? handleDowngradeSubscription(process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || '', 'Professional')
                      : handleUpgradeSubscription(process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || '', 'Professional')
                    }
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : subscription?.plan_type === 'enterprise' ? 'Downgrade' : 'Upgrade Now'}
                  </button>
                )}
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className={`border-2 rounded-lg p-6 ${subscription?.plan_type === 'enterprise' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
              <div className="text-center">
                <div className="text-xl font-bold mb-2">Enterprise</div>
                <div className="text-3xl font-bold text-purple-600 mb-2">$1,999</div>
                <div className="text-gray-600 mb-4">per month</div>
                <ul className="text-left space-y-2 mb-6 text-sm">
                  <li>✓ Unlimited job postings</li>
                  <li>✓ Jobs stay active indefinitely</li>
                  <li>✓ Unlimited resume access</li>
                  <li>✓ Dedicated account manager</li>
                </ul>
                
                {subscription?.plan_type === 'enterprise' ? (
                  <div className="bg-orange-500 text-white py-2 px-4 rounded-lg">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgradeSubscription(process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '', 'Enterprise')}
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Upgrade Now'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing History Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription Management Section */}
          {subscription?.plan_type !== 'free' && isSubscriptionCancelled && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">Subscription Management</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleReactivateSubscription}
                  disabled={isLoading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Reactivate Subscription'}
                </button>
              </div>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  ⚠️ Your subscription is cancelled and will end on {getNextBillingDate()}. You can reactivate it before then to continue your plan.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">Billing History</h4>
            <button
              onClick={loadBillingHistory}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {billingHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-gray-500">No billing history available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {billingHistory.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {invoice.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatPrice(invoice.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.hosted_invoice_url && (
                          <a 
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 font-medium"
                          >
                            View Invoice →
                          </a>
                        )}
                        {!invoice.hosted_invoice_url && invoice.invoice_pdf && (
                          <a 
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 font-medium"
                          >
                            Download PDF →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MOVED: Cancel subscription link to bottom - small and subtle */}
          {subscription?.plan_type !== 'free' && !isSubscriptionCancelled && (
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={isLoading}
                className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-50 transition-colors"
              >
                Cancel subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Cancel Subscription</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? Your account will remain active until the end of your current billing period ({getNextBillingDate()}).
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionManagement
