import Stripe from 'stripe'

// Server-side Stripe (only for API routes)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export { stripe }
