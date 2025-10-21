import { useEffect, useRef } from 'react'

export function useJobViewTracking(jobId: string | number | null | undefined, userId: string | null | undefined = null) {
  const hasTracked = useRef(false)
  const trackingTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!jobId || hasTracked.current) return

    // Track view after a short delay to ensure it's a real view
    trackingTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/track-job-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId,
            userId,
            userAgent: navigator.userAgent,
            referrer: document.referrer
          })
        })

        if (response.ok) {
          console.log('📊 Job view tracked successfully')
          hasTracked.current = true
        } else {
          console.error('❌ Failed to track job view')
        }
      } catch (error) {
        console.error('❌ Error tracking job view:', error)
      }
    }, 2000) // Track after 2 seconds

    return () => {
      if (trackingTimeout.current) {
        clearTimeout(trackingTimeout.current)
      }
    }
  }, [jobId, userId])

  return { hasTracked: hasTracked.current }
}
