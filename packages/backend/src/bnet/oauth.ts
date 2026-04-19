import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { appSettings, bnetTokens } from '../db/schema';

const CLIENT_ID = process.env.BNET_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.BNET_CLIENT_SECRET ?? '';
const REDIRECT_URI = process.env.BNET_REDIRECT_URI ?? 'http://localhost:3001/api/auth/callback';

export const BNET_REGION = process.env.BNET_REGION ?? 'us';

export function isBnetConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function buildAuthUrl(): string {
  const state = nanoid(16);
  db.insert(appSettings)
    .values({ key: 'bnet_oauth_state', value: state })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: state } })
    .run();

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'wow.profile',
    state,
  });
  return `https://oauth.battle.net/authorize?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

function basicAuth(): string {
  return Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
}

export async function exchangeCode(code: string, state: string): Promise<void> {
  const storedState = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, 'bnet_oauth_state'))
    .get();
  if (!storedState || storedState.value !== state) {
    throw new Error('Invalid OAuth state — possible CSRF attempt');
  }
  db.delete(appSettings).where(eq(appSettings.key, 'bnet_oauth_state')).run();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }

  saveToken(await res.json() as TokenResponse);
}

export async function refreshAccessToken(): Promise<string> {
  const row = db.select().from(bnetTokens).where(eq(bnetTokens.region, BNET_REGION)).get();
  if (!row?.refreshToken) {
    db.delete(bnetTokens).where(eq(bnetTokens.region, BNET_REGION)).run();
    throw new Error('bnet_token_expired');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: row.refreshToken,
  });

  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    db.delete(bnetTokens).where(eq(bnetTokens.region, BNET_REGION)).run();
    throw new Error('bnet_token_expired');
  }

  const data = await res.json() as TokenResponse;
  saveToken(data);
  return data.access_token;
}

function saveToken(data: TokenResponse): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + data.expires_in * 1000).toISOString();
  const updatedAt = now.toISOString();

  const existing = db
    .select()
    .from(bnetTokens)
    .where(eq(bnetTokens.region, BNET_REGION))
    .get();

  if (existing) {
    db.update(bnetTokens)
      .set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? existing.refreshToken,
        expiresAt,
        scope: data.scope ?? existing.scope,
        updatedAt,
      })
      .where(eq(bnetTokens.region, BNET_REGION))
      .run();
  } else {
    db.insert(bnetTokens)
      .values({
        id: nanoid(),
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
        scope: data.scope ?? null,
        region: BNET_REGION,
        updatedAt,
      })
      .run();
  }
}

export function getTokenStatus(): { connected: boolean; expiresAt: string | null } {
  const row = db.select().from(bnetTokens).where(eq(bnetTokens.region, BNET_REGION)).get();
  if (!row) return { connected: false, expiresAt: null };
  return { connected: true, expiresAt: row.expiresAt };
}

export function deleteToken(): void {
  db.delete(bnetTokens).where(eq(bnetTokens.region, BNET_REGION)).run();
}
