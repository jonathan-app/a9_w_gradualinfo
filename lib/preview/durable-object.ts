/**
 * @fileoverview Gerenciamento de sessões persistentes de preview via Cloudflare Durable Object.
 * @module lib/preview/durable-object
 * @description Implementa armazenamento com consistência forte e linearizabilidade global
 *   para controle de ciclo de vida e revogação imediata de sessões de preview (`session_id`).
 *   Substitui abordagens com consistência eventual (como KV, que pode demorar 60s para propagar)
 *   e memória volátil de instância. Oferece fall-back em memória estritamente para testes locais
 *   e ambientes onde o binding da Cloudflare não está presente.
 * @dependencies @opennextjs/cloudflare (getCloudflareContext opcional).
 */

/**
 * Registro de sessão persistido no armazenamento do Durable Object.
 */
export interface PreviewSessionRecord {
  session_id: string;
  issued_at: number;
  expires_at: number;
  revoked: boolean;
  revoked_at?: number;
}

/**
 * Resultado da validação de uma sessão pelo Durable Object.
 */
export interface SessionValidationResult {
  valid: boolean;
  revoked: boolean;
  expired: boolean;
  record?: PreviewSessionRecord;
}

/**
 * Contrato abstrato do repositório de sessões de preview.
 */
export interface PreviewSessionStore {
  createSession(session: {
    session_id: string;
    issued_at: number;
    expires_at: number;
  }): Promise<void>;
  validateSession(
    sessionId: string,
    now?: number,
  ): Promise<SessionValidationResult>;
  revokeSession(sessionId: string, now?: number): Promise<boolean>;
}

/**
 * Implementação em memória com consistência forte para testes locais e desenvolvimento.
 */
export class InMemoryPreviewSessionStore implements PreviewSessionStore {
  private readonly storage = new Map<string, PreviewSessionRecord>();
  public simulateFailure = false;

  async createSession(session: {
    session_id: string;
    issued_at: number;
    expires_at: number;
  }): Promise<void> {
    if (this.simulateFailure) {
      throw new Error('Falha simulada de I/O no armazenamento de sessão.');
    }
    this.storage.set(session.session_id, {
      session_id: session.session_id,
      issued_at: session.issued_at,
      expires_at: session.expires_at,
      revoked: false,
    });
  }

  async validateSession(
    sessionId: string,
    now = Date.now(),
  ): Promise<SessionValidationResult> {
    if (this.simulateFailure) {
      throw new Error(
        'Falha simulada de conectividade com o armazenamento de sessão.',
      );
    }
    const record = this.storage.get(sessionId);
    if (!record) {
      return { valid: false, revoked: false, expired: false };
    }
    const currentSeconds = Math.floor(now / 1000);
    const expired = currentSeconds >= record.expires_at;
    const revoked = record.revoked;
    const valid = !revoked && !expired;

    return { valid, revoked, expired, record };
  }

  async revokeSession(sessionId: string, now = Date.now()): Promise<boolean> {
    if (this.simulateFailure) {
      throw new Error('Falha simulada de I/O na revogação de sessão.');
    }
    const record = this.storage.get(sessionId);
    if (!record) {
      // Cria registro de revogação explícita para evitar reutilização caso a criação tenha tido delay
      this.storage.set(sessionId, {
        session_id: sessionId,
        issued_at: Math.floor(now / 1000),
        expires_at: Math.floor(now / 1000) + 1800,
        revoked: true,
        revoked_at: Math.floor(now / 1000),
      });
      return true;
    }
    record.revoked = true;
    record.revoked_at = Math.floor(now / 1000);
    this.storage.set(sessionId, record);
    return true;
  }

  clear(): void {
    this.storage.clear();
    this.simulateFailure = false;
  }
}

/**
 * Instância singleton global para desenvolvimento/testes locais.
 */
const localStoreInstance = new InMemoryPreviewSessionStore();

export interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): {
    fetch(url: string | URL | Request, init?: RequestInit): Promise<Response>;
  };
}

export interface DurableObjectStateLike {
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T = unknown>(key: string, value: T): Promise<void>;
  };
}

/**
 * Stub de adaptador para o Cloudflare Durable Object quando em produção no Worker.
 */
export class CloudflareDurableObjectSessionStore implements PreviewSessionStore {
  constructor(private readonly namespace: DurableObjectNamespaceLike) {}

  private getStub(_sessionId: string) {
    // Agrupa por partição determinística ou ID global singleton para linearidade de revogação
    const id = this.namespace.idFromName('global-preview-sessions');
    return this.namespace.get(id);
  }

