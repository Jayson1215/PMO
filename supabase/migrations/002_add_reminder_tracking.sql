-- Migration: Additional indexes and CRON job for reminder system
-- The reminder columns (reminder_2hr_sent, reminder_30min_sent, overdue_sent)  
-- and notification email tracking (email_sent, email_sent_at) are already
-- defined in 001_initial_schema.sql. This migration adds the CRON job.

-- Additional optimized indexes for reminder queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_2hr 
  ON bookings(status, return_date) 
  WHERE status IN ('approved', 'borrowed') AND reminder_2hr_sent = false;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_30min 
  ON bookings(status, return_date) 
  WHERE status IN ('approved', 'borrowed') AND reminder_30min_sent = false;

CREATE INDEX IF NOT EXISTS idx_bookings_overdue_unsent 
  ON bookings(status) 
  WHERE status = 'overdue' AND overdue_sent = false;

-- CRON job to invoke the edge function every 5 minutes
-- This requires pg_cron and pg_net extensions (enabled in Supabase dashboard)
SELECT cron.schedule(
  'send-booking-reminders',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-booking-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
