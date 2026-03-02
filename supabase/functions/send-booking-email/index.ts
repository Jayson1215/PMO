// @ts-nocheck
// Supabase Edge Function: send-booking-email
// Triggered via webhook or called directly when booking status changes
// Sends confirmation, approval, rejection, and return emails
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'PMO FSUU <pmo@fsuu.edu.ph>';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${err}`);
  }
  return await response.json();
}

function baseTemplate(title: string, bannerColor: string, bannerIcon: string, content: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d6ec5);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">PMO Equipment Booking System</h1>
      <p style="color:#d4e2f5;margin:5px 0 0;font-size:13px;">Father Saturnino Urios University</p>
    </div>
    <div style="background:${bannerColor};padding:15px;text-align:center;">
      <h2 style="color:#fff;margin:0;font-size:18px;">${bannerIcon} ${title}</h2>
    </div>
    <div style="padding:30px;">${content}</div>
    <div style="background:#1e3a5f;padding:20px;text-align:center;">
      <p style="color:#a9c5eb;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Property Management Office — FSUU</p>
      <p style="color:#7ea8e0;font-size:11px;margin:5px 0 0;">Automated message. Do not reply.</p>
    </div>
  </div>
</body></html>`;
}

function bookingDetailsBlock(booking: any, borderColor: string) {
  return `
    <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid ${borderColor};">
      <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
      <table style="width:100%;font-size:14px;color:#555;">
        <tr><td style="padding:5px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;">${booking.booking_code}</td></tr>
        <tr><td style="padding:5px 0;font-weight:600;">Equipment:</td><td>${booking.equipment_name} (x${booking.quantity})</td></tr>
        <tr><td style="padding:5px 0;font-weight:600;">Borrow Date:</td><td>${new Date(booking.borrow_date).toLocaleString('en-PH')}</td></tr>
        <tr><td style="padding:5px 0;font-weight:600;">Return Date:</td><td>${new Date(booking.return_date).toLocaleString('en-PH')}</td></tr>
        ${booking.purpose ? `<tr><td style="padding:5px 0;font-weight:600;">Purpose:</td><td>${booking.purpose}</td></tr>` : ''}
      </table>
    </div>`;
}

