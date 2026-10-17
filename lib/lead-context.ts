import 'server-only';
import { z } from 'zod';
import { buyerContextSchema } from './marketing';
import { privateHouseStorage } from './house/storage';
export const leadContextSchema = z.object(buyerContextSchema).strict();
export type LeadContext = z.infer<typeof leadContextSchema>;
export async function saveLeadContext(kind: 'enquiries' | 'appointments', id: string, context: LeadContext) {
  if (!Object.values(context).some(value => value !== undefined)) return;
  const storage = await privateHouseStorage();
  const path = `lead-context/${kind}-${id}.json`, body = JSON.stringify(leadContextSchema.parse(context));
  const result = await storage.upload(path, body, { contentType: 'application/json', upsert: false, cacheControl: '0' });
  if (result.error) {
    if (String(result.error.statusCode) === '409' || /already exists|duplicate/i.test(result.error.message)) {
      const existing = await storage.download(path);
      if (existing.data && JSON.stringify(leadContextSchema.parse(JSON.parse(await existing.data.text()))) === body) return;
    }
    throw Error('Enquiry context could not be saved.');
  }
}
export async function readLeadContext(kind: 'enquiries' | 'appointments', id: string): Promise<LeadContext> {
  try { const { data } = await (await privateHouseStorage()).download(`lead-context/${kind}-${id}.json`); return data ? leadContextSchema.parse(JSON.parse(await data.text())) : {}; } catch { return {}; }
}
