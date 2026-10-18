/**
 * @fileoverview Trilha de auditoria de eventos de segurança.
 * @module lib/audit
 * @description Emite, em JSON, eventos de login/logout do modo preview.
 *   A saída passa pelo logger estruturado; a função é o ponto único para trocar o destino
 *   (coletor de logs, Sentry) sem tocar em nenhum chamador.
 * @dependencies @/lib/logger para serializar e emitir o evento.
 *
 * Quando executado: sob demanda, a cada evento de preview.
 * Lê: o evento recebido. Escreve: nada em disco, apenas o log do runtime.
 * Premissa: auditoria é best-effort — falhar aqui não pode derrubar a operação
 *   que está sendo auditada.
 */
import { logger } from '@/lib/logger';

/**
 * Evento de auditoria: união discriminada por `type`. Cada variante carrega só
 * o contexto que lhe cabe — `ok` diz se a operação de preview resultou e `ip` é
 * opcional porque nem toda origem o expõe.
 */
export type AuditEvent =
  | { type: 'preview_login'; ok: boolean; ip?: string }
  | { type: 'preview_logout'; ok: boolean; ip?: string };

/**
 * Registra um evento de auditoria.
 *
 * @param event - Evento a serializar em JSON na linha de log.
 * @returns Nenhum valor; o efeito colateral é a escrita no console.
 *
 * Todos os ambientes usam o mesmo destino, pois a trilha deve manter o mesmo formato.
 */
export function audit(event: AuditEvent) {
  logger.info('audit', event);
}
