export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                We collect information you provide directly to us, such as when you create an account, 
                apply for jobs, or contact us for support.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">For Job Seekers:</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Personal information (name, email, phone number)</li>
                <li>Professional information (resume, work history, skills)</li>
                <li>Job preferences and availability</li>
                <li>Security clearance information (if applicable)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">For Employers:</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Company information (name, website, contact details)</li>
                <li>Job postings and requirements</li>
                <li>Billing and payment information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>To provide and improve our services</li>
                <li>To match job seekers with relevant opportunities</li>
                <li>To communicate with you about jobs and updates</li>
                <li>To process payments and maintain accounts</li>
                <li>To ensure platform security and prevent fraud</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information Sharing</h2>
              <p className="text-gray-700 mb-4">
                We do not sell your personal information. We may share your information in these situations:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>With employers when you apply to their jobs</li>
                <li>With service providers who help us operate our platform</li>
                <li>When required by law or to protect our rights</li>
                <li>In connection with a business transfer or acquisition</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700 mb-4">
                We use industry-standard security measures to protect your information, including 
                encryption, secure servers, and regular security audits.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@fieldjobs.com" className="text-orange-600 hover:text-orange-700">
                  privacy@fieldjobs.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}