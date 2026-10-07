import { env } from '@/lib/env';
import { UUID_PATTERN } from './session';

export function isPreviewConfigured(): boolean {
  return (
    Buffer.byteLength(env.previewToken) >= 32 &&
    Boolean(env.previewPassword && env.previewEmail) &&
    UUID_PATTERN.test(env.previewUserId) &&
    env.previewToken !== env.previewPassword
  );
}

export const previewCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/',
};
