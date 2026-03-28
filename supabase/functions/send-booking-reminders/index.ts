// @ts-nocheck
// Supabase Edge Function: send-booking-reminders
// CRON scheduled to run every 5 minutes
//
// This function:
// 1. Checks for bookings approaching their return deadline (2hr and 30min)
// 2. Checks for overdue bookings
// 3. Sends email notifications via EmailJS API
// 4. Updates booking and notification records
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EMAILJS_SERVICE_ID = Deno.env.get('EMAILJS_SERVICE_ID')!;
const EMAILJS_TEMPLATE_ID = Deno.env.get('EMAILJS_TEMPLATE_ID')!;
const EMAILJS_API_KEY = Deno.env.get('EMAILJS_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'PMO FSUU <pmo@fsuu.edu.ph>';
const APP_URL = Deno.env.get('APP_URL') || 'https://pmo.fsuu.edu.ph';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface BookingReminder {
  id: string;
  booking_code: string;
  borrower_name: string;
  borrower_email: string;
  borrower_id: string;
  equipment_name: string;
  borrow_date: string;
  return_date: string;
  quantity: number;
  status: string;
  reminder_2hr_sent: boolean;
  reminder_30min_sent: boolean;
  reminder_15min_sent: boolean;
  overdue_sent: boolean;
}

// Send email via EmailJS API
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_API_KEY,
        template_params: {
          to_email: to,
          subject,
          html_content: html,
          reply_to: EMAIL_FROM,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email send failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

// Email template for reminders
function reminderEmailTemplate(booking: BookingReminder, type: 'reminder_2hr' | 'reminder_30min' | 'reminder_15min' | 'overdue') {
  const titles = {
    reminder_2hr: '⏰ 2-Hour Return Reminder',
    reminder_30min: '🚨 30-Minute Return Reminder',
    reminder_15min: '🔴 15-Minute URGENT Return Reminder',
    overdue: '❌ Equipment Return OVERDUE',
  };

  const colors = {
    reminder_2hr: '#d4a843',
    reminder_30min: '#f59e0b',
    reminder_15min: '#ea580c',
    overdue: '#dc2626',
  };

  const messages = {
    reminder_2hr: 'This is a friendly reminder that your borrowed equipment is due for return in <strong>2 hours</strong>.',
    reminder_30min: 'Your borrowed equipment is due for return in <strong>30 minutes</strong>. Please prepare to return the item(s).',
    reminder_15min: '⚠️ <strong>URGENT:</strong> Your borrowed equipment is due for return in <strong>15 minutes</strong>! Please head to the PMO Office immediately to return the item(s).',
    overdue: 'Your borrowed equipment is now <strong>OVERDUE</strong>. Please return the item(s) immediately to the PMO Office.',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d6ec5);padding:30px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:20px;">PMO Equipment Booking System</h1>
      <p style="color:#d4e2f5;margin:5px 0 0;font-size:13px;">Father Saturnino Urios University</p>
    </div>

    <!-- Alert Banner -->
    <div style="background:${colors[type]};padding:15px;text-align:center;">
      <h2 style="color:#ffffff;margin:0;font-size:18px;">${titles[type]}</h2>
    </div>

    <!-- Content -->
    <div style="padding:30px;">
      <p style="color:#333;font-size:15px;">Dear <strong>${booking.borrower_name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;">${messages[type]}</p>

      <!-- Booking Details -->
      <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid ${colors[type]};">
        <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
        <table style="width:100%;font-size:14px;color:#555;">
          <tr>
            <td style="padding:5px 0;font-weight:600;width:140px;">Booking ID:</td>
            <td style="padding:5px 0;font-family:monospace;">${booking.booking_code}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-weight:600;">Equipment:</td>
            <td style="padding:5px 0;">${booking.equipment_name} (x${booking.quantity})</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-weight:600;">Borrower:</td>
            <td style="padding:5px 0;">${booking.borrower_name}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-weight:600;">Borrow Date:</td>
            <td style="padding:5px 0;">${new Date(booking.borrow_date).toLocaleString('en-PH')}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-weight:600;color:${colors[type]};">Return Date:</td>
            <td style="padding:5px 0;font-weight:600;color:${colors[type]};">${new Date(booking.return_date).toLocaleString('en-PH')}</td>
          </tr>
        </table>
      </div>

      ${type === 'overdue' ? `
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:15px;margin:15px 0;">
        <p style="color:#dc2626;font-size:14px;margin:0;"><strong>⚠️ Important:</strong> Failure to return overdue equipment may result in restricted borrowing privileges.</p>
      </div>
      ` : ''}

      <!-- PMO Contact -->
      <div style="background:#eef4fb;border-radius:8px;padding:15px;margin:20px 0;">
        <p style="color:#1e3a5f;font-size:14px;margin:0;">
          <strong>📍 PMO Office</strong><br>
          Father Saturnino Urios University<br>
          For inquiries, visit the PMO Office or reply to this email.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#1e3a5f;padding:20px;text-align:center;">
      <p style="color:#a9c5eb;font-size:12px;margin:0;">
        &copy; ${new Date().getFullYear()} Property Management Office — FSUU
      </p>
      <p style="color:#7ea8e0;font-size:11px;margin:5px 0 0;">
        This is an automated message. Please do not reply directly.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// Approval email template
function approvalEmailTemplate(booking: BookingReminder) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d6ec5);padding:30px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:20px;">PMO Equipment Booking System</h1>
      <p style="color:#d4e2f5;margin:5px 0 0;font-size:13px;">Father Saturnino Urios University</p>
    </div>
    <div style="background:#16a34a;padding:15px;text-align:center;">
      <h2 style="color:#ffffff;margin:0;font-size:18px;">✅ Booking Approved</h2>
    </div>
    <div style="padding:30px;">
      <p style="color:#333;font-size:15px;">Dear <strong>${booking.borrower_name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;">Your equipment booking has been <strong style="color:#16a34a;">approved</strong>! You may now collect the equipment from the PMO Office.</p>
      <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #16a34a;">
        <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
        <table style="width:100%;font-size:14px;color:#555;">
          <tr><td style="padding:5px 0;font-weight:600;width:140px;">Booking ID:</td><td style="padding:5px 0;font-family:monospace;">${booking.booking_code}</td></tr>
          <tr><td style="padding:5px 0;font-weight:600;">Equipment:</td><td style="padding:5px 0;">${booking.equipment_name} (x${booking.quantity})</td></tr>
          <tr><td style="padding:5px 0;font-weight:600;">Borrow Date:</td><td style="padding:5px 0;">${new Date(booking.borrow_date).toLocaleString('en-PH')}</td></tr>
          <tr><td style="padding:5px 0;font-weight:600;">Return Date:</td><td style="padding:5px 0;">${new Date(booking.return_date).toLocaleString('en-PH')}</td></tr>
        </table>
      </div>
      <div style="background:#eef4fb;border-radius:8px;padding:15px;margin:20px 0;">
        <p style="color:#1e3a5f;font-size:14px;margin:0;">📍 <strong>PMO Office</strong> — Father Saturnino Urios University</p>
      </div>
    </div>
    <div style="background:#1e3a5f;padding:20px;text-align:center;">
      <p style="color:#a9c5eb;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} PMO — FSUU</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const fifteenMinFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    let emailsSent = 0;

    // 1. Mark overdue bookings
    const { data: overdueUpdate } = await supabase
      .from('bookings')
      .update({ status: 'overdue' })
      .in('status', ['approved', 'borrowed'])
      .lt('return_date', now.toISOString())
      .select();

    console.log(`Marked ${overdueUpdate?.length || 0} bookings as overdue`);

    // 2. Send 2-hour reminders
    const { data: twoHrBookings } = await supabase
      .from('bookings')
      .select(`
        id, booking_code, borrower_name, borrower_email, borrower_id,
        borrow_date, return_date, quantity, status,
        reminder_2hr_sent, reminder_30min_sent, overdue_sent,
        equipment(name)
      `)
      .in('status', ['approved', 'borrowed'])
      .eq('reminder_2hr_sent', false)
      .lte('return_date', twoHoursFromNow.toISOString())
      .gt('return_date', now.toISOString());

    if (twoHrBookings?.length) {
      for (const b of twoHrBookings) {
        const booking: BookingReminder = {
          ...b,
          equipment_name: (b.equipment as any)?.name || 'Equipment',
        };

        const sent = await sendEmail(
          booking.borrower_email,
          `⏰ 2-Hour Return Reminder - ${booking.equipment_name} [${booking.booking_code}]`,
          reminderEmailTemplate(booking, 'reminder_2hr')
        );

        if (sent) {
          await supabase
            .from('bookings')
            .update({ reminder_2hr_sent: true })
            .eq('id', booking.id);

          await supabase.from('notifications').insert({
            booking_id: booking.id,
            user_id: booking.borrower_id,
            type: 'reminder_2hr',
            title: '2-Hour Return Reminder',
            message: `Your ${booking.equipment_name} is due for return in 2 hours.`,
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          });

          emailsSent++;
        }
      }
    }

    // 3. Send 30-minute reminders
    const { data: thirtyMinBookings } = await supabase
      .from('bookings')
      .select(`
        id, booking_code, borrower_name, borrower_email, borrower_id,
        borrow_date, return_date, quantity, status,
        reminder_2hr_sent, reminder_30min_sent, overdue_sent,
        equipment(name)
      `)
      .in('status', ['approved', 'borrowed'])
      .eq('reminder_30min_sent', false)
      .lte('return_date', thirtyMinFromNow.toISOString())
      .gt('return_date', now.toISOString());

    if (thirtyMinBookings?.length) {
      for (const b of thirtyMinBookings) {
        const booking: BookingReminder = {
          ...b,
          equipment_name: (b.equipment as any)?.name || 'Equipment',
        };

        const sent = await sendEmail(
          booking.borrower_email,
          `🚨 30-Minute Return Reminder - ${booking.equipment_name} [${booking.booking_code}]`,
          reminderEmailTemplate(booking, 'reminder_30min')
        );

        if (sent) {
          await supabase
            .from('bookings')
            .update({ reminder_30min_sent: true })
            .eq('id', booking.id);

          await supabase.from('notifications').insert({
            booking_id: booking.id,
            user_id: booking.borrower_id,
            type: 'reminder_30min',
            title: '30-Minute Return Reminder',
            message: `Your ${booking.equipment_name} is due for return in 30 minutes!`,
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          });

          emailsSent++;
        }
      }
    }

    // 4. Send 15-minute URGENT reminders (email + push notification)
    const { data: fifteenMinBookings } = await supabase
      .from('bookings')
      .select(`
        id, booking_code, borrower_name, borrower_email, borrower_id,
        borrow_date, return_date, quantity, status,
        reminder_2hr_sent, reminder_30min_sent, reminder_15min_sent, overdue_sent,
        equipment(name)
      `)
      .in('status', ['approved', 'borrowed'])
      .eq('reminder_15min_sent', false)
      .lte('return_date', fifteenMinFromNow.toISOString())
      .gt('return_date', now.toISOString());

    if (fifteenMinBookings?.length) {
      for (const b of fifteenMinBookings) {
        const booking: BookingReminder = {
          ...b,
          equipment_name: (b.equipment as any)?.name || 'Equipment',
        };

        const minutesLeft = Math.max(1, Math.round((new Date(booking.return_date).getTime() - now.getTime()) / 60000));

        // Send email notification
        const sent = await sendEmail(
          booking.borrower_email,
          `🔴 URGENT: ${minutesLeft} Minutes Left - ${booking.equipment_name} [${booking.booking_code}]`,
          reminderEmailTemplate(booking, 'reminder_15min')
        );

        if (sent) {
          await supabase
            .from('bookings')
            .update({ reminder_15min_sent: true })
            .eq('id', booking.id);

          // Create in-app notification (will trigger real-time push to browser)
          await supabase.from('notifications').insert({
            booking_id: booking.id,
            user_id: booking.borrower_id,
            type: 'reminder_15min',
            title: '🔴 15-Minute URGENT Reminder',
            message: `URGENT: Only ${minutesLeft} minutes left to return ${booking.equipment_name}! Head to PMO Office NOW.`,
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          });

          emailsSent++;
        }
      }
    }

    // 5. Send overdue notifications
    const { data: overdueBookings } = await supabase
      .from('bookings')
      .select(`
        id, booking_code, borrower_name, borrower_email, borrower_id,
        borrow_date, return_date, quantity, status,
        reminder_2hr_sent, reminder_30min_sent, overdue_sent,
        equipment(name)
      `)
      .eq('status', 'overdue')
      .eq('overdue_sent', false);

    if (overdueBookings?.length) {
      for (const b of overdueBookings) {
        const booking: BookingReminder = {
          ...b,
          equipment_name: (b.equipment as any)?.name || 'Equipment',
        };

        const sent = await sendEmail(
          booking.borrower_email,
          `❌ OVERDUE - ${booking.equipment_name} [${booking.booking_code}]`,
          reminderEmailTemplate(booking, 'overdue')
        );

        if (sent) {
          await supabase
            .from('bookings')
            .update({ overdue_sent: true })
            .eq('id', booking.id);

          await supabase.from('notifications').insert({
            booking_id: booking.id,
            user_id: booking.borrower_id,
            type: 'overdue',
            title: 'Equipment OVERDUE',
            message: `Your ${booking.equipment_name} is OVERDUE. Please return immediately.`,
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          });

          emailsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        overdueMarked: overdueUpdate?.length || 0,
        timestamp: now.toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
