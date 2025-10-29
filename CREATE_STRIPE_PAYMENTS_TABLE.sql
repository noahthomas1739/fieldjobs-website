-- Create stripe_payments table for tracking all Stripe-related payments
CREATE TABLE IF NOT EXISTS public.stripe_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('single_job', 'resume_credits_10', 'resume_credits_25', 'resume_credits_50', 'subscription', 'featured_listing', 'urgent_badge')),
    amount_paid DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    job_title TEXT,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user_id ON public.stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON public.stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_payment_type ON public.stripe_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_stripe_session_id ON public.stripe_payments(stripe_session_id);

-- Enable RLS
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stripe payments" ON public.stripe_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stripe payments" ON public.stripe_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for webhook processing
CREATE POLICY "Service role can manage all stripe payments" ON public.stripe_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.stripe_payments IS 'Tracks all Stripe payments including single jobs, resume credits, subscriptions, and job features';
