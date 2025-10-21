'use client'

import { useState } from 'react'

interface SecureResumeViewerProps {
  resumeUrl: string
  resumeFilename?: string
  applicantName: string
  onClose: () => void
}

export default function SecureResumeViewer({ 
  resumeUrl, 
  resumeFilename, 
  applicantName,
  onClose 
}: SecureResumeViewerProps) {
  const [isLoading, setIsLoading] = useState(true)

  // Prevent right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    return false
  }

  // Prevent keyboard shortcuts for saving/printing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent Ctrl+S (Save), Ctrl+P (Print), Ctrl+C (Copy)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'c')) {
      e.preventDefault()
      return false
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold">Resume - {applicantName}</h2>
            <p className="text-sm text-gray-500">{resumeFilename || 'Resume.pdf'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-3"
          >
            ✕
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Confidential Document:</strong> This resume is for viewing only. Downloading, copying, or printing is disabled to protect candidate privacy.
              </p>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 p-4 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading resume...</p>
              </div>
            </div>
          )}
          <iframe
            src={`/api/secure-resume?url=${encodeURIComponent(resumeUrl)}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full border border-gray-300 rounded"
            title={`Resume - ${applicantName}`}
            onLoad={() => setIsLoading(false)}
            onContextMenu={handleContextMenu}
            style={{
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
          />
        </div>

        {/* Footer with instructions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Use your browser's zoom controls to adjust the view
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Overlay to prevent interaction with iframe */}
      <style jsx>{`
        iframe {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  )
}

