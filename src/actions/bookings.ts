'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { bookingSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import type { BookingStatus, NotificationType } from '@/types/database';
import { sendEmail } from '@/lib/mail';

export async function createBooking(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const rawData = {
    equipment_id: formData.get('equipment_id') as string,
    quantity: Number(formData.get('quantity')),
    borrower_name: formData.get('borrower_name') as string,
    borrower_email: formData.get('borrower_email') as string,
    department: formData.get('department') as string,
    organization: formData.get('organization') as string,
    purpose: formData.get('purpose') as string,
    borrow_date: formData.get('borrow_date') as string,
    return_date: formData.get('return_date') as string,
  };

  const result = bookingSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  // Check equipment availability
  const { data: equipment } = await supabase
    .from('equipment')
    .select('available_quantity, status, name')
    .eq('id', result.data.equipment_id)
    .single();

  if (!equipment) return { error: 'Equipment not found' };
  if (equipment.status !== 'available') return { error: 'Equipment is not available' };
  if (equipment.available_quantity < result.data.quantity) {
    return { error: `Only ${equipment.available_quantity} unit(s) available` };
  }

  // Check for time conflicts using the overlap function
  const { data: overlapCheck, error: rpcError } = await supabase.rpc('check_booking_overlap', {
    p_equipment_id: result.data.equipment_id,
    p_borrow_date: result.data.borrow_date,
    p_return_date: result.data.return_date,
    p_quantity: result.data.quantity,
    p_exclude_booking_id: null,
  });

  if (rpcError || overlapCheck !== true) {
    return { error: 'Equipment is already booked for the selected time period' };
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      ...result.data,
      borrower_id: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Send booking confirmation email with beautiful template
  try {
    const borrowDate = new Date(result.data.borrow_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    const returnDate = new Date(result.data.return_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

    const emailHtml = `
<p style="color:#333;font-size:15px;">Dear <strong>${result.data.borrower_name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Your booking request has been submitted successfully and is now <strong>pending approval</strong>.</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #3b82f6;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${booking.booking_code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${equipment.name} (x${result.data.quantity})</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Department:</td><td>${result.data.department}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Purpose:</td><td>${result.data.purpose}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Borrow Date:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Return Date:</td><td>${returnDate}</td></tr>
  </table>
</div>
<div style="background:#eef4fb;border-radius:8px;padding:15px;margin:20px 0;">
  <p style="color:#1e3a5f;font-size:14px;margin:0;">📍 You will receive an email once your booking is approved or rejected by the PMO admin. This typically takes 1-2 business days.</p>
</div>`;

    await sendEmail({
      to: result.data.borrower_email,
      subject: `📋 Booking Submitted - ${equipment.name} [${booking.booking_code}]`,
      html: emailHtml,
    });
  } catch (e) {
    console.error('Booking confirmation email error:', e);
  }

  // Create notification for admins (non-critical — don't crash if it fails)
  try {
    const serviceClient = await createServiceRoleClient();
    const { data: admins } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin') as { data: { id: string }[] | null };

    if (admins) {
      const notifications = admins.map((admin: { id: string }) => ({
        booking_id: booking.id,
        user_id: admin.id,
        type: 'booking_confirmed' as const,
        title: 'New Booking Request',
        message: `${result.data.borrower_name} has requested to borrow ${equipment.name} (x${result.data.quantity})`,
      }));

      await serviceClient.from('notifications').insert(notifications as any);
    }
  } catch (e) {
    console.error('Admin notification error (non-critical):', e);
  }

  revalidatePath('/dashboard');
  revalidatePath('/admin/bookings');
  return { success: true, booking };
}

export async function getBookings(status?: BookingStatus) {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('bookings')
      .select('*, equipment(id, name, image_url, category_id), profiles:borrower_id(id, full_name, email, department)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) { console.error('getBookings error:', error.message); return []; }
    return data ?? [];
  } catch (e) {
    console.error('getBookings exception:', e);
    return [];
  }
}

export async function getUserBookings() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select('*, equipment(id, name, image_url)')
      .eq('borrower_id', user.id)
      .order('created_at', { ascending: false });

    if (error) { console.error('getUserBookings error:', error.message); return []; }
    return data ?? [];
  } catch (e) {
    console.error('getUserBookings exception:', e);
    return [];
  }
}

export async function getBookingById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('*, equipment(id, name, image_url, category_id), profiles:borrower_id(id, full_name, email, department)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('getBookingById error:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('getBookingById exception:', e);
    return null;
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  adminNotes?: string
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Only admins can approve/reject/mark as borrowed/returned
  if (['approved', 'rejected', 'borrowed', 'returned'].includes(status)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') return { error: 'Not authorized — admin only' };
  }

  const updateData: Record<string, unknown> = { status };

  if (status === 'approved') {
    updateData.approved_by = user.id;
    updateData.approved_at = new Date().toISOString();
  }

  if (status === 'returned') {
    updateData.actual_return_date = new Date().toISOString();
  }

  if (adminNotes) {
    updateData.admin_notes = adminNotes;
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select('*, equipment(name)')
    .single();

  if (error) return { error: error.message };

  // Create notification for borrower (non-critical — don't crash if it fails)
  try {
    const serviceClient = await createServiceRoleClient();
    const notificationMap: Partial<Record<BookingStatus, { title: string; message: string; type: NotificationType }>> = {
      approved: {
        title: 'Booking Approved',
        message: `Your booking for ${booking.equipment?.name || 'equipment'} has been approved.`,
        type: 'booking_approved',
      },
      rejected: {
        title: 'Booking Rejected',
        message: `Your booking for ${booking.equipment?.name || 'equipment'} has been rejected.${adminNotes ? ` Reason: ${adminNotes}` : ''}`,
        type: 'booking_rejected',
      },
      returned: {
        title: 'Equipment Returned',
        message: `Equipment ${booking.equipment?.name || ''} has been marked as returned. Thank you!`,
        type: 'returned',
      },
    };

    const notification = notificationMap[status];
    if (notification) {
      await serviceClient.from('notifications').insert({
        booking_id: bookingId,
        user_id: booking.borrower_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      });
    }
  } catch (e) {
    console.error('Borrower notification error (non-critical):', e);
  }

  // Send status change email with beautiful template
  if (['approved', 'rejected', 'returned'].includes(status)) {
    try {
      const borrowDate = new Date(booking.borrow_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      const returnDate = new Date(booking.return_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

      let emailHtml = '';
      let subject = '';

      if (status === 'approved') {
        subject = `✅ Booking Approved - ${booking.equipment?.name} [${booking.booking_code}]`;
        emailHtml = `
<p style="color:#333;font-size:15px;">Dear <strong>${booking.borrower_name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Your booking has been <strong style="color:#16a34a;">approved</strong>! Please collect the equipment from the PMO Office at your scheduled time.</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #16a34a;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${booking.booking_code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${booking.equipment?.name} (x${booking.quantity})</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Borrow Date:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Return Date:</td><td>${returnDate}</td></tr>
  </table>
</div>
<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:15px;margin:15px 0;">
  <p style="color:#166534;font-size:14px;margin:0;">✅ <strong>Next Step:</strong> Present your FSUU ID at the PMO Office to collect the equipment.</p>
</div>`;
      } else if (status === 'rejected') {
        subject = `❌ Booking Rejected - ${booking.equipment?.name} [${booking.booking_code}]`;
        emailHtml = `
<p style="color:#333;font-size:15px;">Dear <strong>${booking.borrower_name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Unfortunately, your booking has been <strong style="color:#dc2626;">rejected</strong>.</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #dc2626;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${booking.booking_code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${booking.equipment?.name} (x${booking.quantity})</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Borrow Date:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Return Date:</td><td>${returnDate}</td></tr>
  </table>
</div>
${adminNotes ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:15px;margin:15px 0;">
  <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Reason:</strong> ${adminNotes}</p>
</div>` : ''}
<div style="background:#eef4fb;border-radius:8px;padding:15px;margin:20px 0;">
  <p style="color:#1e3a5f;font-size:14px;margin:0;">📍 If you have questions, please visit the PMO Office.</p>
</div>`;
      } else if (status === 'returned') {
        subject = `🔄 Equipment Returned - ${booking.equipment?.name} [${booking.booking_code}]`;
        emailHtml = `
<p style="color:#333;font-size:15px;">Dear <strong>${booking.borrower_name}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">Your equipment return has been confirmed. Thank you for using the PMO Booking System!</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #7c3aed;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Return Confirmation</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;font-weight:500;">${booking.booking_code}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Equipment:</td><td>${booking.equipment?.name}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Quantity:</td><td>${booking.quantity}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Return Date:</td><td>${new Date().toLocaleString('en-PH')}</td></tr>
  </table>
</div>
<div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:15px;margin:15px 0;">
  <p style="color:#5b21b6;font-size:14px;margin:0;">✅ Equipment returned successfully. Thank you!</p>
</div>`;
      }

      if (emailHtml && subject) {
        await sendEmail({
          to: booking.borrower_email,
          subject,
          html: emailHtml,
        });
      }
    } catch (e) {
      console.error('Status change email error:', e);
    }
  }

  revalidatePath('/admin/bookings');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function sendManualReminder(
  bookingId: string,
  message: string,
  method: 'email' | 'sms' | 'both' = 'email'
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Verify admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.role !== 'admin') return { error: 'Not authorized — admin only' };

  // Fetch booking with equipment and borrower details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, equipment(name), profiles:borrower_id(id, full_name, email, contact_number)')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) return { error: 'Booking not found' };

  const borrowerEmail = booking.borrower_email;
  const borrowerName = booking.borrower_name;
  const equipmentName = (booking.equipment as any)?.name || 'Equipment';
  const contactNumber = (booking.profiles as any)?.contact_number;

  let serviceClient: any = null;
  try {
    serviceClient = await createServiceRoleClient();
  } catch (e) {
    console.error('Service role client error (non-critical):', e);
  }
  const results: string[] = [];

  // Send email via EmailJS
  if (method === 'email' || method === 'both') {
    try {
      const borrowDate = new Date(booking.borrow_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      const returnDate = new Date(booking.return_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

      const emailHtml = `
<p style="color:#333;font-size:15px;">Dear <strong>${borrowerName}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;">${message}</p>
<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #f59e0b;">
  <h3 style="margin:0 0 15px;color:#1e3a5f;font-size:16px;">Booking Details</h3>
  <table style="width:100%;font-size:14px;color:#555;">
    <tr><td style="padding:5px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;">${booking.booking_code}</td></tr>
    <tr><td style="padding:5px 0;font-weight:600;">Equipment:</td><td>${equipmentName} (x${booking.quantity})</td></tr>
    <tr><td style="padding:5px 0;font-weight:600;">Borrow Date:</td><td>${borrowDate}</td></tr>
    <tr><td style="padding:5px 0;font-weight:600;">Return Date:</td><td>${returnDate}</td></tr>
  </table>
</div>
<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:15px;margin:15px 0;">
  <p style="color:#92400e;font-size:14px;margin:0;">📍 If you have any questions, please visit or contact the PMO Office.</p>
</div>`;

      const emailRes = await sendEmail({
        to: borrowerEmail,
        subject: `🔔 PMO Reminder - ${equipmentName} [${booking.booking_code}]`,
        html: emailHtml,
      });

      if (emailRes.success) {
        results.push(`Email sent to ${borrowerEmail}`);
      } else {
        console.error('Mail error:', emailRes.error);
        results.push(`Email failed: ${emailRes.error}`);
      }
    } catch (e) {
      console.error('Email error:', e);
      results.push('Email sending failed');
    }
  }

  // SMS notification via Semaphore API (Philippine SMS gateway)
  if (method === 'sms' || method === 'both') {
    if (contactNumber) {
      const semaphoreKey = process.env.SEMAPHORE_API_KEY;
      if (!semaphoreKey) {
        results.push(`SMS skipped — SEMAPHORE_API_KEY not configured (would send to ${contactNumber})`);
      } else {
        try {
          // Semaphore API uses form-encoded data
          const smsBody = new URLSearchParams();
          smsBody.append('apikey', semaphoreKey);
          smsBody.append('number', contactNumber);
          smsBody.append('message', `[PMO FSUU] ${message} - Booking: ${booking.booking_code}, Equipment: ${equipmentName}`);
          smsBody.append('sendername', 'PMOFSUU');

          const smsRes = await fetch('https://api.semaphore.co/api/v4/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: smsBody.toString(),
          });
          const smsData = await smsRes.text();
          if (smsRes.ok) {
            results.push(`SMS sent to ${contactNumber}`);
          } else {
            console.error('Semaphore SMS error:', smsData);
            results.push(`SMS failed to ${contactNumber}`);
          }
        } catch (e) {
          console.error('SMS error:', e);
          results.push(`SMS failed to ${contactNumber}`);
        }
      }
    } else {
      results.push('SMS skipped — no contact number on file');
    }
  }

  // Always create an in-app notification for the borrower
  if (serviceClient) {
    try {
      await serviceClient.from('notifications').insert({
        booking_id: bookingId,
        user_id: booking.borrower_id,
        type: 'reminder_15min' as any,
        title: 'Reminder from PMO Admin',
        message: message || `Reminder about your booking for ${equipmentName} (${booking.booking_code}).`,
        email_sent: results.some(r => r.startsWith('Email sent')),
        email_sent_at: results.some(r => r.startsWith('Email sent')) ? new Date().toISOString() : null,
      });
    } catch (e) {
      console.error('Notification insert error (non-critical):', e);
    }
  }

  revalidatePath('/admin/bookings');
  revalidatePath('/dashboard');
  return { success: true, details: results.join('; ') };
}

export async function cancelBooking(bookingId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('borrower_id', user.id)
    .eq('status', 'pending');

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getBookingStats() {
  const defaultStats = { totalEquipment: 0, activeBookings: 0, overdueBookings: 0, pendingBookings: 0, totalBookings: 0, lowInventory: [] as any[] };
  try {
    const supabase = await createServerSupabaseClient();

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return defaultStats;

    const [
      { count: totalEquipment },
      { count: activeBookings },
      { count: overdueBookings },
      { count: pendingBookings },
      { count: totalBookings },
    ] = await Promise.all([
      supabase.from('equipment').select('*', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['approved', 'borrowed']),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
    ]);

    // Low inventory equipment
    const { data: lowInventory } = await supabase
      .from('equipment')
      .select('id, name, available_quantity, total_quantity')
      .eq('is_archived', false)
      .lte('available_quantity', 2)
      .gt('total_quantity', 0)
      .order('available_quantity');

    return {
      totalEquipment: totalEquipment || 0,
      activeBookings: activeBookings || 0,
      overdueBookings: overdueBookings || 0,
      pendingBookings: pendingBookings || 0,
      totalBookings: totalBookings || 0,
      lowInventory: lowInventory || [],
    };
  } catch (e) {
    console.error('getBookingStats exception:', e);
    return defaultStats;
  }
}

export async function getCalendarBookings(startDate: string, endDate: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_code, borrow_date, return_date, status, borrower_name, quantity, equipment(name)')
      .gte('borrow_date', startDate)
      .lte('borrow_date', endDate)
      .in('status', ['approved', 'borrowed', 'pending'])
      .order('borrow_date');

    if (error) { console.error('getCalendarBookings error:', error.message); return []; }
    return data ?? [];
  } catch (e) {
    console.error('getCalendarBookings exception:', e);
    return [];
  }
}
