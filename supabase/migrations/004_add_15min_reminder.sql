-- =============================================
-- Migration 004: Add 15-minute reminder feature
-- Adds reminder_15min notification type and tracking column
-- =============================================

-- 1. Add 'reminder_15min' to the notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reminder_15min' AFTER 'reminder_30min';

-- 2. Add tracking column to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN NOT NULL DEFAULT false;

-- 3. Create index for efficient 15-min reminder queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_15min
  ON public.bookings (return_date)
  WHERE status IN ('approved', 'borrowed') AND reminder_15min_sent = false;
