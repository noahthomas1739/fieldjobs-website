'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function ResumeViewerContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')

  useEffect(() => {
    const url = searchParams.get('url')
    if (url) {
      // Use our secure API to fetch the PDF
      setPdfUrl(`/api/secure-resume?url=${encodeURIComponent(url)}`)
      setLoading(false)
    } else {
      setError('No resume URL provided')
      setLoading(false)
    }
  }, [searchParams])

  // Prevent right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+S, Ctrl+P, Ctrl+Shift+S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S')) {
        e.preventDefault()
        return false
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resume...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div>
            <h1 className="font-semibold">Resume Viewer</h1>
            <p className="text-xs text-gray-400">Confidential - View Only</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-yellow-400 bg-yellow-900/30 px-3 py-1 rounded">
            🔒 Download Disabled
          </span>
          <button 
            onClick={() => window.close()}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-500 text-yellow-900 text-center py-2 text-sm font-medium">
        ⚠️ This document is confidential. Downloading, copying, or printing is prohibited.
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative">
        <iframe
          src={pdfUrl}
          className="w-full h-full absolute inset-0"
          style={{ 
            border: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          title="Resume Viewer"
        />
        {/* Overlay to prevent easy interaction with PDF controls */}
        <div 
          className="absolute top-0 right-0 w-12 h-12 bg-gray-800"
          style={{ pointerEvents: 'auto' }}
          title="Download disabled"
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 text-center py-2 text-xs">
        FieldJobs Resume Viewer • Confidential Document
      </div>

      <style jsx global>{`
        /* Hide print dialog */
        @media print {
          body * {
            display: none !important;
          }
          body::after {
            content: "Printing is disabled for confidential documents.";
            display: block;
            font-size: 24px;
            text-align: center;
            padding: 50px;
          }
        }
      `}</style>
    </div>
  )
}

export default function ResumeViewerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResumeViewerContent />
    </Suspense>
  )
}

