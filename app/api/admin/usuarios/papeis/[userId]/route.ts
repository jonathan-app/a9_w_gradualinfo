/**
 * @fileoverview app/api/admin/usuarios/papeis/[userId]/route.ts — revogacao de papel administrativo
 * @module app/api/admin/usuarios/papeis/[userId]/route
 * @description Endpoint restrito a administradores (AAL2) para remocao de papel administrativo.
 *   Impede revogacao da conta raiz permanente (env.adminUserId) com HTTP 409 Conflict.
 * @dependencies next/server, @/lib/admin/auth, @/lib/admin/roles, @/lib/env
 */

import { NextResponse } from 'next/server';
import { assertAdminApiAuth } from '@/lib/admin/auth';
import { revokeAdminRole, RoleMutationError } from '@/lib/admin/roles';
import { env } from '@/lib/env';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const auth = await assertAdminApiAuth(request, 'admin');
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const targetUserId = params?.userId?.trim();

  if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
    return NextResponse.json(
      {
        error: 'invalid_user_id',
        message: 'Identificador de usuario invalido.',
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const rootAdminId = env.adminUserId.trim();
  if (rootAdminId && targetUserId === rootAdminId) {
    return NextResponse.json(
      {
        error: 'root_admin_immutable',
        message:
          'A conta raiz permanente nao pode ser removida via gestao de papeis.',
      },
      { status: 409, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const clientIp = request.headers.get('cf-connecting-ip');

  try {
    await revokeAdminRole({
      userId: targetUserId,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      ipAddress: clientIp,
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Papel administrativo revogado com sucesso.',
      },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    if (err instanceof RoleMutationError && err.code === 'ROLE_NOT_FOUND') {
      return NextResponse.json(
        { error: 'role_not_found', message: err.message },
        { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    return NextResponse.json(
      {
        error: 'role_revocation_failed',
        message: 'Falha ao revogar papel administrativo.',
      },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
