/**
 * @fileoverview lib/admin/operators.ts — leitura paginada de operadores administrativos
 * @module lib/admin/operators
 * @description Fonte unica da listagem usada pela API e pela pagina do painel.
 *   A pagina roda no mesmo Worker: buscar a propria rota por HTTP falha no
 *   runtime da Cloudflare (subrequisicao para a mesma zona) e tambem no
 *   `wrangler dev`, onde a subrequisicao nem sai do processo. Chamar a RPC
 *   direto evita a viagem de rede e a duplicacao da consulta.
 * @dependencies server-only, @/lib/admin/auth, @/lib/admin/service-client, @/lib/env
 */
import 'server-only';

import { checkAdminUser, roleSatisfies, type AdminRole } from './auth';
import { getAdminServiceClient } from './service-client';
import { env } from '@/lib/env';

export interface AdminOperator {
  userId: string;
  email: string;
  role: AdminRole;
  assignedAt: string | null;
}

export interface AdminOperatorRoot extends AdminOperator {
  isRoot: true;
}

export interface AdminOperatorList {
  root: AdminOperatorRoot | null;
  operadores: AdminOperator[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface OperatorRow {
  user_id: string | null;
  email: string | null;
  role: AdminRole | null;
  assigned_at: string | null;
  total_count: number | string;
}

/**
 * Lista os operadores administrativos, exceto a conta raiz, em uma pagina.
 *
 * A checagem de papel acontece dentro do serviço, não só no chamador: ele usa
 * o cliente `service_role`, que ignora RLS, então um novo chamador que
 * esquecesse a guarda exporia a listagem inteira. Falha fechada é o padrão.
 *
 * @param input - Pagina e limite ja validados pelo chamador e o papel do ator.
 * @returns Conta raiz (quando configurada), operadores e metadados de paginacao.
 * @throws {Error} Quando o ator não é admin, ou o cliente/RPC falham.
 */
export async function listAdminOperadores(input: {
  page: number;
  limit: number;
  actorRole: AdminRole;
}): Promise<AdminOperatorList> {
  const { page, limit, actorRole } = input;
  if (!roleSatisfies(actorRole, 'admin')) {
    throw new Error('Leitura de operadores exige papel administrativo admin.');
  }
  // O papel fornecido pelo chamador não substitui uma sessão real validada.
  const auth = await checkAdminUser();
  if (
    auth instanceof Response ||
    !auth.ok ||
    !roleSatisfies(auth.role, 'admin')
  ) {
    throw new Error('Leitura de operadores exige sessão administrativa AAL2.');
  }
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    (page - 1) * limit > 2147483647
  ) {
    throw new Error('Paginação administrativa inválida.');
  }
  const rootAdminId = env.adminUserId.trim().toLowerCase();
  if (!rootAdminId)
    throw new Error('Configuração administrativa indisponível.');
  const supabase = getAdminServiceClient();

  const { data, error } = await supabase.rpc('list_admin_operadores', {
    p_root_id: rootAdminId,
    p_limit: limit,
    p_offset: (page - 1) * limit,
  });

  if (error) {
    throw new Error('Falha ao listar operadores administrativos.');
  }

  const rows = (data ?? []) as OperatorRow[];
  const first = rows[0];
  const total = first ? Number(first.total_count) : 0;

  return {
    root: rootAdminId
      ? {
          userId: rootAdminId,
          email: env.adminEmail.trim(),
          role: 'admin',
          assignedAt: null,
          isRoot: true,
        }
      : null,
    // A RPC retorna uma linha sentinela nula para preservar o total em página vazia.
    operadores: rows
      .filter((row) => row.user_id !== null)
      .map((row) => ({
        userId: row.user_id!,
        email: row.email ?? '',
        role: row.role as AdminRole,
        assignedAt: row.assigned_at,
      })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
