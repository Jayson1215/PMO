'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getAllUsers() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Not authorized — admin only');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getAllUsers error:', error);
    return [];
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'borrower') {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Verify admin role of the person making the change
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (adminProfile?.role !== 'admin') throw new Error('Not authorized');

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
    
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('updateUserRole error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update role' };
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (adminProfile?.role !== 'admin') throw new Error('Not authorized');

    // Use service role client to delete from auth
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const serviceClient = await createServiceRoleClient();

    // Delete from auth.users (this also deletes from public.profiles due to CASCADE if setup, 
    // but better to be explicit or check schema)
    const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // The trigger/foreign key should handle profiles table, but if not:
    await serviceClient.from('profiles').delete().eq('id', userId);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('deleteUser error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete user' };
  }
}
