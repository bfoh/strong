import {launchSchemaAvailable} from '@/lib/server';
import {requireEditor} from '@/lib/admin-auth';import AdminShell from '@/components/AdminShell';import PropertyEditor from '@/components/PropertyEditor';
export default async function NewProperty(){const person=await requireEditor();return <AdminShell person={person}><span className="eyebrow">INVENTORY / NEW</span><h1>Add a property</h1><PropertyEditor launch={await launchSchemaAvailable()}/></AdminShell>}
