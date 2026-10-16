import { z } from 'zod';
const fields = {
  propertyId: z.string().uuid(), name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30).regex(/^[+\d\s().-]+$/).refine(value => { const digits = value.replace(/\D/g, ''); return digits.length >= 7 && digits.length <= 15; }),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  message: z.string().trim().max(2000).optional(), website: z.string().max(0).optional(),
};
export const enquirySchema = z.object(fields).strict();
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export const appointmentSchema = z.object({ ...fields, preferredDate: z.string().refine(validDate), preferredTime: z.string().refine(validTime) }).strict();
export function futurePreference(date: string, time: string, now = Date.now()) {
  // Ghana uses Africa/Accra (UTC+0). A requested preference is never a confirmed slot.
  if (!validDate(date) || !validTime(time)) return false;
  return new Date(`${date}T${time}:00Z`).getTime() > now;
}
