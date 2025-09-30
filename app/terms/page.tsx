export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          
          <section>
            <h2 className="text-xl font-semibold mb-4">Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using FieldJobs, you accept and agree to be bound by the terms 
              and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Use License</h2>
            <p className="text-gray-700 mb-4">
              Permission is granted to temporarily use FieldJobs for personal, non-commercial 
              job searching and recruitment purposes.
            </p>
            <p className="text-gray-700">This license shall automatically terminate if you violate any of these restrictions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">User Accounts</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must provide accurate and complete information</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You must be at least 18 years old to create an account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Prohibited Uses</h2>
            <p className="text-gray-700 mb-4">You may not use our service:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>To post false, misleading, or fraudulent job listings or applications</li>
              <li>To harass, abuse, or harm other users</li>
              <li>To transmit spam or unsolicited communications</li>
              <li>To violate any laws or regulations</li>
              <li>To scrape or collect data without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Content Ownership</h2>
            <p className="text-gray-700">
              You retain ownership of content you submit, but grant us license to use, 
              display, and distribute your content on our platform for job matching purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Disclaimer</h2>
            <p className="text-gray-700">
              FieldJobs is provided "as is" without warranties of any kind. We do not guarantee 
              the accuracy of job listings or the success of job applications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-gray-700">
              In no event shall FieldJobs be liable for any indirect, incidental, special, 
              consequential or punitive damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <p className="text-gray-700">
              Questions about the Terms of Service should be sent to{' '}
              <a href="mailto:legal@field-jobs.co" className="text-blue-600 hover:underline">
                legal@field-jobs.co
              </a>
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}