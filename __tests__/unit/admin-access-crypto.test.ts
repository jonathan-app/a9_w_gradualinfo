// @vitest-environment node
/**
 * @fileoverview Validação criptográfica real da admissão Cloudflare Access no Worker.
 * @module __tests__/unit/admin-access-crypto.test
 * @description Comprova admin-auth/AC-01 e admin-auth/AC-02 com chaves RSA reais e JWKS:
 *   - Validação de assinatura RS256 autêntica;
 *   - Rejeição de chave desconhecida (kid ausente do JWKS);
 *   - Rejeição de assinatura forjada por par de chaves divergente;
 *   - Rejeição de token expirado;
 *   - Rejeição de audiência incorreta;
 *   - Rejeição de emissor incorreto;
 *   - Rejeição de e-mail divergente do proprietário;
 *   - Sanitização de cabeçalhos e cookies Access antes do dispatch;
 *   - Passagem direta para rotas públicas e bloqueio 400 para caminhos ambíguos.
 * @dependencies vitest, jose, lib/admin/access-worker, lib/admin/access.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  type JWK,
  type KeyLike,
} from 'jose';
import { dispatchWithAdminAccess } from '@/lib/admin/access-worker';

describe('Admissão Criptográfica Real do Access via Worker (AC-01 e AC-02)', () => {
  const ISSUER = 'https://test-team.cloudflareaccess.com';
  const AUDIENCE = 'test-audience-tag-spec0018-ac01-ac02';
  const OWNER_EMAIL = 'admin@gradualinfo.dev';
  const HOSTS = 'admin.example.test,gradualinfo.com.br';
  const KEY_ID = 'test-rsa-key-valid-01';

  let validPrivateKey: KeyLike;
  let validPublicKeyJwk: JWK;

  let attackerPrivateKey: KeyLike;
  let attackerPublicKeyJwk: JWK;

  const bindings = Object.freeze({
    ADMIN_ACCESS_ISSUER: ISSUER,
    ADMIN_ACCESS_AUD: AUDIENCE,
    ADMIN_ACCESS_OWNER_EMAIL: OWNER_EMAIL,
    ADMIN_ACCESS_HOSTS: HOSTS,
  });

  beforeAll(async () => {
    // 1. Gera par de chaves RSA legítimo do JWKS de teste
    const validPair = await generateKeyPair('RS256');
    validPrivateKey = validPair.privateKey;
    const exportedValid = await exportJWK(validPair.publicKey);
    validPublicKeyJwk = {
      ...exportedValid,
      kid: KEY_ID,
      alg: 'RS256',
      use: 'sig',
    };

    // 2. Gera par de chaves de atacante (não presente no JWKS)
    const attackerPair = await generateKeyPair('RS256');
    attackerPrivateKey = attackerPair.privateKey;
    const exportedAttacker = await exportJWK(attackerPair.publicKey);
    attackerPublicKeyJwk = {
      ...exportedAttacker,
      kid: 'attacker-key-99',
      alg: 'RS256',
      use: 'sig',
    };
  });

  /**
   * Helper para forjar tokens JWT reais assinados criptograficamente.
   */
  async function signTestToken(opts?: {
    privateKey?: KeyLike;
    kid?: string;
    issuer?: string;
    audience?: string;
    email?: string;
    sub?: string;
    type?: string;
    expOffset?: number; // em segundos a partir de agora
    iatOffset?: number; // em segundos a partir de agora
  }) {
    const key = opts?.privateKey ?? validPrivateKey;
    const now = Math.floor(Date.now() / 1000);
    const iat = now + (opts?.iatOffset ?? 0);
    const exp = now + (opts?.expOffset ?? 900); // 15 minutos de validade por padrão

    return new SignJWT({
      email: opts?.email ?? OWNER_EMAIL,
      type: opts?.type ?? 'app',
      sub: opts?.sub ?? 'admin-user-subject-uuid',
      iat,
      exp,
    })
      .setProtectedHeader({ alg: 'RS256', kid: opts?.kid ?? KEY_ID })
      .setIssuer(opts?.issuer ?? ISSUER)
      .setAudience(opts?.audience ?? AUDIENCE)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(key);
  }

  /**
   * Mock do fetch do endpoint JWKS da Cloudflare Access (/cdn-cgi/access/certs).
   */
  function mockJwksEndpoint(keys: JWK[] = [validPublicKeyJwk], status = 200) {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === `${ISSUER}/cdn-cgi/access/certs`) {
        if (status !== 200) {
          return new Response('Erro no serviço de certificados', {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ keys }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });
  }

  it('permite acesso administrativo e anexa contexto após validação criptográfica bem-sucedida', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    const token = await signTestToken();

    let capturedScopedEnv: Record<string, unknown> | undefined;
    let capturedForwardedRequest: Request | undefined;

    const dispatch = vi.fn(
      async (req: Request, scoped: Record<string, unknown>) => {
        capturedForwardedRequest = req;
        capturedScopedEnv = scoped;
        return new Response('OK Dashboard', { status: 200 });
      },
    );

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': token,
        'cf-access-authenticated-user-email': OWNER_EMAIL,
        cookie:
          'CF_Authorization=edge-token; CF_Binding=edge-binding; session=app-user',
      },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK Dashboard');
    expect(dispatch).toHaveBeenCalledTimes(1);

    // Valida que o contexto foi gerado com sucesso
    const context = capturedScopedEnv?.ADMIN_ACCESS_REQUEST_CONTEXT as {
      allowed: boolean;
      authority: string;
      pathname: string;
      method: string;
      version: number;
    };
    expect(context).toBeDefined();
    expect(context.allowed).toBe(true);
    expect(context.authority).toBe('admin.example.test');
    expect(context.pathname).toBe('/admin-dashboard');
    expect(context.method).toBe('GET');
    expect(context.version).toBe(1);

    // Valida sanitização de cabeçalhos e cookies Access
    expect(
      capturedForwardedRequest?.headers.has('cf-access-jwt-assertion'),
    ).toBe(false);
    expect(
      capturedForwardedRequest?.headers.has(
        'cf-access-authenticated-user-email',
      ),
    ).toBe(false);
    expect(capturedForwardedRequest?.headers.get('cookie')).toBe(
      'session=app-user',
    );
  });

  it('rejeita com 403 requisição sem token de asserção JWT', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: { host: 'admin.example.test' },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejeita com 403 token com assinatura forjada (chave desconhecida fora do JWKS)', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    // Token assinado pela chave do atacante com kid desconhecido
    const forgedToken = await signTestToken({
      privateKey: attackerPrivateKey,
      kid: attackerPublicKeyJwk.kid,
    });
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': forgedToken,
      },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejeita com 403 token com assinatura forjada reutilizando o kid legítimo', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    // Token assinado pela chave privada do atacante mas alegando o kid da chave legítima
    const forgedToken = await signTestToken({
      privateKey: attackerPrivateKey,
      kid: KEY_ID,
    });
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': forgedToken,
      },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejeita com 403 token expirado', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    // Expirado há 60 segundos
    const expiredToken = await signTestToken({
      expOffset: -60,
      iatOffset: -300,
    });
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': expiredToken,
      },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejeita com 403 token com audiência incorreta', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    const wrongAudToken = await signTestToken({
      audience: 'audience-de-outra-aplicacao-zero-trust',
    });
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': wrongAudToken,
      },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejeita com 403 token com emissor divergente', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    const wrongIssToken = await signTestToken({
      issuer: 'https://outro-tenant.cloudflareaccess.com',
    });
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': wrongIssToken,
      },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejeita com 403 token contendo e-mail de outro usuário', async () => {
    mockJwksEndpoint([validPublicKeyJwk]);
    const otherEmailToken = await signTestToken({
      email: 'invasor@externo.com',
    });
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': otherEmailToken,
      },
    });

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('retorna 503 fail-closed caso o endpoint JWKS esteja indisponível', async () => {
    const uncachedIssuer = 'https://unreachable.cloudflareaccess.com';
    const uncachedBindings = Object.freeze({
      ...bindings,
      ADMIN_ACCESS_ISSUER: uncachedIssuer,
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === `${uncachedIssuer}/cdn-cgi/access/certs`) {
        return new Response('Serviço indisponível', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });
    const token = await signTestToken({ issuer: uncachedIssuer });
    const dispatch = vi.fn();

    const request = new Request('https://admin.example.test/admin-dashboard', {
      method: 'GET',
      headers: {
        host: 'admin.example.test',
        'cf-access-jwt-assertion': token,
      },
    });

    const response = await dispatchWithAdminAccess(
      request,
      uncachedBindings,
      dispatch,
    );

    expect(response.status).toBe(503);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('bloqueia com 400 caminho administrativo ambíguo sem invocar admissão nem dispatch', async () => {
    const dispatch = vi.fn();

    const request = new Request(
      'https://admin.example.test/%61dmin-dashboard',
      {
        method: 'GET',
        headers: { host: 'admin.example.test' },
      },
    );

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(400);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('permite rota pública sem exigir asserção Access e remove cabeçalhos sensíveis', async () => {
    const dispatch = vi.fn(async (req: Request) => {
      expect(req.headers.has('cf-access-jwt-assertion')).toBe(false);
      expect(req.headers.has('cf-access-authenticated-user-email')).toBe(false);
      return new Response('Artigo Público', { status: 200 });
    });

    const request = new Request(
      'https://gradualinfo.com.br/artigos/meu-artigo',
      {
        method: 'GET',
        headers: {
          host: 'gradualinfo.com.br',
          'cf-access-jwt-assertion': 'jwt-forjado',
          'cf-access-authenticated-user-email': 'alguem@teste.com',
        },
      },
    );

    const response = await dispatchWithAdminAccess(request, bindings, dispatch);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Artigo Público');
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
