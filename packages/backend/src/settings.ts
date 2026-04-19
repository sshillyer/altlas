import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { appSettings } from './db/schema';

export function getRegion(): string {
  const row = db.select().from(appSettings).where(eq(appSettings.key, 'region')).get();
  return row?.value ?? 'us';
}