  async createSession(session: {
    session_id: string;
    issued_at: number;
    expires_at: number;
  }): Promise<void> {
    const stub = this.getStub(session.session_id);
    const response = await stub.fetch('http://do/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (!response.ok) {
      throw new Error(
        `Erro ao persistir sessão no Durable Object: HTTP ${response.status}`,
      );
    }
  }

  async validateSession(
    sessionId: string,
    now = Date.now(),
  ): Promise<SessionValidationResult> {
    const stub = this.getStub(sessionId);
    const response = await stub.fetch(
      `http://do/session/validate?id=${encodeURIComponent(sessionId)}&now=${now}`,
      {
        method: 'GET',
      },
    );
    if (!response.ok) {
      throw new Error(
        `Erro ao consultar sessão no Durable Object: HTTP ${response.status}`,
      );
    }
    return (await response.json()) as SessionValidationResult;
  }

  async revokeSession(sessionId: string, now = Date.now()): Promise<boolean> {
    const stub = this.getStub(sessionId);
    const response = await stub.fetch('http://do/session/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, now }),
    });
    if (!response.ok) {
      throw new Error(
        `Erro ao revogar sessão no Durable Object: HTTP ${response.status}`,
      );
    }
    const result = (await response.json()) as { success: boolean };
    return Boolean(result.success);
  }
}

/**
 * Obtém o armazenamento ativo de sessões de preview.
 *
 * Tenta resolver o binding da Cloudflare via OpenNext; se não disponível
 * (em testes Node, Vitest ou build inicial), retorna o armazenamento em memória.
 *
 * @returns Instância compatível com `PreviewSessionStore`.
 */
export function getPreviewSessionStore(): PreviewSessionStore {
  try {
    // Dynamic import ou require seguro para evitar quebrar fora do runtime OpenNext
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const opennext = require('@opennextjs/cloudflare');
    if (typeof opennext.getCloudflareContext === 'function') {
      const ctx = opennext.getCloudflareContext();
      if (ctx?.env?.PREVIEW_SESSION_DO) {
        return new CloudflareDurableObjectSessionStore(
          ctx.env.PREVIEW_SESSION_DO,
        );
      }
    }
  } catch {
    // Ambiente sem binding OpenNext ativo (Vitest/Node local)
  }
  return localStoreInstance;
}

/**
 * Acesso direto ao store local para injeção e assertions em testes automatizados.
 */
export function getLocalPreviewSessionStore(): InMemoryPreviewSessionStore {
  return localStoreInstance;
}

/**
 * Classe do Cloudflare Durable Object (exportada para empacotamento no Worker).
 * Roda no runtime de Workers com armazenamento persistente em SQLite/Storage do DO.
 */
export class PreviewSessionDO {
  constructor(
    private readonly state: DurableObjectStateLike,
    private readonly _env?: unknown,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === 'POST' && url.pathname === '/session/create') {
        const body = (await request.json()) as {
          session_id: string;
          issued_at: number;
          expires_at: number;
        };
        const record: PreviewSessionRecord = {
          session_id: body.session_id,
          issued_at: body.issued_at,
          expires_at: body.expires_at,
          revoked: false,
        };
        await this.state.storage.put(body.session_id, record);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET' && url.pathname === '/session/validate') {
        const sessionId = url.searchParams.get('id');
        const nowParam = Number(url.searchParams.get('now')) || Date.now();
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'id_required' }), {
            status: 400,
          });
        }
        const record = (await this.state.storage.get(sessionId)) as
          PreviewSessionRecord | undefined;
        if (!record) {
          return new Response(
            JSON.stringify({ valid: false, revoked: false, expired: false }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
        const currentSeconds = Math.floor(nowParam / 1000);
        const expired = currentSeconds >= record.expires_at;
        const revoked = record.revoked;
        const valid = !revoked && !expired;

        return new Response(
          JSON.stringify({ valid, revoked, expired, record }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (request.method === 'POST' && url.pathname === '/session/revoke') {
        const body = (await request.json()) as {
          session_id: string;
          now?: number;
        };
        const record = (await this.state.storage.get(body.session_id)) as
          PreviewSessionRecord | undefined;
        const nowSec = Math.floor((body.now || Date.now()) / 1000);
        if (!record) {
          await this.state.storage.put(body.session_id, {
            session_id: body.session_id,
            issued_at: nowSec,
            expires_at: nowSec + 1800,
            revoked: true,
            revoked_at: nowSec,
          });
        } else {
          record.revoked = true;
          record.revoked_at = nowSec;
          await this.state.storage.put(body.session_id, record);
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch {
      return new Response(JSON.stringify({ error: 'internal_error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
