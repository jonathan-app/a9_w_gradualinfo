/**
 * @fileoverview Quotas administrativas persistentes em SQLite no Durable Object.
 * @module lib/admin/rate-limit-do
 * @description Serializa consumo e alarme, preservando no máximo duas linhas de quota.
 * @dependencies lib/admin/rate-limit-protocol, contexto de armazenamento do Worker.
 */
import {
  readBoundedJson,
  type AdminRateOperation,
} from './rate-limit-protocol';

/** Superfície tipada do SQLite e alarmes usada pela classe, sem fallback local. */
export interface AdminRateState {
  storage: {
    sql: {
      exec<T extends Record<string, unknown>>(
        query: string,
        ...bindings: (string | number)[]
      ): { toArray(): T[] };
    };
    transactionSync<T>(callback: () => T): T;
    setAlarm(timestamp: number): Promise<void>;
    deleteAlarm(): Promise<void>;
  };
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

/** DO separado do preview, com nome singleton escolhido apenas pelo servidor. */
export class AdminRateLimitDO {
  /**
   * Inicializa o schema limitado de quotas.
   * @param ctx - Estado persistente fornecido pelo runtime Cloudflare.
   */
  constructor(private readonly ctx: AdminRateState) {
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS quotas (
      operation TEXT PRIMARY KEY CHECK(operation IN ('login','mfa')),
      count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 5),
      expires_at INTEGER NOT NULL
    )`);
  }

  private async scheduleAlarm() {
    const row = this.ctx.storage.sql
      .exec<{ next: number | null }>(
        'SELECT MIN(expires_at) AS next FROM quotas',
      )
      .toArray()[0];
    if (row?.next != null) await this.ctx.storage.setAlarm(row.next);
    else await this.ctx.storage.deleteAlarm();
  }

  /**
   * Consome uma tentativa com commit anterior à liberação do handler.
   * @param request - POST interno com operação fixa.
   * @returns Decisão HTTP 200, 429 ou falha genérica 503.
   */
  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== '/consume')
      return new Response(null, { status: 404 });
    if (request.method !== 'POST')
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    let operation: AdminRateOperation;
    try {
      if (
        request.headers.get('content-type')?.split(';')[0]?.trim() !==
        'application/json'
      )
        throw new Error('Formato inválido.');
      const body = await readBoundedJson(request, 128);
      if (
        !body ||
        typeof body !== 'object' ||
        Object.keys(body).length !== 1 ||
        !('operation' in body) ||
        (body.operation !== 'login' && body.operation !== 'mfa')
      )
        throw new Error('Operação inválida.');
      operation = body.operation;
    } catch {
      return Response.json({ error: 'invalid_request' }, { status: 400 });
    }
    try {
      return await this.ctx.blockConcurrencyWhile(async () => {
        const now = Date.now();
        const decision = this.ctx.storage.transactionSync(() => {
          this.ctx.storage.sql.exec(
            'DELETE FROM quotas WHERE expires_at <= ?',
            now,
          );
          const row = this.ctx.storage.sql
            .exec<{ count: number; expires_at: number }>(
              'SELECT count, expires_at FROM quotas WHERE operation = ?',
              operation,
            )
            .toArray()[0];
          if (row && row.count >= 5)
            return {
              allowed: false,
              retryAfter: Math.max(1, Math.ceil((row.expires_at - now) / 1000)),
            };
          this.ctx.storage.sql.exec(
            'INSERT INTO quotas (operation, count, expires_at) VALUES (?, ?, ?) ON CONFLICT(operation) DO UPDATE SET count = excluded.count, expires_at = excluded.expires_at',
            operation,
            (row?.count ?? 0) + 1,
            row?.expires_at ?? now + 60000,
          );
          return { allowed: true };
        });
        await this.scheduleAlarm();
        return Response.json(
          decision,
          decision.allowed
            ? { status: 200 }
            : {
                status: 429,
                headers: { 'Retry-After': String(decision.retryAfter) },
              },
        );
      });
    } catch {
      return Response.json(
        { error: 'rate_limit_unavailable' },
        { status: 503 },
      );
    }
  }

  /**
   * Remove quotas vencidas e reagenda com estado atual, permitindo retry do runtime.
   * @returns Conclusão do alarme ou erro a propagar para a plataforma.
   */
  async alarm(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.transactionSync(() =>
        this.ctx.storage.sql.exec(
          'DELETE FROM quotas WHERE expires_at <= ?',
          Date.now(),
        ),
      );
      await this.scheduleAlarm();
    });
  }
}