Deno.serve(async (req) => {
  try {
    const { booking_id, type } = await req.json();

    if (!booking_id || !type) {
      return new Response(JSON.stringify({ error: 'booking_id and type required' }), { status: 400 });
    }

    // Fetch booking with equipment
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        equipment(name, description)
      `)
      .eq('id', booking_id)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
    }

    const b = {
      ...booking,
      equipment_name: (booking.equipment as any)?.name || 'Equipment',
    };

    let subject: string;
    let html: string;

    switch (type) {
      case 'booking_submitted': {
        subject = `📋 Booking Submitted - ${b.equipment_name} [${b.booking_code}]`;
        html = baseTemplate('Booking Submitted', '#3b82f6', '📋', `
          <p style="color:#333;font-size:15px;">Dear <strong>${b.borrower_name}</strong>,</p>
          <p style="color:#555;font-size:14px;line-height:1.6;">Your booking request has been submitted successfully and is now <strong>pending approval</strong>.</p>
          ${bookingDetailsBlock(b, '#3b82f6')}
          <div style="background:#eef4fb;border-radius:8px;padding:15px;margin:20px 0;">
            <p style="color:#1e3a5f;font-size:14px;margin:0;">📍 You will receive an email once your booking is approved or rejected by the PMO admin.</p>
          </div>
        `);
        break;
      }

      case 'booking_approved': {
        subject = `✅ Booking Approved - ${b.equipment_name} [${b.booking_code}]`;
        html = baseTemplate('Booking Approved', '#16a34a', '✅', `
          <p style="color:#333;font-size:15px;">Dear <strong>${b.borrower_name}</strong>,</p>
          <p style="color:#555;font-size:14px;line-height:1.6;">Your booking has been <strong style="color:#16a34a;">approved</strong>! Please collect the equipment from the PMO Office at your scheduled time.</p>
          ${bookingDetailsBlock(b, '#16a34a')}
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:15px;margin:15px 0;">
            <p style="color:#166534;font-size:14px;margin:0;">✅ <strong>Next Step:</strong> Present your FSUU ID at the PMO Office to collect the equipment.</p>
          </div>
        `);
        break;
      }

      case 'booking_rejected': {
        subject = `❌ Booking Rejected - ${b.equipment_name} [${b.booking_code}]`;
        html = baseTemplate('Booking Rejected', '#dc2626', '❌', `
          <p style="color:#333;font-size:15px;">Dear <strong>${b.borrower_name}</strong>,</p>
          <p style="color:#555;font-size:14px;line-height:1.6;">Unfortunately, your booking has been <strong style="color:#dc2626;">rejected</strong>.</p>
          ${bookingDetailsBlock(b, '#dc2626')}
          ${b.admin_notes ? `
          <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:15px;margin:15px 0;">
            <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Reason:</strong> ${b.admin_notes}</p>
          </div>` : ''}
          <div style="background:#eef4fb;border-radius:8px;padding:15px;margin:20px 0;">
            <p style="color:#1e3a5f;font-size:14px;margin:0;">📍 If you have questions, please visit the PMO Office.</p>
          </div>
        `);
        break;
      }

      case 'booking_returned': {
        subject = `🔄 Equipment Returned - ${b.equipment_name} [${b.booking_code}]`;
        html = baseTemplate('Equipment Returned', '#7c3aed', '🔄', `
          <p style="color:#333;font-size:15px;">Dear <strong>${b.borrower_name}</strong>,</p>
          <p style="color:#555;font-size:14px;line-height:1.6;">Your equipment return has been confirmed. Thank you for using the PMO Booking System!</p>
          ${bookingDetailsBlock(b, '#7c3aed')}
          <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:15px;margin:15px 0;">
            <p style="color:#5b21b6;font-size:14px;margin:0;">✅ Equipment returned successfully. Thank you!</p>
          </div>
        `);
        break;
      }

      case 'admin_reminder': {
        const customMessage = (await req.clone().json()).custom_message || 'This is a reminder from PMO Admin regarding your equipment booking.';
        subject = `🔔 PMO Reminder - ${b.equipment_name} [${b.booking_code}]`;
        html = baseTemplate('Reminder from PMO Admin', '#f59e0b', '🔔', `
          <p style="color:#333;font-size:15px;">Dear <strong>${b.borrower_name}</strong>,</p>
          <p style="color:#555;font-size:14px;line-height:1.6;">${customMessage}</p>
          ${bookingDetailsBlock(b, '#f59e0b')}
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:15px;margin:15px 0;">
            <p style="color:#92400e;font-size:14px;margin:0;">📍 If you have any questions, please visit or contact the PMO Office.</p>
          </div>
        `);
        break;
      }

      case 'admin_new_booking': {
        // Send to all admins
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('role', 'admin');

        if (admins?.length) {
          for (const admin of admins) {
            const adminSubject = `📋 New Booking Request - ${b.equipment_name} [${b.booking_code}]`;
            const adminHtml = baseTemplate('New Booking Request', '#f59e0b', '📋', `
              <p style="color:#333;font-size:15px;">Hello <strong>${admin.full_name}</strong>,</p>
              <p style="color:#555;font-size:14px;line-height:1.6;">A new booking request has been submitted and requires your review.</p>
              <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #f59e0b;">
                <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Request Details</h3>
                <table style="width:100%;font-size:14px;color:#555;">
                  <tr><td style="padding:5px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;">${b.booking_code}</td></tr>
                  <tr><td style="padding:5px 0;font-weight:600;">Borrower:</td><td>${b.borrower_name} (${b.borrower_email})</td></tr>
                  <tr><td style="padding:5px 0;font-weight:600;">Equipment:</td><td>${b.equipment_name} (x${b.quantity})</td></tr>
                  <tr><td style="padding:5px 0;font-weight:600;">Borrow Date:</td><td>${new Date(b.borrow_date).toLocaleString('en-PH')}</td></tr>
                  <tr><td style="padding:5px 0;font-weight:600;">Return Date:</td><td>${new Date(b.return_date).toLocaleString('en-PH')}</td></tr>
                  ${b.purpose ? `<tr><td style="padding:5px 0;font-weight:600;">Purpose:</td><td>${b.purpose}</td></tr>` : ''}
                </table>
              </div>
              <div style="text-align:center;margin:25px 0;">
                <p style="color:#555;font-size:14px;">Please review this request in the admin dashboard.</p>
              </div>
            `);

            await sendEmail(admin.email, adminSubject, adminHtml);
          }
        }

        return new Response(JSON.stringify({ success: true, sent_to: admins?.length || 0 }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown email type' }), { status: 400 });
    }

    // Send to borrower
    await sendEmail(b.borrower_email, subject!, html!);

    // Record notification
    await supabase.from('notifications').insert({
      booking_id: b.id,
      user_id: b.borrower_id,
      type: type as any,
      title: subject!.replace(/[^\w\s-]/g, '').trim(),
      message: `Booking ${b.booking_code} - ${type.replace('booking_', '').replace('_', ' ')}`,
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send booking email error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
