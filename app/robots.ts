import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/employer',
          '/auth/',
          '/api/',
          '/_next/',
          '/admin/',
        ],
      },
    ],
    sitemap: 'https://field-jobs.co/sitemap.xml',
  }
}
