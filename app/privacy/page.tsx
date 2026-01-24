import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'FieldJobs Privacy Policy - How we collect, use, and protect your personal information.',
}

export default function PrivacyPolicy() {
  const lastUpdated = 'January 19, 2026'
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last Updated: {lastUpdated}</p>
          
          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                FieldJobs ("we," "our," or "us") operates the website field-jobs.co (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
              <p className="text-gray-700">
                By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">We may collect personally identifiable information, including but not limited to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Name (first and last)</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Mailing address</li>
                <li>Resume and work history</li>
                <li>Professional skills and certifications</li>
                <li>Employment preferences</li>
                <li>Company information (for employers)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2">2.2 Payment Information</h3>
            <p className="text-gray-700 mb-4">
                When you make purchases, payment information is collected and processed by our payment processor, Stripe. We do not store complete credit card numbers on our servers. Please review <a href="https://stripe.com/privacy" className="text-orange-500 hover:underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a> for more information.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">2.3 Automatically Collected Information</h3>
              <p className="text-gray-700 mb-4">We automatically collect certain information when you visit our Service:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Device type</li>
                <li>Operating system</li>
                <li>Pages visited and time spent</li>
                <li>Referring website</li>
                <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use collected information for:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Providing and maintaining our Service</li>
                <li>Connecting job seekers with employers</li>
                <li>Processing job applications</li>
                <li>Sending job alerts and notifications</li>
                <li>Processing payments and subscriptions</li>
                <li>Responding to inquiries and support requests</li>
                <li>Improving our Service and user experience</li>
                <li>Detecting and preventing fraud</li>
                <li>Complying with legal obligations</li>
            </ul>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
              <p className="text-gray-700 mb-4">We may share your information in the following circumstances:</p>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">4.1 With Employers (Job Seekers)</h3>
              <p className="text-gray-700 mb-4">
                When you apply for a job or make your profile searchable, employers may view your resume, contact information, and professional details.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">4.2 With Job Seekers (Employers)</h3>
              <p className="text-gray-700 mb-4">
                Your company name and job posting details are visible to job seekers.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">4.3 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We share data with third-party service providers who assist in operating our Service, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Stripe (payment processing)</li>
                <li>Supabase (data storage and authentication)</li>
                <li>Vercel (website hosting)</li>
                <li>Email service providers</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2">4.4 Legal Requirements</h3>
              <p className="text-gray-700">
                We may disclose information if required by law, court order, or government request, or to protect our rights, property, or safety.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Secure database storage with access controls</li>
                <li>Regular security audits</li>
                <li>Employee training on data protection</li>
              </ul>
              <p className="text-gray-700 mt-4">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="text-gray-700 mb-4">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Withdraw consent:</strong> Withdraw previously given consent</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, contact us at <a href="mailto:privacy@field-jobs.co" className="text-orange-500 hover:underline">privacy@field-jobs.co</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. California Privacy Rights (CCPA)</h2>
              <p className="text-gray-700 mb-4">
                California residents have additional rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or disclosed</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>We do not sell personal information.</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies</h2>
            <p className="text-gray-700 mb-4">
                We use cookies and similar tracking technologies to improve your experience. Cookies are small files stored on your device. We use:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li><strong>Essential cookies:</strong> Required for basic functionality</li>
                <li><strong>Analytics cookies:</strong> Help us understand how visitors use our site</li>
                <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You can control cookies through your browser settings. Disabling cookies may affect site functionality.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Data Retention</h2>
            <p className="text-gray-700">
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700">
                Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected information from a child under 18, we will delete it promptly.
              </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-700">
                We may update this Privacy Policy periodically. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions or concerns about this Privacy Policy, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700"><strong>FieldJobs</strong></p>
                <p className="text-gray-700">Email: <a href="mailto:privacy@field-jobs.co" className="text-orange-500 hover:underline">privacy@field-jobs.co</a></p>
                <p className="text-gray-700">Website: <a href="https://field-jobs.co/contact" className="text-orange-500 hover:underline">field-jobs.co/contact</a></p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link href="/" className="text-orange-500 hover:text-orange-600 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
