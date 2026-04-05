-- =============================================
-- Migration: Remove Organization Field
-- Description: Drops the organization column from profiles and bookings tables.
-- =============================================

-- 1. Drop the columns from public tables
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS organization;

-- 2. Update the handle_new_user() trigger function
-- This function maps auth.users metadata to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    department, 
    contact_number
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'borrower'),
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'contact_number'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: No changes needed to the trigger itself (on_auth_user_created) 
-- as it just calls this updated function.
