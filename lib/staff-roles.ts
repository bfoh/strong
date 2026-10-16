import { z } from 'zod';
export const staffSchema = z.object({ id: z.string().uuid(), full_name: z.string(), role: z.enum(['admin', 'manager', 'editor', 'agent']) });
export type Staff = z.infer<typeof staffSchema>;
export function canEditProperties(person: Staff) { return ['admin', 'manager', 'editor'].includes(person.role); }
export function canManageLeads(person: Staff) { return ['admin', 'manager', 'agent'].includes(person.role); }
