// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Redirect field-job.com to field-jobs.co
  if (hostname.includes('field-job.com')) {
    const url = request.nextUrl.clone()
    url.host = 'field-jobs.co'
    url.protocol = 'https'
    
    // 308 = Permanent Redirect (preserves HTTP method)
    return NextResponse.redirect(url, 308)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
