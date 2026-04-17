/**
 * BOOKING ACTIONS (bookings.ts)
 * Manages all booking operations: Create, Read, Update, Delete
 * Uses Supabase for database and email notifications
 */
'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { bookingSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import type { BookingStatus, NotificationType } from '@/types/database';
import { sendEmail } from '@/lib/mail';
import { cache } from 'react';

// Helper: Format date to Philippine timezone
const fmtDate = (d: string) => new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

// Email HTML templates for different booking statuses
const emailTemplates = {
  submitted: (name: string, code: string, equip: string, qty: number, borrowDate: string, returnDate: string) => `
<p style="color:#333;font-size:15px;">Dear <strong>${name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Your booking request has been submitted successfully and is now <strong>pending approval</strong>.</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #3b82f6;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${equip} (x${qty})</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Borrow Date:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Return Date:</td><td>${returnDate}</td></tr>
  </table>
</div>`,
  
  approved: (name: string, code: string, equip: string, qty: number, borrowDate: string, returnDate: string) => `
<p style="color:#333;font-size:15px;">Dear <strong>${name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Your booking has been <strong style="color:#16a34a;">approved</strong>! Please collect the equipment from the PMO Office at your scheduled time.</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #16a34a;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${equip} (x${qty})</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Borrow Date:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Return Date:</td><td>${returnDate}</td></tr>
  </table>
</div>
<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:15px;margin:15px 0;">
  <p style="color:#166534;font-size:14px;margin:0;">✅ <strong>Next Step:</strong> Present your FSUU ID at the PMO Office to collect the equipment.</p>
</div>`,

  rejected: (name: string, code: string, equip: string, qty: number, borrowDate: string, returnDate: string, notes?: string) => `
<p style="color:#333;font-size:15px;">Dear <strong>${name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Unfortunately, your booking has been <strong style="color:#dc2626;">rejected</strong>.</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #dc2626;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${equip} (x${qty})</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Borrow Date:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Return Date:</td><td>${returnDate}</td></tr>
  </table>
</div>
${notes ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:15px;margin:15px 0;">
  <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Reason:</strong> ${notes}</p>
</div>` : ''}`,

  returned: (name: string, code: string, equip: string, qty: number) => `
