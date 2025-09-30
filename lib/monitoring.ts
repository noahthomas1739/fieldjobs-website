// Error monitoring and analytics utilities

export function logError(error: Error, context?: Record<string, any>) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error)
    console.error('Context:', context)
  }
  
  // In production, you can integrate with Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // Example Sentry integration:
    // Sentry.captureException(error, { extra: context })
    
    // For now, we'll use a simple API call to log errors
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail to avoid infinite error loops
    })
  }
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // Google Analytics 4 event tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties)
  }
  
  // In production, you might also want to track to other analytics services
  if (process.env.NODE_ENV === 'production') {
    // Example: Mixpanel, Amplitude, etc.
  }
}

// Performance monitoring
export function measurePerformance(name: string, fn: (...args: any[]) => Promise<any>) {
  return async (...args: any[]) => {
    const start = performance.now()
    try {
      const result = await fn(...args)
      const duration = performance.now() - start
      
      // Track performance metrics
      trackEvent('performance_measurement', {
        name,
        duration,
        success: true,
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      trackEvent('performance_measurement', {
        name,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
      
      logError(error as Error, { functionName: name })
      throw error
    }
  }
}

// Type definitions for gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void
  }
}
