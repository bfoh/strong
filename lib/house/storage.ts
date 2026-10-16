import 'server-only';
import { db } from '@/lib/server';
import { cache } from 'react';
import { defaultHouseSettings, houseSettingsSchema, type HouseSettings } from './config';
export const HOUSE_BUCKET = 'strong-homepage-private';
export const SETTINGS_PATH = 'settings/homepage-v1.json';
export const houseSettings = cache(async (): Promise<HouseSettings> => {
  const client = db(); if (!client) return defaultHouseSettings;
  const { data, error } = await client.storage.from(HOUSE_BUCKET).download(SETTINGS_PATH);
  if (error || !data) return defaultHouseSettings;
  try { return houseSettingsSchema.parse(JSON.parse(await data.text())); } catch { return defaultHouseSettings; }
});
export async function privateHouseStorage() {
  const client = db(); if (!client) throw Error('Storage is unavailable.');
  const { data, error } = await client.storage.getBucket(HOUSE_BUCKET);
  if (error || !data || data.public) throw Error('Private enquiry storage is unavailable.');
  return client.storage.from(HOUSE_BUCKET);
}