<p style="color:#333;font-size:15px;">Dear <strong>${name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Your equipment return has been confirmed. Thank you for using the PMO Booking System!</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #7c3aed;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Return Confirmation</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${equip}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Quantity:</td><td>${qty}</td></tr>
  </table>
</div>`,
};

// Helper: Try-catch wrapper for safe Supabase operations
const safeQuery = async <T,>(fn: () => Promise<T>, fallback: T, errorMsg?: string): Promise<T> => {
  try { return await fn(); } catch (e) { 
    if (errorMsg) console.error(errorMsg, e);
    return fallback;
  }
};

// ============================================================================
// CREATE - Create a new booking request
// ============================================================================
export async function createBooking(formData: FormData) {
  // Step 1: Get authenticated user from Supabase
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Step 2: Extract form data and validate input
  const rawData = {
    equipment_id: formData.get('equipment_id'),
    quantity: Number(formData.get('quantity')),
    borrower_name: formData.get('borrower_name'),
    borrower_email: formData.get('borrower_email'),
    department: formData.get('department'),
    purpose: formData.get('purpose'),
    borrow_date: formData.get('borrow_date'),
    return_date: formData.get('return_date'),
  };

  // Validate data against schema
  const result = bookingSchema.safeParse(rawData);
  if (!result.success) return { error: result.error.errors[0].message };

  // Step 3: Check if equipment exists and is available
  const { data: equipment, error: eqError } = await supabase
    .from('equipment').select('available_quantity, status, name').eq('id', result.data.equipment_id).single();

  if (eqError || !equipment) return { error: 'Equipment not found' };
  if (equipment.status !== 'available') return { error: 'Equipment is not available' };
  if (equipment.available_quantity < result.data.quantity)
    return { error: `Only ${equipment.available_quantity} unit(s) available` };

  // Step 4: Check if equipment is already booked for requested dates
  const { data: overlapCheck, error: rpcError } = await supabase.rpc('check_booking_overlap', {
    p_equipment_id: result.data.equipment_id,
    p_borrow_date: result.data.borrow_date,
    p_return_date: result.data.return_date,
    p_quantity: result.data.quantity,
    p_exclude_booking_id: null,
  });

  if (rpcError || overlapCheck !== true)
    return { error: 'Equipment is already booked for the selected time period' };

  // Step 5: Insert booking into database
  const { data: booking, error } = await supabase
    .from('bookings').insert({ ...result.data, borrower_id: user.id }).select().single();

  if (error) return { error: error.message };

  // Step 6: Send confirmation email to borrower
  await safeQuery(
    () => sendEmail({
      to: result.data.borrower_email,
      subject: `📋 Booking Submitted - ${equipment.name} [${booking.booking_code}]`,
      html: emailTemplates.submitted(result.data.borrower_name, booking.booking_code, equipment.name, result.data.quantity, fmtDate(result.data.borrow_date), fmtDate(result.data.return_date)),
    }),
    null,
    'Booking confirmation email error:'
  );

  // Step 7: Send notification to admins
  await safeQuery(async () => {
    const svc = await createServiceRoleClient();
    const { data: admins } = await svc.from('profiles').select('id').eq('role', 'admin') as any;
    if (admins?.length) {
      await svc.from('notifications').insert(admins.map((a: any) => ({
        booking_id: booking.id, user_id: a.id, type: 'booking_confirmed',
        title: 'New Booking Request',
        message: `${result.data.borrower_name} has requested to borrow ${equipment.name} (x${result.data.quantity})`,
      })));
    }
  }, null, 'Admin notification error:');

  // Step 8: Revalidate pages to show updated data
  revalidatePath('/dashboard');
  revalidatePath('/admin/bookings');
  return { success: true, booking };
}

// ============================================================================
// READ - Fetch bookings from database
// ============================================================================

// READ: Get all bookings (Admin only - for management table)
export const getBookings = cache(async (status?: BookingStatus) => {
  const supabase = await createServerSupabaseClient();
  // Query bookings with related equipment and borrower details
  const query = supabase.from('bookings')
    .select('*, equipment(id, name, image_url, category_id), profiles:borrower_id(id, full_name, email, department)')
    .order('created_at', { ascending: false });
  
  // Filter by status if provided (e.g., 'pending', 'approved', 'rejected')
  if (status) query.eq('status', status);
  
  const { data, error } = await query;
  if (error) console.error('getBookings error:', error.message);
  return data ?? [];
});

// READ: Get all bookings for current user (borrower's bookings)
export const getUserBookings = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Query only this user's bookings with equipment details
  const { data, error } = await supabase
    .from('bookings').select('*, equipment(id, name, image_url)').eq('borrower_id', user.id).order('created_at', { ascending: false });
  
  if (error) console.error('getUserBookings error:', error.message);
  return data ?? [];
});

// READ: Get single booking by ID (for detail page)
export const getBookingById = cache(async (id: string) => {
  const supabase = await createServerSupabaseClient();
  // Query single booking with all related details
  const { data, error } = await supabase
    .from('bookings').select('*, equipment(id, name, image_url, category_id), profiles:borrower_id(id, full_name, email, department)').eq('id', id).single();
  
  if (error) console.error('getBookingById error:', error.message);
  return data ?? null;
});



// ============================================================================
// UPDATE - Update booking status (Admin function)
// ============================================================================
export async function updateBookingStatus(bookingId: string, status: BookingStatus, adminNotes?: string) {
  // Step 1: Authenticate user
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Step 2: Check admin authorization (only admins can approve/reject/return)
  if (['approved', 'rejected', 'borrowed', 'returned'].includes(status)) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { error: 'Not authorized — admin only' };
  }

  // Step 3: Prepare update data based on status
  const updateData: Record<string, unknown> = { status };
  if (status === 'approved') {
    // When approved, record who approved and when
    updateData.approved_by = user.id;
    updateData.approved_at = new Date().toISOString();
  }
  if (status === 'returned') {
    // When returned, record the actual return date
    updateData.actual_return_date = new Date().toISOString();
  }
  if (adminNotes) {
    // Store admin's notes (e.g., reason for rejection)
    updateData.admin_notes = adminNotes;
  }

  // Step 4: Update booking in database and fetch updated data
  const { data: booking, error } = await supabase
    .from('bookings').update(updateData).eq('id', bookingId).select('*, equipment(name), profiles:borrower_id(id, full_name, email)').single();

  if (error) return { error: error.message };

  // Step 5: Send notification to borrower (in-app)
  await safeQuery(async () => {
    const svc = await createServiceRoleClient();
    const notifMap: Record<string, {title: string; message: string; type: NotificationType}> = {
      approved: { title: 'Booking Approved', message: `Your booking for ${booking.equipment?.name} has been approved.`, type: 'booking_approved' },
      rejected: { title: 'Booking Rejected', message: `Your booking for ${booking.equipment?.name} has been rejected.${adminNotes ? ` Reason: ${adminNotes}` : ''}`, type: 'booking_rejected' },
      returned: { title: 'Equipment Returned', message: `Equipment ${booking.equipment?.name} has been marked as returned.`, type: 'returned' },
    };
    const notif = notifMap[status];
    if (notif) await svc.from('notifications').insert({ booking_id: bookingId, user_id: booking.borrower_id, ...notif });
  }, null, 'Borrower notification error:');

  // Step 6: Send email to borrower based on new status
  if (['approved', 'rejected', 'returned'].includes(status)) {
    const borrowDate = fmtDate(booking.borrow_date), returnDate = fmtDate(booking.return_date);
    const statusKey = status as 'approved' | 'rejected' | 'returned';
    const templates: Record<'approved' | 'rejected' | 'returned', any> = {
      approved: () => emailTemplates.approved(booking.borrower_name, booking.booking_code, booking.equipment?.name, booking.quantity, borrowDate, returnDate),
      rejected: () => emailTemplates.rejected(booking.borrower_name, booking.booking_code, booking.equipment?.name, booking.quantity, borrowDate, returnDate, adminNotes),
      returned: () => emailTemplates.returned(booking.borrower_name, booking.booking_code, booking.equipment?.name, booking.quantity),
    };
    const subjects: Record<'approved' | 'rejected' | 'returned', string> = {
      approved: `✅ Booking Approved - ${booking.equipment?.name} [${booking.booking_code}]`,
      rejected: `❌ Booking Rejected - ${booking.equipment?.name} [${booking.booking_code}]`,
      returned: `🔄 Equipment Returned - ${booking.equipment?.name} [${booking.booking_code}]`,
    };

    await safeQuery(
      () => sendEmail({ to: booking.borrower_email, subject: subjects[statusKey], html: templates[statusKey]() }),
      null,
      'Status change email error:'
    );
  }

  // Step 7: Refresh pages
  revalidatePath('/admin/bookings');
  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// DELETE/CANCEL - Cancel a booking
// ============================================================================
export async function cancelBooking(bookingId: string) {
  // Step 1: Authenticate user
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Step 2: Cancel booking (only if user is the borrower and status is pending)
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' })
    .eq('id', bookingId).eq('borrower_id', user.id).eq('status', 'pending');

  if (error) return { error: error.message };
  
  // Step 3: Refresh dashboard
  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// SEND REMINDER - Manual reminder to borrower via email/SMS
// ============================================================================
export async function sendManualReminder(bookingId: string, message: string, method: 'email' | 'sms' | 'both' = 'email') {
  // Step 1: Authenticate user
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Step 2: Check admin authorization
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Not authorized — admin only' };

  // Step 3: Fetch booking details
  const { data: booking, error } = await supabase
    .from('bookings').select('*, equipment(name), profiles:borrower_id(id, full_name, contact_number)').eq('id', bookingId).single();

  if (error || !booking) return { error: 'Booking not found' };

  const results: string[] = [];
  const borrowDate = fmtDate(booking.borrow_date), returnDate = fmtDate(booking.return_date);
  const eqName = (booking.equipment as any)?.name || 'Equipment';

  // Step 4: Send email reminder if requested
  if (method === 'email' || method === 'both') {
    const html = `<p style="color:#333;font-size:15px;">Dear <strong>${booking.borrower_name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">${message}</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #f59e0b;">
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:5px 0;font-weight:600;width:140px;">Booking ID:</td><td>${booking.booking_code}</td></tr>
    <tr><td style="padding:5px 0;font-weight:600;">Equipment:</td><td>${eqName} (x${booking.quantity})</td></tr>
    <tr><td style="padding:5px 0;font-weight:600;">Borrow:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:5px 0;font-weight:600;">Return:</td><td>${returnDate}</td></tr>
  </table>
</div>`;
    
    try {
      await sendEmail({ to: booking.borrower_email, subject: `🔔 PMO Reminder - ${eqName} [${booking.booking_code}]`, html });
      results.push(`Email sent to ${booking.borrower_email}`);
    } catch (e) {
      console.error('Email error:', e);
      results.push(`Email failed`);
    }
  }

  // Step 5: Send SMS reminder if requested
  if (method === 'sms' || method === 'both') {
    const contact = (booking.profiles as any)?.contact_number;
    if (!contact) {
      results.push('SMS skipped — no contact number');
    } else {
      const key = process.env.SEMAPHORE_API_KEY;
      if (!key) {
        results.push(`SMS skipped — SEMAPHORE_API_KEY not set`);
      } else {
        // Use Semaphore API to send SMS (Philippine SMS gateway)
        await safeQuery(async () => {
          const body = new URLSearchParams();
          body.append('apikey', key);
          body.append('number', contact);
          body.append('message', `[PMO] ${message} - ${booking.booking_code}`);
          body.append('sendername', 'PMOFSUU');
          const res = await fetch('https://api.semaphore.co/api/v4/messages', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
          results.push(res.ok ? `SMS sent to ${contact}` : `SMS failed`);
        }, null, 'SMS error:');
      }
    }
  }

  // Step 6: Create in-app notification for borrower
  await safeQuery(async () => {
    const svc = await createServiceRoleClient();
    await svc.from('notifications').insert({
      booking_id: bookingId, user_id: booking.borrower_id, type: 'reminder_15min',
      title: 'Reminder from PMO Admin', message: message || `Reminder: ${eqName} (${booking.booking_code})`,
    });
  }, null, 'Notification error:');

  // Step 7: Refresh pages
  revalidatePath('/admin/bookings');
  revalidatePath('/dashboard');
  return { success: true, details: results.join('; ') };
}

// ============================================================================
// STATS & CALENDAR - Get statistics and calendar data
// ============================================================================

// Get booking statistics for admin dashboard
export const getBookingStats = cache(async () => {
  const defaultStats = { totalEquipment: 0, activeBookings: 0, overdueBookings: 0, pendingBookings: 0, totalBookings: 0, lowInventory: [] as any[] };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return defaultStats;

  // Fetch all counts in parallel
  const [
    { count: totalEq },      // Total equipment in system
    { count: active },       // Active bookings (approved or borrowed)
    { count: overdue },      // Overdue bookings
    { count: pending },      // Pending approval
    { count: total }         // All bookings
  ] = await Promise.all([
    supabase.from('equipment').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['approved', 'borrowed']),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
  ]);

  // Get equipment with low inventory (2 or less units available)
  const { data: lowInv } = await supabase.from('equipment').select('id, name, available_quantity, total_quantity')
    .eq('is_archived', false).lte('available_quantity', 2).gt('total_quantity', 0).order('available_quantity');

  return {
    totalEquipment: totalEq || 0,
    activeBookings: active || 0,
    overdueBookings: overdue || 0,
    pendingBookings: pending || 0,
    totalBookings: total || 0,
    lowInventory: lowInv || [],
  };
});

// Get bookings for calendar view (filtered by date range)
export async function getCalendarBookings(startDate: string, endDate: string) {
  const supabase = await createServerSupabaseClient();
  // Get bookings within date range that are active or pending
  const { data, error } = await supabase.from('bookings')
    .select('id, booking_code, borrow_date, return_date, status, borrower_name, quantity, equipment(name)')
    .gte('borrow_date', startDate)                      // Greater than or equal to start date
    .lte('borrow_date', endDate)                        // Less than or equal to end date
    .in('status', ['approved', 'borrowed', 'pending'])  // Only active statuses
    .order('borrow_date');
  
  if (error) console.error('getCalendarBookings error:', error.message);
  return data ?? [];
}
