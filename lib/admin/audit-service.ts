/**
 * @fileoverview lib/admin/audit-service.ts — servico de auditoria persistente WORM e append-only
 * @module lib/admin/audit-service
 * @description Centraliza a gravacao de eventos administrativos no PostgreSQL (admin_audit_log).
 *   Implementa sanitizacao recursiva de metadados contra vazamento de segredos, operacoes em duas fases,
 *   idempotencia e distincao entre falha fechada para operacoes criticas e fallback seguro para telemetria.
 * @dependencies server-only, node:crypto, @/lib/admin/auth, @/lib/admin/service-client
 */
import 'server-only';

import { randomUUID } from 'node:crypto';
import type { AdminRole } from './auth';
import { getAdminServiceClient } from './service-client';

export type AuditActorType = 'admin' | 'system';
export type AuditStatus = 'intent' | 'success' | 'failure';

export interface AdminAuditPayload {
  operationId?: string;
  actorType: AuditActorType;
  actorId: string;
  actorEmail?: string | null;
  actorRole?: AdminRole | null;
  action: string;
  resourceType: 'article' | 'offer' | 'user' | 'auth' | 'preview' | 'system';
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  status?: AuditStatus;
  critical?: boolean;
}

export class AdminAuditUnavailableError extends Error {
  constructor(
    message = 'Trilha de auditoria administrativa temporariamente indisponível.',
  ) {
    super(message);
    this.name = 'AdminAuditUnavailableError';
  }
}

const SENSITIVE_KEY_REGEX =
  /^(password|token|access_token|refresh_token|authorization|cookie|totp|code|secret|key)$/i;
const MAX_METADATA_DEPTH = 3;
const MAX_METADATA_KEYS = 50;
const MAX_METADATA_BYTES = 8192; // 8 KB

/**
 * Sanitiza recursivamente o objeto de metadados antes da gravacao duravel.
 * Mascara campos sensiveis, limita profundidade e tamanho total para impedir abusos.
 *
 * @param obj - Objeto de metadados bruto.
 * @param depth - Nivel atual de recursao.
 * @returns Objeto de metadados seguro e limitado.
 */
export function sanitizeAuditMetadata(
  obj: unknown,
  depth = 0,
): Record<string, unknown> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {};
  }

  let keyCount = 0;

  function clean(target: unknown, currentDepth: number): unknown {
    if (currentDepth > MAX_METADATA_DEPTH) {
      return '[TRUNCATED_DEPTH]';
    }

    if (!target || typeof target !== 'object') {
      return target;
    }

    if (Array.isArray(target)) {
      return target.slice(0, 20).map((item) => clean(item, currentDepth + 1));
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(target)) {
      keyCount++;
      if (keyCount > MAX_METADATA_KEYS) {
        cleaned._truncated = 'key_limit_reached';
        break;
      }

      if (SENSITIVE_KEY_REGEX.test(key)) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = clean(value, currentDepth + 1);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  const result = clean(obj, depth) as Record<string, unknown>;

  try {
    const serialized = JSON.stringify(result);
    if (new TextEncoder().encode(serialized).length > MAX_METADATA_BYTES) {
      return {
        _truncated: true,
        reason: 'payload_exceeds_8kb_limit',
      };
    }
  } catch {
    return {
      _truncated: true,
      reason: 'serialization_error',
    };
  }

  return result;
}

/**
 * Normaliza e limita o endereco IP do cliente conforme cabecalho confiavel da Cloudflare.
 *
 * @param ip - Endereco bruto recebido.
 * @returns Endereco IP limitado a 45 caracteres ou null.
 */
export function sanitizeClientIp(ip?: string | null): string | null {
  if (!ip || typeof ip !== 'string') return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
}

/**
 * Registra um evento simples na trilha de auditoria administrativa.
 * Em caso de evento critico (critical: true), a falha lanca AdminAuditUnavailableError.
 * Em eventos rotineiros, a falha e canalizada para stderr sem derrubar o fluxo.
 *
 * @param payload - Dados estruturados do evento.
 */
export async function recordAdminAudit(
  payload: AdminAuditPayload,
): Promise<void> {
  const metadata = sanitizeAuditMetadata(payload.metadata);
  const ipAddress = sanitizeClientIp(payload.ipAddress);
  const status = payload.status || 'success';

  // A constraint SQL admin_audit_actor_shape exige:
  // actor_type = 'admin'  => actor_role NOT NULL
  // actor_type = 'system' => actor_role IS NULL
  // Garante essa invariante antes de gravar para evitar erro obscuro no banco.
  // Quando actorRole nao e fornecido para admin, usa 'revisor' (papel mais
  // restrito conservador) em vez de lançar, mantendo o comportamento de
  // falha segura para telemetria ja adotado pelo servico.
  let actorRole = payload.actorRole;
  if (payload.actorType === 'admin' && !actorRole) {
    actorRole = 'revisor';
  }
  if (payload.actorType === 'system' && actorRole != null) {
    actorRole = null;
  }

  try {
    const supabase = getAdminServiceClient();
    const { error } = await supabase.from('admin_audit_log').insert({
      operation_id: payload.operationId || null,
      actor_type: payload.actorType,
      actor_id: payload.actorId,
      actor_email: payload.actorEmail || null,
      actor_role: actorRole,
      action: payload.action,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId || null,
      metadata,
      ip_address: ipAddress,
      status,
    });

    if (error) {
      throw new Error(`Falha ao inserir log de auditoria: ${error.message}`);
    }
  } catch (err) {
    if (payload.critical) {
      throw new AdminAuditUnavailableError(
        err instanceof Error ? err.message : 'Falha na trilha de auditoria',
      );
    }
    // Canaliza para stderr sem invocar novamente o servico, prevenindo recursao
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[admin_audit_log_failure] ${errMsg}\n`);
  }
}

/**
 * Inicia uma operacao administrativa de duas fases com status 'intent'.
 * Se a gravacao falhar, lanca AdminAuditUnavailableError para impedir que a mutacao externa ocorra.
 *
 * @param payload - Dados iniciais da operacao pretendida.
 * @returns Identificador unico da operacao para posterior conclusao.
 */
export async function beginAdminOperation(
  payload: AdminAuditPayload,
): Promise<string> {
  const operationId = payload.operationId || randomUUID();
  await recordAdminAudit({
    ...payload,
    operationId,
    status: 'intent',
    critical: true,
  });
  return operationId;
}

/**
 * Conclui uma operacao administrativa com status 'success' ou 'failure'.
 * Utiliza o mesmo operationId da fase inicial. Repeticoes sao idempotentes.
 *
 * @param operationId - Identificador retornado por beginAdminOperation.
 * @param status - Desfecho da operacao.
 * @param metadata - Metadados adicionais do desfecho.
 */
export async function completeAdminOperation(
  operationId: string,
  status: 'success' | 'failure',
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = getAdminServiceClient();
    const cleanMeta = sanitizeAuditMetadata(metadata);
    const { error } = await supabase.from('admin_audit_log').insert({
      operation_id: operationId,
      actor_type: 'system',
      actor_id: 'system',
      actor_role: null,
      action: 'operation.completed',
      resource_type: 'system',
      metadata: cleanMeta,
      status,
    });

    if (error && error.code !== '23505') {
      // 23505 = violacao de indice unico (ja gravado com este status, operacao idempotente)
      throw new Error(
        `Falha ao concluir operacao de auditoria: ${error.message}`,
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[admin_audit_complete_failure] ${errMsg}\n`);
  }
}
