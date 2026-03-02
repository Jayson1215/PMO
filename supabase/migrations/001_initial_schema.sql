-- =============================================
-- PMO Equipment Booking & Monitoring System
-- Father Saturnino Urios University (FSUU)
-- Complete Database Schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================
-- 1. CUSTOM TYPES / ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('admin', 'borrower');
CREATE TYPE equipment_status AS ENUM ('available', 'maintenance', 'unavailable');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'borrowed', 'returned', 'overdue', 'cancelled');
CREATE TYPE notification_type AS ENUM ('booking_confirmed', 'booking_approved', 'booking_rejected', 'reminder_2hr', 'reminder_30min', 'reminder_15min', 'overdue', 'returned');
CREATE TYPE equipment_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged');

-- =============================================
-- 2. USERS TABLE (extends Supabase auth.users)
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'borrower',
  department TEXT,
  organization TEXT,
  contact_number TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_department ON public.profiles(department);

-- =============================================
-- 3. EQUIPMENT CATEGORIES TABLE
-- =============================================

CREATE TABLE public.equipment_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- lucide icon name
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. EQUIPMENT TABLE
-- =============================================

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.equipment_categories(id) ON DELETE SET NULL,
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 1 CHECK (total_quantity >= 0),
  available_quantity INTEGER NOT NULL DEFAULT 1 CHECK (available_quantity >= 0),
  image_url TEXT,
  status equipment_status NOT NULL DEFAULT 'available',
  condition equipment_condition NOT NULL DEFAULT 'good',
  serial_number TEXT,
  location TEXT DEFAULT 'PMO Office',
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_available_lte_total CHECK (available_quantity <= total_quantity)
);

CREATE INDEX idx_equipment_status ON public.equipment(status);
CREATE INDEX idx_equipment_category ON public.equipment(category_id);
CREATE INDEX idx_equipment_available ON public.equipment(available_quantity) WHERE status = 'available';
CREATE INDEX idx_equipment_archived ON public.equipment(is_archived);

-- =============================================
-- 5. BOOKINGS TABLE
-- =============================================

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_code TEXT NOT NULL UNIQUE, -- Human-readable code e.g. PMO-2026-00001
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  borrower_name TEXT NOT NULL,
  borrower_email TEXT NOT NULL,
  department TEXT,
  organization TEXT,
  purpose TEXT NOT NULL,
  borrow_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ NOT NULL,
  actual_return_date TIMESTAMPTZ,
  status booking_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  returned_condition equipment_condition,
  damage_notes TEXT,
  damage_image_url TEXT,
  qr_code TEXT,
  reminder_2hr_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_30min_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_15min_sent BOOLEAN NOT NULL DEFAULT false,
  overdue_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_return_after_borrow CHECK (return_date > borrow_date)
);

