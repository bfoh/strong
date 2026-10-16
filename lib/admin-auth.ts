import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase-config';
import { staffSchema, canEditProperties, canManageLeads, type Staff } from './staff-roles';
export { staffSchema, canEditProperties, canManageLeads, type Staff } from './staff-roles';
export async function staff(): Promise<Staff | null> {
  const token = (await cookies()).get('sp_admin_token')?.value;
  const { url, publicKey } = supabaseConfig();
  if (!token || !url || !publicKey) return null;
  const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return null;
  const client = db(); if (!client) return null;
  const { data, error: profileError } = await client.from('staff_profiles').select('id,full_name,role').eq('id', user.id).maybeSingle();
  const profile = staffSchema.safeParse(data);
  return profileError || !profile.success ? null : profile.data;
}
export async function requireStaff() { const person = await staff(); if (!person) redirect('/admin/login'); return person; }
export async function requireEditor() { const person = await requireStaff(); if (!canEditProperties(person)) redirect('/admin'); return person; }
export async function requireLeadManager() { const person = await requireStaff(); if (!canManageLeads(person)) redirect('/admin'); return person; }
