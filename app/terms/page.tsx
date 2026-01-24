import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'FieldJobs Terms of Service - Rules and guidelines for using our job board platform.',
}

export default function TermsOfService() {
  const lastUpdated = 'January 19, 2026'
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last Updated: {lastUpdated}</p>
          
          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                Welcome to FieldJobs. By accessing or using our website at field-jobs.co (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our Service.
              </p>
            <p className="text-gray-700">
                We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                FieldJobs is an online job board platform that connects job seekers with employers in the energy, construction, nuclear, and industrial sectors. Our services include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Job listing and search functionality</li>
                <li>Resume upload and profile creation</li>
                <li>Job application submission</li>
                <li>Employer job posting and candidate search</li>
                <li>Job alerts and notifications</li>
                <li>Premium features and subscriptions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">3.1 Registration</h3>
              <p className="text-gray-700 mb-4">
                To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and keep your account information updated.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">3.2 Account Security</h3>
            <p className="text-gray-700 mb-4">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately of any unauthorized use.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">3.3 Account Types</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li><strong>Job Seeker accounts:</strong> For individuals seeking employment</li>
                <li><strong>Employer accounts:</strong> For companies posting jobs and searching candidates</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Job Seeker Terms</h2>
              <p className="text-gray-700 mb-4">As a job seeker, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Provide truthful and accurate information in your profile and resume</li>
                <li>Only apply for jobs you are genuinely interested in and qualified for</li>
                <li>Not misrepresent your qualifications, experience, or credentials</li>
                <li>Maintain professional conduct in all communications with employers</li>
                <li>Acknowledge that job listings are provided by third-party employers</li>
              </ul>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Employer Terms</h2>
              <p className="text-gray-700 mb-4">As an employer, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Post only legitimate job opportunities at your organization</li>
                <li>Provide accurate job descriptions, requirements, and compensation information</li>
                <li>Comply with all applicable employment and anti-discrimination laws</li>
                <li>Not post fraudulent, misleading, or illegal job listings</li>
                <li>Not use candidate information for purposes other than recruitment</li>
                <li>Not share, sell, or distribute candidate data to third parties</li>
                <li>Respond to applicants in a timely and professional manner</li>
                <li>Not discriminate based on race, color, religion, sex, national origin, age, disability, or other protected characteristics</li>
            </ul>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Prohibited Conduct</h2>
              <p className="text-gray-700 mb-4">You agree NOT to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Use the Service for any illegal purpose</li>
                <li>Post false, misleading, or fraudulent content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Scrape, crawl, or collect data from the Service without permission</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Upload viruses, malware, or harmful code</li>
                <li>Impersonate another person or entity</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Circumvent any access restrictions or security measures</li>
                <li>Post spam, advertisements, or promotional content</li>
                <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">7.1 Our Content</h3>
              <p className="text-gray-700 mb-4">
                The Service and its original content (excluding user-submitted content), features, and functionality are owned by FieldJobs and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">7.2 User Content</h3>
              <p className="text-gray-700 mb-4">
                You retain ownership of content you submit (resumes, job listings, etc.). By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection with the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">7.3 Copyright Complaints</h3>
              <p className="text-gray-700">
                If you believe content on our Service infringes your copyright, contact us at <a href="mailto:legal@field-jobs.co" className="text-orange-500 hover:underline">legal@field-jobs.co</a> with details of the alleged infringement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Payments and Subscriptions</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">8.1 Pricing</h3>
              <p className="text-gray-700 mb-4">
                Certain features require payment. Prices are displayed on our website and may change with notice. All prices are in US dollars unless otherwise stated.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">8.2 Billing</h3>
              <p className="text-gray-700 mb-4">
                Subscriptions are billed in advance on a monthly or annual basis. By subscribing, you authorize us to charge your payment method automatically until you cancel.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">8.3 Cancellation</h3>
              <p className="text-gray-700 mb-4">
                You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial periods.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">8.4 Refunds</h3>
              <p className="text-gray-700">
                One-time purchases (single job posts, credit packs) are generally non-refundable. Refund requests may be considered on a case-by-case basis within 7 days of purchase.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>MERCHANTABILITY</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>NON-INFRINGEMENT</li>
                <li>ACCURACY OR COMPLETENESS OF CONTENT</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We do not guarantee that job listings are accurate, that employers will respond to applications, or that use of the Service will result in employment. We do not endorse any employer, job listing, or job seeker.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, FIELDJOBS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Loss of profits or revenue</li>
                <li>Loss of data</li>
                <li>Loss of employment opportunities</li>
                <li>Damages arising from use or inability to use the Service</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless FieldJobs, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including attorney fees) arising from your use of the Service, violation of these Terms, or infringement of any rights of another party.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Violation of these Terms</li>
                <li>Fraudulent or illegal activity</li>
                <li>At our sole discretion</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Upon termination, your right to use the Service ceases immediately. Provisions that by nature should survive termination shall survive.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
            <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws of the State of Texas, United States, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in Texas.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Dispute Resolution</h2>
              <p className="text-gray-700 mb-4">
                Before filing a claim, you agree to attempt to resolve disputes informally by contacting us. If informal resolution fails, any dispute shall be resolved through binding arbitration in accordance with the American Arbitration Association rules, except that you may bring claims in small claims court if eligible.
              </p>
            <p className="text-gray-700">
                <strong>CLASS ACTION WAIVER:</strong> You agree to resolve disputes individually and waive any right to participate in class action lawsuits or class-wide arbitration.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Severability</h2>
            <p className="text-gray-700">
                If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">16. Entire Agreement</h2>
            <p className="text-gray-700">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and FieldJobs regarding use of the Service.
            </p>
          </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">17. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700"><strong>FieldJobs</strong></p>
                <p className="text-gray-700">Email: <a href="mailto:legal@field-jobs.co" className="text-orange-500 hover:underline">legal@field-jobs.co</a></p>
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
