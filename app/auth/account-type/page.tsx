'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AccountTypePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Temporarily redirect to dashboard
    router.push('/dashboard')
  }, [router])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to dashboard...</p>
    </div>
  )
}
