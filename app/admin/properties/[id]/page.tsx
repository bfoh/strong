import MediaManager from '@/components/admin/MediaManager';
import {notFound} from 'next/navigation';import {requireEditor} from '@/lib/admin-auth';import AdminShell from '@/components/AdminShell';import PropertyEditor from '@/components/PropertyEditor';import {db} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function EditProperty({params}:{params:Promise<{id:string}>}){const person=await requireEditor();const {id}=await params;const {data}=await db()!.from('properties').select('*').eq('id',id).maybeSingle();if(!data)notFound();return <AdminShell person={person}><span className="eyebrow">INVENTORY / EDIT</span><h1>Edit property</h1><PropertyEditor item={data}/><MediaManager propertyId={data.id}/></AdminShell>}