CREATE INDEX idx_bookings_borrower ON public.bookings(borrower_id);
CREATE INDEX idx_bookings_equipment ON public.bookings(equipment_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_borrow_date ON public.bookings(borrow_date);
CREATE INDEX idx_bookings_return_date ON public.bookings(return_date);
CREATE INDEX idx_bookings_code ON public.bookings(booking_code);
CREATE INDEX idx_bookings_overdue ON public.bookings(status, return_date) 
  WHERE status IN ('approved', 'borrowed');

-- =============================================
-- 6. NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_booking ON public.notifications(booking_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- =============================================
-- 7. AUDIT LOG TABLE
-- =============================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at);

-- =============================================
-- 8. DAMAGE REPORTS TABLE
-- =============================================

CREATE TABLE public.damage_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe')),
  image_url TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_damage_equipment ON public.damage_reports(equipment_id);
CREATE INDEX idx_damage_booking ON public.damage_reports(booking_id);

-- =============================================
-- 9. BOOKING CODE SEQUENCE
-- =============================================

CREATE SEQUENCE booking_code_seq START 1;

-- Function to generate booking code
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_code := 'PMO-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
    LPAD(nextval('booking_code_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.booking_code IS NULL OR NEW.booking_code = '')
  EXECUTE FUNCTION generate_booking_code();

-- =============================================
-- 10. AUTO-UPDATE TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_equipment_updated
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 11. EQUIPMENT QUANTITY MANAGEMENT FUNCTION
-- =============================================

-- Reduce available quantity on booking approval
CREATE OR REPLACE FUNCTION on_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is approved/borrowed: reduce available quantity
  IF NEW.status IN ('approved', 'borrowed') AND OLD.status = 'pending' THEN
    UPDATE public.equipment
    SET available_quantity = available_quantity - NEW.quantity
    WHERE id = NEW.equipment_id AND available_quantity >= NEW.quantity;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient equipment quantity available';
    END IF;
  END IF;

  -- When booking is returned/cancelled/rejected: restore available quantity
  IF NEW.status IN ('returned', 'cancelled', 'rejected') 
     AND OLD.status IN ('approved', 'borrowed', 'overdue') THEN
    UPDATE public.equipment
    SET available_quantity = available_quantity + NEW.quantity
    WHERE id = NEW.equipment_id;
  END IF;

  -- When booking is marked overdue (no quantity change needed, already deducted)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_status_change
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION on_booking_status_change();

-- =============================================
-- 12. OVERDUE CHECK FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION mark_overdue_bookings()
RETURNS void AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'overdue'
  WHERE status IN ('approved', 'borrowed')
    AND return_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 13. AUDIT LOG TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_equipment
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- =============================================
-- 14. NEW USER PROFILE TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department, organization, contact_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'borrower'),
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'organization',
    NEW.raw_user_meta_data->>'contact_number'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 15. OVERLAP CHECK FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION check_booking_overlap(
  p_equipment_id UUID,
  p_borrow_date TIMESTAMPTZ,
  p_return_date TIMESTAMPTZ,
  p_quantity INTEGER,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  max_concurrent INTEGER;
  total_qty INTEGER;
BEGIN
  SELECT e.total_quantity INTO total_qty
  FROM public.equipment e WHERE e.id = p_equipment_id;

  SELECT COALESCE(MAX(concurrent_qty), 0) INTO max_concurrent
  FROM (
    SELECT SUM(b.quantity) AS concurrent_qty
    FROM public.bookings b
    WHERE b.equipment_id = p_equipment_id
      AND b.status IN ('approved', 'borrowed', 'pending')
      AND b.borrow_date < p_return_date
      AND b.return_date > p_borrow_date
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
    GROUP BY b.equipment_id
  ) sub;

  RETURN (max_concurrent + p_quantity) <= total_qty;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 15b. ADMIN CHECK HELPER (SECURITY DEFINER)
-- Bypasses RLS so policies don't self-reference profiles
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
-- 16. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
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

-- EQUIPMENT POLICIES
CREATE POLICY "Anyone authenticated can view equipment"
  ON public.equipment FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert equipment"
  ON public.equipment FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update equipment"
  ON public.equipment FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete equipment"
  ON public.equipment FOR DELETE
  USING (public.is_admin());

-- EQUIPMENT CATEGORIES POLICIES
CREATE POLICY "Anyone authenticated can view categories"
  ON public.equipment_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage categories"
  ON public.equipment_categories FOR ALL
  USING (public.is_admin());

-- BOOKINGS POLICIES
CREATE POLICY "Borrowers can view own bookings"
  ON public.bookings FOR SELECT
  USING (borrower_id = auth.uid());

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND borrower_id = auth.uid()
  );

CREATE POLICY "Borrowers can cancel own pending bookings"
  ON public.bookings FOR UPDATE
  USING (borrower_id = auth.uid() AND status = 'pending')
  WITH CHECK (borrower_id = auth.uid() AND status = 'cancelled');

CREATE POLICY "Admins can update any booking"
  ON public.bookings FOR UPDATE
  USING (public.is_admin());

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- AUDIT LOG POLICIES
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- DAMAGE REPORTS POLICIES
CREATE POLICY "Users can view own damage reports"
  ON public.damage_reports FOR SELECT
  USING (reported_by = auth.uid());

CREATE POLICY "Admins can view all damage reports"
  ON public.damage_reports FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can create damage reports"
  ON public.damage_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update damage reports"
  ON public.damage_reports FOR UPDATE
  USING (public.is_admin());

-- =============================================
-- 17. STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-images',
  'equipment-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'damage-reports',
  'damage-reports',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies
CREATE POLICY "Anyone can view equipment images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'equipment-images');

CREATE POLICY "Admins can upload equipment images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'equipment-images' AND public.is_admin());

CREATE POLICY "Admins can delete equipment images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'equipment-images' AND public.is_admin());

CREATE POLICY "Authenticated can upload damage images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'damage-reports' AND auth.role() = 'authenticated'
  );

-- =============================================
-- 18. SEED DATA - Equipment Categories
-- =============================================

INSERT INTO public.equipment_categories (name, description, icon) VALUES
  ('Projectors', 'LCD and DLP projectors for presentations', 'monitor'),
  ('Audio Equipment', 'Microphones, speakers, and audio accessories', 'mic'),
  ('Cables & Adapters', 'HDMI cables, extension wires, and adapters', 'cable'),
  ('Display Equipment', 'Screens, monitors, and display stands', 'tv'),
  ('Computing', 'Laptops, tablets, and computing devices', 'laptop'),
  ('Others', 'Miscellaneous equipment', 'box');

-- =============================================
-- 19. REALTIME PUBLICATIONS
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment;

-- =============================================
-- 20. CRON JOBS (requires pg_cron extension)
-- =============================================

-- Check for overdue bookings every 5 minutes
SELECT cron.schedule(
  'mark-overdue-bookings',
  '*/5 * * * *',
  $$SELECT mark_overdue_bookings()$$
);
