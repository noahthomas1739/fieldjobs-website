// Simple test to debug application status update
const testData = {
  applicationId: 1, // Replace with actual ID
  status: 'shortlisted',
  userId: 'af721370-88a8-47d0-85ce-3f2f9c826439' // Replace with actual user ID
}

console.log('Testing application update with:', testData)

fetch('https://field-jobs.co/api/applications', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Response status:', response.status)
  return response.json()
})
.then(data => {
  console.log('Response data:', data)
})
.catch(error => {
  console.error('Error:', error)
})
