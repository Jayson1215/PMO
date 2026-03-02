-- =============================================
-- Patch: Fix infinite recursion in RLS policies,
--        handle_new_user trigger, and booking policy
-- Run this in Supabase SQL Editor (new query tab)
-- =============================================

-- =============================================
-- FIX 0: Clean up orphaned auth users
-- =============================================
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
  AND created_at < NOW() - INTERVAL '1 minute';

-- =============================================
-- FIX 1: SECURITY DEFINER helper to check admin role
-- This bypasses RLS so policies don't self-reference profiles
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================
-- FIX 2: Replace ALL profiles policies (fixes infinite recursion)
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- =============================================
-- FIX 3: Replace equipment policies to use is_admin()
-- =============================================
DROP POLICY IF EXISTS "Admins can insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins can update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins can delete equipment" ON public.equipment;

CREATE POLICY "Admins can insert equipment"
  ON public.equipment FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update equipment"
  ON public.equipment FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete equipment"
  ON public.equipment FOR DELETE
  USING (public.is_admin());

-- =============================================
-- FIX 4: Replace equipment_categories admin policy
-- =============================================
DROP POLICY IF EXISTS "Admins can manage categories" ON public.equipment_categories;

CREATE POLICY "Admins can manage categories"
  ON public.equipment_categories FOR ALL
  USING (public.is_admin());

-- =============================================
-- FIX 5: Replace bookings admin + borrower policies
-- =============================================
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON public.bookings;
DROP POLICY IF EXISTS "Borrowers can update own pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Borrowers can cancel own pending bookings" ON public.bookings;

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update any booking"
  ON public.bookings FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Borrowers can cancel own pending bookings"
  ON public.bookings FOR UPDATE
  USING (borrower_id = auth.uid() AND status = 'pending')
  WITH CHECK (borrower_id = auth.uid() AND status = 'cancelled');

-- =============================================
-- FIX 6: Replace audit_logs admin policy
-- =============================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- =============================================
-- FIX 7: Replace damage_reports admin policies
-- =============================================
DROP POLICY IF EXISTS "Admins can view all damage reports" ON public.damage_reports;
DROP POLICY IF EXISTS "Admins can update damage reports" ON public.damage_reports;

CREATE POLICY "Admins can view all damage reports"
  ON public.damage_reports FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update damage reports"
  ON public.damage_reports FOR UPDATE
  USING (public.is_admin());

-- =============================================
-- FIX 8: Replace storage admin policies
-- =============================================
DROP POLICY IF EXISTS "Admins can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete equipment images" ON storage.objects;

CREATE POLICY "Admins can upload equipment images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'equipment-images' AND public.is_admin());

CREATE POLICY "Admins can delete equipment images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'equipment-images' AND public.is_admin());

-- =============================================
-- FIX 9: Robust handle_new_user trigger
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department, organization, contact_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    'borrower',
    NULLIF(NEW.raw_user_meta_data->>'department', ''),
    NULLIF(NEW.raw_user_meta_data->>'organization', ''),
    NULLIF(NEW.raw_user_meta_data->>'contact_number', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    department = COALESCE(EXCLUDED.department, public.profiles.department),
    organization = COALESCE(EXCLUDED.organization, public.profiles.organization),
    contact_number = COALESCE(EXCLUDED.contact_number, public.profiles.contact_number),
    updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
