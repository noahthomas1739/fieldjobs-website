import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

/**
 * Browser-only Stripe.js loader. Do not import server Stripe from the same module.
 */
export function getStripe() {
  const key =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      : undefined
  if (!key || !String(key).trim()) {
    return Promise.resolve(null)
  }
  if (!stripePromise) {
    stripePromise = loadStripe(String(key).trim())
  }
  return stripePromise
}
