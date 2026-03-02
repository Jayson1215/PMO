'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Notification } from '@/types/database';

export async function getNotifications(): Promise<{ data: Notification[] }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: [] };

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { console.error('getNotifications error:', error.message); return { data: [] }; }
    return { data: (data || []) as Notification[] };
  } catch (e) {
    console.error('getNotifications exception:', e);
    return { data: [] };
  }
}

export async function getUnreadCount() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return count || 0;
  } catch (e) {
    console.error('getUnreadCount exception:', e);
    return 0;
  }
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/admin');
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/admin');
  return { success: true };
}
