export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Contact Us</h1>
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-6">Get in Touch</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>General Inquiry</option>
                  <option>Technical Support</option>
                  <option>Job Posting Issue</option>
                  <option>Account Problem</option>
                  <option>Partnership Opportunity</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea 
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please describe your inquiry..."
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 mt-1">📧</div>
                  <div>
                    <h3 className="font-medium">General Support</h3>
                    <a href="mailto:support@field-jobs.co" className="text-blue-600 hover:underline">
                      support@field-jobs.co
                    </a>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 mt-1">💼</div>
                  <div>
                    <h3 className="font-medium">Employer Services</h3>
                    <a href="mailto:employers@field-jobs.co" className="text-blue-600 hover:underline">
                      employers@field-jobs.co
                    </a>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 mt-1">🔒</div>
                  <div>
                    <h3 className="font-medium">Privacy & Legal</h3>
                    <a href="mailto:privacy@field-jobs.co" className="text-blue-600 hover:underline">
                      privacy@field-jobs.co
                    </a>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 mt-1">🚨</div>
                  <div>
                    <h3 className="font-medium">Report Issues</h3>
                    <a href="mailto:abuse@field-jobs.co" className="text-blue-600 hover:underline">
                      abuse@field-jobs.co
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-xl font-semibold mb-6">Response Times</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>General inquiries:</span>
                  <span className="font-medium">24-48 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical support:</span>
                  <span className="font-medium">12-24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Urgent issues:</span>
                  <span className="font-medium">2-6 hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
