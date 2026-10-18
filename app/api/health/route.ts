/**
 * @fileoverview Sonda de liveness do Worker: `GET /api/health` responde JSON de
 *   status para o monitor externo confirmar que o runtime está de pé.
 * @module app/api/health
 * @description Route handler nativo do Next.js App Router. Contrato HTTP: 200 com
 *   `{ status, runtime, timestamp }`.
 * @dependencies next/server (NextResponse).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Responde à verificação de integridade do runtime.
 *
 * @returns JSON com status 'ok', o runtime e o timestamp atual.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    runtime: 'cloudflare-workers',
    timestamp: new Date().toISOString(),
  });
}
