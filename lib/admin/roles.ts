/**
 * @fileoverview lib/admin/roles.ts — gestao transacional de papeis administrativos
 * @module lib/admin/roles
 * @description Wrapper sobre as RPCs seguras assign_admin_role e revoke_admin_role.
 *   Executa com credenciais de servico (service_role) e garante auditoria na mesma transacao.
 * @dependencies server-only, @/lib/admin/auth, @/lib/admin/service-client
 */
import 'server-only';

import type { AdminRole } from './auth';
import { sanitizeClientIp } from './audit-service';
import { getAdminServiceClient } from './service-client';

export interface AssignAdminRoleInput {
  userId: string;
  role: AdminRole;
  actorId: string;
  actorEmail?: string | null;
  ipAddress?: string | null;
}

export class RoleMutationError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'RoleMutationError';
  }
}

/**
 * Atribui ou atualiza o papel de um usuario no painel administrativo.
 *
 * @param input - Identificadores do usuario alvo, novo papel e dados do autor.
 * @throws {RoleMutationError} Caso o usuario nao exista ou ocorra erro de banco.
 */
export async function assignAdminRole(
  input: AssignAdminRoleInput,
): Promise<void> {
  let supabase;
  try {
    supabase = getAdminServiceClient();
  } catch {
    throw new RoleMutationError(
      'Configuracao administrativa ausente.',
      'CONFIG_MISSING',
    );
  }
  const cleanEmail = input.actorEmail
    ? input.actorEmail.trim().slice(0, 320) || null
    : null;
  const { error } = await supabase.rpc('assign_admin_role', {
    p_user_id: input.userId,
    p_role: input.role,
    p_actor_id: input.actorId,
    p_actor_email: cleanEmail,
    p_ip_address: sanitizeClientIp(input.ipAddress),
  });

  if (error) {
    if (
      error.code === 'P0002' ||
      error.message?.includes('admin_user_not_found')
    ) {
      throw new RoleMutationError(
        'Usuario nao encontrado no sistema de autenticacao.',
        'USER_NOT_FOUND',
      );
    }
    throw new RoleMutationError(
      `Falha ao atribuir papel: ${error.message}`,
      error.code,
    );
  }
}

/**
 * Revoga o papel de um usuario no painel administrativo.
 *
 * @param input - Identificadores do usuario alvo e dados do autor.
 * @throws {RoleMutationError} Caso o papel nao exista ou ocorra erro de banco.
 */
export async function revokeAdminRole(
  input: Omit<AssignAdminRoleInput, 'role'>,
): Promise<void> {
  let supabase;
  try {
    supabase = getAdminServiceClient();
  } catch {
    throw new RoleMutationError(
      'Configuracao administrativa ausente.',
      'CONFIG_MISSING',
    );
  }
  const cleanEmail = input.actorEmail
    ? input.actorEmail.trim().slice(0, 320) || null
    : null;
  const { error } = await supabase.rpc('revoke_admin_role', {
    p_user_id: input.userId,
    p_actor_id: input.actorId,
    p_actor_email: cleanEmail,
    p_ip_address: sanitizeClientIp(input.ipAddress),
  });

  if (error) {
    if (
      error.code === 'P0002' ||
      error.message?.includes('admin_role_not_found')
    ) {
      throw new RoleMutationError(
        'Papel administrativo nao encontrado para este usuario.',
        'ROLE_NOT_FOUND',
      );
    }
    throw new RoleMutationError(
      `Falha ao revogar papel: ${error.message}`,
      error.code,
    );
  }
}
