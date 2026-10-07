import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const PREVIEW_COOKIE = 'gradualinfo-preview';
export const PREVIEW_TTL = 1800;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PreviewGrant {
  version: 1;
  sub: string;
  session_id: string;
  issued_at: number;
  expires_at: number;
}

export function equalSecret(value: string, expected: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(value).digest(),
    createHash('sha256').update(expected).digest(),
  );
}

function signature(payload: string, secret: string): Buffer {
  const key = createHmac('sha256', secret)
    .update('gradualinfo-preview:v1')
    .digest();
  return createHmac('sha256', key).update(payload).digest();
}

export function issuePreviewGrant(
  sub: string,
  sessionId: string,
  secret: string,
  now = Date.now(),
): string {
  const issuedAt = Math.floor(now / 1000);
  const grant: PreviewGrant = {
    version: 1,
    sub,
    session_id: sessionId,
    issued_at: issuedAt,
    expires_at: issuedAt + PREVIEW_TTL,
  };
  const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
  return `${payload}.${signature(payload, secret).toString('base64url')}`;
}

export function readPreviewGrant(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): PreviewGrant | null {
  if (!value || !secret || value.length > 2048) return null;
  try {
    const [payload, mac, extra] = value.split('.');
    if (
      !payload ||
      !mac ||
      extra ||
      !/^[A-Za-z0-9_-]+$/.test(payload) ||
      !/^[A-Za-z0-9_-]+$/.test(mac)
    )
      return null;
    const supplied = Buffer.from(mac, 'base64url');
    const expected = signature(payload, secret);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      return null;
    const grant: PreviewGrant = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    const seconds = Math.floor(now / 1000);
    if (
      grant.version !== 1 ||
      typeof grant.sub !== 'string' ||
      !UUID_PATTERN.test(grant.sub) ||
      typeof grant.session_id !== 'string' ||
      !UUID_PATTERN.test(grant.session_id) ||
      !Number.isSafeInteger(grant.issued_at) ||
      !Number.isSafeInteger(grant.expires_at) ||
      grant.issued_at > seconds ||
      grant.expires_at - grant.issued_at !== PREVIEW_TTL ||
      seconds >= grant.expires_at
    )
      return null;
    return grant;
  } catch {
    return null;
  }
}
