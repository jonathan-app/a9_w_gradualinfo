/**
 * @fileoverview app/api/admin/dashboard/health/route.ts — endpoint administrativo de consulta de saúde operacional
 * @module app/api/admin/dashboard/health/route
 * @description Retorna as sondagens reais de PostgreSQL, Supabase Auth e Sanity sob proteção AAL2.
 * @dependencies @/lib/admin/auth, @/lib/services/health-dashboard, next/server
 */

import { assertAdminApiAuth } from '@/lib/admin/auth';
import { getDashboardHealthData } from '@/lib/services/health-dashboard';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const auth = await assertAdminApiAuth(request, 'revisor');
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
    return new NextResponse('Falha ao executar diagnóstico de saúde.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
