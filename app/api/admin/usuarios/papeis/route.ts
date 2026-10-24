/**
 * @fileoverview app/api/admin/usuarios/papeis/route.ts — atribuicao de papeis administrativos
 * @module app/api/admin/usuarios/papeis/route
 * @description Endpoint restrito a administradores (AAL2) para atribuicao de papeis a usuarios.
 *   Impede alteracao do administrador raiz (env.adminUserId) com HTTP 409 Conflict.
 * @dependencies next/server, @/lib/admin/auth, @/lib/admin/roles, @/lib/env, @/lib/admin/audit-service
 */

import { NextResponse } from 'next/server';
import { assertAdminApiAuth, type AdminRole } from '@/lib/admin/auth';
import { listAdminOperadores } from '@/lib/admin/operators';
import { assignAdminRole, RoleMutationError } from '@/lib/admin/roles';
import { env } from '@/lib/env';
import { apiErrorResponse } from '@/lib/utils/api-response';

// Forma 8-4-4-4-12 em hexadecimal. Versao e variante RFC nao entram na
// validacao: o tipo `uuid` do Postgres aceita qualquer hexadecimal e a conta
// raiz do projeto usa um identificador fora do padrao v4. Quem garante que o
// usuario existe e a RPC, que falha fechada com P0002.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES: AdminRole[] = ['admin', 'editor', 'revisor'];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parsePageLimit(
  searchParams: URLSearchParams,
): { page: number; limit: number } | NextResponse {
  const pageValues = searchParams.getAll('page');
  const limitValues = searchParams.getAll('limit');

  if (pageValues.length > 1 || limitValues.length > 1) {
    return NextResponse.json(
      {
        error: 'invalid_params',
        message: 'Parametros duplicados nao sao permitidos.',
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const pageRaw = pageValues[0] ?? '';
  const limitRaw = limitValues[0] ?? '';

  let page: number;
  if (pageRaw === '') {
    page = DEFAULT_PAGE;
  } else if (!/^\d+$/.test(pageRaw)) {
    return NextResponse.json(
      { error: 'invalid_page', message: 'Pagina invalida.' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } else {
    page = Number(pageRaw);
    if (!Number.isSafeInteger(page) || page < 1) {
      return NextResponse.json(
        { error: 'invalid_page', message: 'Pagina deve ser maior que zero.' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
  }

  let limit: number;
  if (limitRaw === '') {
    limit = DEFAULT_LIMIT;
  } else if (!/^\d+$/.test(limitRaw)) {
    return NextResponse.json(
      { error: 'invalid_limit', message: 'Limite invalido.' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } else {
    limit = Number(limitRaw);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return NextResponse.json(
        {
          error: 'invalid_limit',
          message: `Limite deve estar entre 1 e ${MAX_LIMIT}.`,
        },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
  }

  if ((page - 1) * limit > 2147483647) {
    return NextResponse.json(
      {
        error: 'invalid_page',
        message: 'Pagina excede o limite maximo suportado.',
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return { page, limit };
}

export async function GET(request: Request) {
  const auth = await assertAdminApiAuth(request, 'admin');
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = parsePageLimit(new URL(request.url).searchParams);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const { page, limit } = parsed;

  try {
    const data = await listAdminOperadores({
      page,
      limit,
      actorRole: auth.role,
    });
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return apiErrorResponse(
      503,
      'role_list_failed',
      'Falha ao listar operadores administrativos.',
    );
  }
}

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

  // Normaliza a caixa: o Postgres compara uuid sem distincao de caixa, e a
  // guarda da conta raiz precisa comparar o mesmo valor que chega ao banco.
  const targetUserId = String(body.userId || '')
    .trim()
    .toLowerCase();
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
  const rootAdminId = env.adminUserId.trim().toLowerCase();
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
