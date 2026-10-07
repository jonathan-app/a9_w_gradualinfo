/**
 * @fileoverview Trilha de auditoria de eventos de segurança.
 * @module lib/audit
 * @description Emite, em JSON, eventos de login/logout do modo preview e bloqueios de policy
 *   RLS. Hoje a saída é `console.info`; a função é o ponto único para trocar o destino
 *   (coletor de logs, Sentry) sem tocar em nenhum chamador.
 * @dependencies @/lib/env (siteUrl, isProduction) para escolher o ramo do log.
 *
 * Quando executado: sob demanda, a cada evento de preview ou bloqueio de RLS.
 * Lê: `env.siteUrl` e `env.isProduction`. Escreve: nada em disco — apenas stdout.
 * Premissa: auditoria é best-effort — falhar aqui não pode derrubar a operação
 *   que está sendo auditada.
 */
import { env } from '@/lib/env';

/**
 * Evento de auditoria: união discriminada por `type`. Cada variante carrega só
 * o contexto que lhe cabe — `ok` diz se a operação de preview resultou,
 * `rlss_block` identifica a policy que negou (tabela + operação) e `ip` é
 * opcional porque nem toda origem o expõe.
 */
export type AuditEvent =
  | { type: 'preview_login'; ok: boolean; ip?: string }
  | { type: 'preview_logout'; ok: boolean; ip?: string }
  | { type: 'rlss_block'; table: string; operation: string; ip?: string };

/**
 * Registra um evento de auditoria.
 *
 * @param event - Evento a serializar em JSON na linha de log.
 * @returns Nenhum valor; o efeito colateral é a escrita no console.
 *
 * Em localhost (sem `isProduction`) o evento sai pelo mesmo `console.info` e a
 * função retorna cedo. Os dois ramos fazem a mesma escrita hoje — o early-return
 * existe para ganhar destino diferente (arquivo/coletor) quando houver, sem
 * reescrever quem chama.
 */
export function audit(event: AuditEvent) {
  if (env.siteUrl === 'http://localhost:3000' && !env.isProduction) {
    console.info('[audit]', JSON.stringify(event));
    return;
  }

  console.info('[audit]', JSON.stringify(event));
}
