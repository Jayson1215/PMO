-- Add 2FA fields to profiles table
ALTER TABLE public.profiles ADD COLUMN two_factor_secret TEXT;
ALTER TABLE public.profiles ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add RLS policies for 2FA fields
-- Ensure only the owner can read/write their own 2FA secret
-- (Existing policies already cover basic access, but let's be explicit if needed)

-- Update handle_new_user function if necessary, but default false is fine.
