import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Navbar } from '@/components/Navbar'
import Footer from '@/components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'FieldJobs - Technical Careers in Energy, Construction & Industrial',
    template: '%s | FieldJobs'
  },
  description: 'Find technical careers in energy, construction, nuclear, and industrial sectors. Connect skilled professionals with top employers in field-based technical roles.',
  keywords: [
    'technical jobs',
    'field jobs', 
    'energy careers',
    'construction jobs',
    'nuclear jobs',
    'industrial careers',
    'technical professionals',
    'skilled trades',
    'engineering jobs',
    'field technician jobs'
  ],
  authors: [{ name: 'FieldJobs' }],
  creator: 'FieldJobs',
  publisher: 'FieldJobs',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://field-jobs.co'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://field-jobs.co',
    title: 'FieldJobs - Technical Careers in Energy, Construction & Industrial',
    description: 'Find technical careers in energy, construction, nuclear, and industrial sectors. Connect skilled professionals with top employers.',
    siteName: 'FieldJobs',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FieldJobs - Technical Career Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FieldJobs - Technical Careers in Energy, Construction & Industrial',
    description: 'Find technical careers in energy, construction, nuclear, and industrial sectors.',
    images: ['/og-image.jpg'],
    creator: '@fieldjobs',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon - Gear only for better recognition */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta name="msapplication-TileImage" content="/favicon.svg" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "FieldJobs",
              "url": "https://field-jobs.co",
              "description": "Technical career platform for energy, construction, and industrial professionals",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://field-jobs.co/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script>
        
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}