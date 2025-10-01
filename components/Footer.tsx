import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">FieldJobs</h3>
            <p className="text-gray-300 text-sm">
              Connecting skilled professionals with technical careers across energy, construction, and industrial sectors.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">📧</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">📱</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">🔗</a>
            </div>
          </div>

          {/* For Job Seekers */}
          <div>
            <h4 className="font-semibold mb-4">For Job Seekers</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Browse Jobs</Link></li>
              <li><Link href="/dashboard?tab=profile" className="hover:text-white transition-colors">Create Profile</Link></li>
              <li><Link href="/dashboard?tab=alerts" className="hover:text-white transition-colors">Job Alerts</Link></li>
              <li><Link href="/resources" className="hover:text-white transition-colors">Career Resources</Link></li>
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h4 className="font-semibold mb-4">For Employers</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/employers" className="hover:text-white transition-colors">Post Jobs</Link></li>
              <li><Link href="/employer" className="hover:text-white transition-colors">Employer Dashboard</Link></li>
              <li><Link href="/employer?tab=resume-search" className="hover:text-white transition-colors">Search Resumes</Link></li>
              <li><Link href="/employers" className="hover:text-white transition-colors">Pricing Plans</Link></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="font-semibold mb-4">Legal & Support</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><a href="mailto:support@field-jobs.co" className="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} FieldJobs. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
