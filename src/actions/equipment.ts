/**
 * EQUIPMENT ACTIONS (equipment.ts)
 * -------------------------------
 * Functionality: Manages the university's inventory of equipment (Projectors, Cables, etc.).
 * Connection: Interacts with 'equipment' and 'equipment_categories' tables, and Supabase Storage for images.
 */
'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { equipmentSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

/**
 * FETCH EQUIPMENT
 * Functionality: Retrieves a list of all equipment available for borrowing.
 * Connection: Joins with 'equipment_categories' to provide human-readable category names.
 */
export async function getEquipment(includeArchived = false) {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('equipment')
      .select('*, equipment_categories(id, name, icon)')
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;
    if (error) { console.error('getEquipment error:', error.message); return []; }
    return data ?? [];
  } catch (e) {
    console.error('getEquipment exception:', e);
    return [];
  }
}

export async function getEquipmentById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('equipment')
      .select('*, equipment_categories(id, name, icon)')
      .eq('id', id)
      .single();

    if (error) { console.error('getEquipmentById error:', error.message); return null; }
    return data;
  } catch (e) {
    console.error('getEquipmentById exception:', e);
    return null;
  }
}

export async function getCategories() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .order('name');

    if (error) { console.error('getCategories error:', error.message); return []; }
    return data ?? [];
  } catch (e) {
    console.error('getCategories exception:', e);
    return [];
  }
}

/**
 * CREATE EQUIPMENT (Admin Only)
 * Functionality: Adds a new item to the permanent inventory.
 * Connection: Validates input with 'equipmentSchema' before inserting into the database.
 */
export async function createEquipment(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const rawData = {
    name: formData.get('name') as string,
    category_id: formData.get('category_id') as string || null,
    description: formData.get('description') as string,
    total_quantity: Number(formData.get('total_quantity')),
    status: formData.get('status') as string || 'available',
    condition: formData.get('condition') as string || 'good',
    serial_number: formData.get('serial_number') as string,
    location: formData.get('location') as string,
    notes: formData.get('notes') as string,
  };

  const result = equipmentSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase.from('equipment').insert({
    ...result.data,
    available_quantity: result.data.total_quantity,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/equipment');
  return { success: true };
}

export async function updateEquipment(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const rawData = {
    name: formData.get('name') as string,
    category_id: formData.get('category_id') as string || null,
    description: formData.get('description') as string,
    total_quantity: Number(formData.get('total_quantity')),
    status: formData.get('status') as string || 'available',
    condition: formData.get('condition') as string || 'good',
    serial_number: formData.get('serial_number') as string,
    location: formData.get('location') as string,
    notes: formData.get('notes') as string,
  };

  const result = equipmentSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  // Calculate available quantity adjustment
  const { data: current } = await supabase
    .from('equipment')
    .select('total_quantity, available_quantity')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Equipment not found' };

  const quantityDiff = result.data.total_quantity - current.total_quantity;
  const newAvailable = Math.max(0, current.available_quantity + quantityDiff);

  const { error } = await supabase
    .from('equipment')
    .update({
      ...result.data,
      available_quantity: newAvailable,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/equipment');
  return { success: true };
}

export async function archiveEquipment(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('equipment')
    .update({ is_archived: true })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/equipment');
  return { success: true };
}

/**
 * UPLOAD EQUIPMENT IMAGE
 * Functionality: Uploads a photo of the equipment to the cloud.
 * Connection: Saves the file in 'equipment-images' storage bucket and links the URL to the record.
 */
export async function uploadEquipmentImage(equipmentId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const file = formData.get('image') as File;

  if (!file || file.size === 0) {
    return { error: 'No file provided' };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${equipmentId}-${Date.now()}.${fileExt}`;
  const filePath = `equipment/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('equipment-images')
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage
    .from('equipment-images')
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('equipment')
    .update({ image_url: publicUrl })
    .eq('id', equipmentId);

  if (updateError) return { error: updateError.message };

  revalidatePath('/admin/equipment');
  return { success: true, url: publicUrl };
}
