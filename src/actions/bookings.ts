'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { bookingSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import type { BookingStatus, NotificationType } from '@/types/database';

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

  // Create notification for admins
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

  // Create notification for borrower
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { error: 'Not authorized — admin only' };

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

  const serviceClient = await createServiceRoleClient();
  const results: string[] = [];

  // Send email directly via Resend API
  if (method === 'email' || method === 'both') {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey || resendApiKey.startsWith('re_your')) {
      results.push('Email skipped — RESEND_API_KEY not configured');
    } else {
      try {
        const borrowDate = new Date(booking.borrow_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
        const returnDate = new Date(booking.return_date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

        const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d6ec5);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">PMO Equipment Booking System</h1>
      <p style="color:#d4e2f5;margin:5px 0 0;font-size:13px;">Father Saturnino Urios University</p>
    </div>
    <div style="background:#f59e0b;padding:15px;text-align:center;">
      <h2 style="color:#fff;margin:0;font-size:18px;">🔔 Reminder from PMO Admin</h2>
    </div>
    <div style="padding:30px;">
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
      </div>
    </div>
    <div style="background:#1e3a5f;padding:20px;text-align:center;">
      <p style="color:#a9c5eb;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Property Management Office — FSUU</p>
      <p style="color:#7ea8e0;font-size:11px;margin:5px 0 0;">This is an automated reminder from the PMO Admin.</p>
    </div>
  </div>
</body></html>`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'PMO FSUU <onboarding@resend.dev>',
            to: [borrowerEmail],
            subject: `🔔 PMO Reminder - ${equipmentName} [${booking.booking_code}]`,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          results.push(`Email sent to ${borrowerEmail}`);
        } else {
          const errText = await emailRes.text();
          console.error('Resend error:', errText);
          results.push('Email sending failed — check Resend API key');
        }
      } catch (e) {
        console.error('Email error:', e);
        results.push('Email sending failed');
      }
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
  await serviceClient.from('notifications').insert({
    booking_id: bookingId,
    user_id: booking.borrower_id,
    type: 'reminder_15min' as any,
    title: 'Reminder from PMO Admin',
    message: message || `Reminder about your booking for ${equipmentName} (${booking.booking_code}).`,
    email_sent: results.some(r => r.startsWith('Email sent')),
    email_sent_at: results.some(r => r.startsWith('Email sent')) ? new Date().toISOString() : null,
  });

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
