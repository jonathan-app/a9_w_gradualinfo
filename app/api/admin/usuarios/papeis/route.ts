/**
 * @fileoverview app/api/admin/usuarios/papeis/route.ts — atribuicao de papeis administrativos
 * @module app/api/admin/usuarios/papeis/route
 * @description Endpoint restrito a administradores (AAL2) para atribuicao de papeis a usuarios.
 *   Impede alteracao do administrador raiz (env.adminUserId) com HTTP 409 Conflict.
 * @dependencies next/server, @/lib/admin/auth, @/lib/admin/roles, @/lib/env, @/lib/admin/audit-service
 */

import { NextResponse } from 'next/server';
import { assertAdminApiAuth, type AdminRole } from '@/lib/admin/auth';
import { assignAdminRole, RoleMutationError } from '@/lib/admin/roles';
import { env } from '@/lib/env';
import { apiErrorResponse } from '@/lib/utils/api-response';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES: AdminRole[] = ['admin', 'editor', 'revisor'];

export async function POST(request: Request) {
  const auth = await assertAdminApiAuth(request, 'admin');
  if (!auth.ok) {
    return auth.response;
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid_body');
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Corpo da requisicao invalido.' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const targetUserId = String(body.userId || '').trim();
  const targetRole = String(body.role || '').trim() as AdminRole;

  if (!UUID_REGEX.test(targetUserId)) {
    return NextResponse.json(
      {
        error: 'invalid_user_id',
        message: 'Identificador de usuario invalido.',
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  if (!ALLOWED_ROLES.includes(targetRole)) {
    return NextResponse.json(
      {
        error: 'invalid_role',
        message:
          'Papel administrativo invalido. Valores permitidos: admin, editor, revisor.',
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  // A conta raiz permanente nao pode ser rebaixada ou sobrescrita via banco
  const rootAdminId = env.adminUserId.trim();
  if (rootAdminId && targetUserId === rootAdminId) {
    return NextResponse.json(
      {
        error: 'root_admin_immutable',
        message:
          'A conta raiz permanente nao pode ser modificada via gestao de papeis.',
      },
      { status: 409, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const clientIp = request.headers.get('cf-connecting-ip');

  try {
    await assignAdminRole({
      userId: targetUserId,
      role: targetRole,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      ipAddress: clientIp,
    });

    return NextResponse.json(
      {
        ok: true,
        message: `Papel '${targetRole}' atribuido com sucesso ao usuario.`,
      },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    if (err instanceof RoleMutationError && err.code === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'user_not_found', message: err.message },
        { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    return apiErrorResponse(
      500,
      'role_assignment_failed',
      'Falha ao processar a atribuicao de papel.',
    );
  }
}
