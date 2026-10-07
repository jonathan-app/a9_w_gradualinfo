import { env } from '@/lib/env';

export type AuditEvent =
  | { type: 'preview_login'; ok: boolean; ip?: string }
  | { type: 'preview_logout'; ip?: string }
  | { type: 'rlss_block'; table: string; operation: string; ip?: string };

export function audit(event: AuditEvent) {
  if (
    env.siteUrl === 'http://localhost:3000' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.info('[audit]', JSON.stringify(event));
    return;
  }

  console.info('[audit]', JSON.stringify(event));
}
