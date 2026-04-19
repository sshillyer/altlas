import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { bnetTokens } from '../db/schema';
import { BNET_REGION, refreshAccessToken } from './oauth';

const REGION_HOSTS: Record<string, string> = {
  us: 'https://us.api.blizzard.com',
  eu: 'https://eu.api.blizzard.com',
  kr: 'https://kr.api.blizzard.com',
  tw: 'https://tw.api.blizzard.com',
};

async function getAccessToken(): Promise<string> {
  const row = db.select().from(bnetTokens).where(eq(bnetTokens.region, BNET_REGION)).get();
  if (!row) throw new Error('bnet_token_expired');

  const expiresAt = new Date(row.expiresAt).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt - Date.now() < fiveMinutes) {
    return refreshAccessToken();
  }

  return row.accessToken;
}

export async function bnetFetch<T>(path: string, apiRegion?: string): Promise<T> {
  const host = REGION_HOSTS[apiRegion ?? BNET_REGION] ?? REGION_HOSTS.us;
  const token = await getAccessToken();

  const res = await fetch(`${host}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Blizzard API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}
