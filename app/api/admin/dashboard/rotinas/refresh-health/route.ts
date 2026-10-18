/**
 * @fileoverview app/api/admin/dashboard/rotinas/refresh-health/route.ts — rotina de atualização sob demanda de saúde operacional
 * @module app/api/admin/dashboard/rotinas/refresh-health/route
 * @description Endpoint POST idempotente para disparar atualização das sondagens reais de integridade.
 * @dependencies @/lib/admin/auth, @/lib/services/health-dashboard, next/server
 */

import { assertAdminApiAuth } from '@/lib/admin/auth';
import { getDashboardHealthData } from '@/lib/services/health-dashboard';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const auth = await assertAdminApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const health = await getDashboardHealthData();
    return NextResponse.json(
      { ok: true, health },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return new NextResponse('Falha ao atualizar diagnóstico de saúde.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
