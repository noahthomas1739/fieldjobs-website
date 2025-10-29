-- Create one_time_payments table for tracking single job purchases and other one-time payments
CREATE TABLE IF NOT EXISTS public.one_time_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('single_job', 'resume_credits_10', 'resume_credits_25', 'resume_credits_50')),
    amount_paid DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_session_id TEXT UNIQUE,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_one_time_payments_user_id ON public.one_time_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_payments_status ON public.one_time_payments(status);
CREATE INDEX IF NOT EXISTS idx_one_time_payments_payment_type ON public.one_time_payments(payment_type);

-- Enable RLS
ALTER TABLE public.one_time_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own one-time payments" ON public.one_time_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own one-time payments" ON public.one_time_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for webhook processing
CREATE POLICY "Service role can manage all one-time payments" ON public.one_time_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.one_time_payments IS 'Tracks one-time payments like single job purchases and resume credit packs';
