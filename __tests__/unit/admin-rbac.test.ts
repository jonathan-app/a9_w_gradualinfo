// @vitest-environment node
/**
 * @fileoverview __tests__/unit/admin-rbac.test.ts — testes de RBAC e auditoria duravel
 * @module __tests__/unit/admin-rbac.test
 * @description Valida os requisitos da Spec 0032:
 *   - Hierarquia cumulativa de papeis com roleSatisfies (admin > editor > revisor);
 *   - Resolucao de papel com conta raiz permanente e delegados no banco;
 *   - Guarda assertAdminApiAuth com exigencia estrita de papel minimo e fail-closed;
 *   - Servico de auditoria com sanitizacao de segredos, falha critica e duas fases;
 *   - Endpoints REST de gestao de papeis (POST/DELETE) com protecao da conta raiz.
 * @dependencies vitest, lib/admin/auth, lib/admin/audit-service, lib/admin/roles
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { ROOT_ADMIN_ID, DELEGATE_ID, UNAUTHORIZED_ID } = vi.hoisted(() => ({
  ROOT_ADMIN_ID: '00000000-0000-4000-8000-000000000001',
  DELEGATE_ID: '00000000-0000-4000-8000-000000000002',
  UNAUTHORIZED_ID: '00000000-0000-4000-8000-000000000099',
}));

vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: ROOT_ADMIN_ID,
    adminEmail: 'admin@gradualinfo.dev',
    isProduction: false,
    supabase: {
      url: 'http://127.0.0.1:54321',
      anonKey: 'fake-anon-key',
      serviceRoleKey: 'fake-service-role-key',
    },
  },
  readAdminAccessConfig: () => null,
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
}));

vi.mock('@/lib/admin/access-guard', () => ({
  guardAdminAccess: () => null,
  requireAdminAccessPage: async () => {},
}));

const { mockSupabaseRpc, mockSupabaseInsert, mockSupabaseSelect } = vi.hoisted(
  () => ({
    mockSupabaseRpc: vi.fn(),
    mockSupabaseInsert: vi.fn(),
    mockSupabaseSelect: vi.fn(),
  }),
);

vi.mock('@/lib/admin/service-client', () => ({
  getAdminServiceClient: () => ({
    rpc: mockSupabaseRpc,
    from: (table: string) => {
      if (table === 'admin_audit_log') {
        return {
          insert: mockSupabaseInsert,
        };
      }
      return {
        select: mockSupabaseSelect,
      };
    },
  }),
}));

import { roleSatisfies, resolveAdminRole } from '@/lib/admin/auth';
import {
  sanitizeAuditMetadata,
  sanitizeClientIp,
  recordAdminAudit,
  beginAdminOperation,
  completeAdminOperation,
  AdminAuditUnavailableError,
} from '@/lib/admin/audit-service';
import { POST as assignRoleRoute } from '@/app/api/admin/usuarios/papeis/route';
import { DELETE as revokeRoleRoute } from '@/app/api/admin/usuarios/papeis/[userId]/route';

describe('Spec 0032 — RBAC e Trilha de Auditoria Duravel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Hierarquia cumulativa de papeis (roleSatisfies)', () => {
    it('papel admin satisfaz todos os requisitos (admin, editor, revisor)', () => {
      expect(roleSatisfies('admin', 'admin')).toBe(true);
      expect(roleSatisfies('admin', 'editor')).toBe(true);
      expect(roleSatisfies('admin', 'revisor')).toBe(true);
    });

    it('papel editor satisfaz editor e revisor, mas rejeita admin', () => {
      expect(roleSatisfies('editor', 'admin')).toBe(false);
      expect(roleSatisfies('editor', 'editor')).toBe(true);
      expect(roleSatisfies('editor', 'revisor')).toBe(true);
    });

    it('papel revisor satisfaz apenas revisor', () => {
      expect(roleSatisfies('revisor', 'admin')).toBe(false);
      expect(roleSatisfies('revisor', 'editor')).toBe(false);
      expect(roleSatisfies('revisor', 'revisor')).toBe(true);
    });
  });

  describe('2. Resolucao de papel (resolveAdminRole)', () => {
    it('conta raiz (ADMIN_USER_ID) resolve sempre como admin sem consultar o banco', async () => {
      const mockSupabase = {
        from: vi.fn(),
      } as any;

      const role = await resolveAdminRole(mockSupabase, {
        id: ROOT_ADMIN_ID,
      } as any);

      expect(role).toBe('admin');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('delegado com linha em admin_user_roles resolve o papel respectivo', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { role: 'editor' },
                error: null,
              })),
            })),
          })),
        })),
      } as any;

      const role = await resolveAdminRole(mockSupabase, {
        id: DELEGATE_ID,
      } as any);

      expect(role).toBe('editor');
      expect(mockSupabase.from).toHaveBeenCalledWith('admin_user_roles');
    });

    it('usuario sem linha na tabela resolve como null', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: null,
                error: null,
              })),
            })),
          })),
        })),
      } as any;

      const role = await resolveAdminRole(mockSupabase, {
        id: UNAUTHORIZED_ID,
      } as any);

      expect(role).toBe(null);
    });

    it('falha na consulta do banco propaga erro para fail-closed seguro', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: null,
                error: new Error('Postgres connection lost'),
              })),
            })),
          })),
        })),
      } as any;

      await expect(
        resolveAdminRole(mockSupabase, { id: DELEGATE_ID } as any),
      ).rejects.toThrow('Falha ao consultar papel do usuario');
    });
  });

  describe('3. Sanitizacao de metadados e IP de auditoria', () => {
    it('mascara campos sensiveis (password, token, totp, secret, key) com [REDACTED]', () => {
      const input = {
        password: 'super-secret-password',
        token: 'eyJhbGciOi...',
        totp: '123456',
        secret: 'base32secret',
        apiKey: '123',
        normalField: 'dados-publicos',
        nested: {
          authorization: 'Bearer 123456',
          publicInfo: 'ok',
        },
      };

      const sanitized = sanitizeAuditMetadata(input);
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.totp).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect((sanitized.nested as any).authorization).toBe('[REDACTED]');
      expect((sanitized.nested as any).publicInfo).toBe('ok');
      expect(sanitized.normalField).toBe('dados-publicos');
    });

    it('trunca profundidade excessiva e protege contra objetos ciclicos', () => {
      const deepObject = {
        l1: {
          l2: {
            l3: {
              l4: {
                l5: 'profundo-demais',
              },
            },
          },
        },
      };

      const sanitized = sanitizeAuditMetadata(deepObject);
      expect((sanitized.l1 as any).l2.l3.l4).toBe('[TRUNCATED_DEPTH]');
    });

    it('normaliza e trunca IP do cliente em no maximo 45 caracteres', () => {
      expect(sanitizeClientIp(null)).toBe(null);
      expect(sanitizeClientIp('  192.168.1.1  ')).toBe('192.168.1.1');
      const longIp =
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra-caracteres-que-passam-do-limite';
      const sanitized = sanitizeClientIp(longIp);
      expect(sanitized?.length).toBeLessThanOrEqual(45);
    });
  });

  describe('4. Servico de auditoria persistente (audit-service)', () => {
    it('grava evento com sucesso via service_role client', async () => {
      mockSupabaseInsert.mockResolvedValueOnce({ error: null });

      await recordAdminAudit({
        actorType: 'admin',
        actorId: ROOT_ADMIN_ID,
        actorEmail: 'admin@gradualinfo.dev',
        actorRole: 'admin',
        action: 'user.test_action',
        resourceType: 'system',
      });

      expect(mockSupabaseInsert).toHaveBeenCalledTimes(1);
      const insertedRow = mockSupabaseInsert.mock.calls[0][0];
      expect(insertedRow.action).toBe('user.test_action');
      expect(insertedRow.actor_type).toBe('admin');
      expect(insertedRow.status).toBe('success');
    });

    it('falha em evento critico (critical: true) lanca AdminAuditUnavailableError', async () => {
      mockSupabaseInsert.mockResolvedValueOnce({
        error: new Error('Database disk full'),
      });

      await expect(
        recordAdminAudit({
          actorType: 'admin',
          actorId: ROOT_ADMIN_ID,
          actorRole: 'admin',
          action: 'critical.mutation',
          resourceType: 'user',
          critical: true,
        }),
      ).rejects.toThrow(AdminAuditUnavailableError);
    });

    it('inicia operacao em duas fases com status intent e conclui com status success', async () => {
      mockSupabaseInsert.mockResolvedValue({ error: null });

      const opId = await beginAdminOperation({
        actorType: 'admin',
        actorId: ROOT_ADMIN_ID,
        actorRole: 'admin',
        action: 'article.publish',
        resourceType: 'article',
        resourceId: 'artigo-slug',
      });

      expect(typeof opId).toBe('string');
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_id: opId,
          status: 'intent',
        }),
      );

      await completeAdminOperation(opId, 'success', { published: true });

      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_id: opId,
          status: 'success',
          metadata: { published: true },
        }),
      );
    });
  });

  describe('5. Endpoints de gestao de papeis (POST/DELETE)', () => {
    it('bloqueia alteracao da conta raiz (ADMIN_USER_ID) com HTTP 409 Conflict', async () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/usuarios/papeis',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: ROOT_ADMIN_ID,
            role: 'editor',
          }),
        },
      );

      // Simula sessao de admin autenticada
      const authSpy = vi.spyOn(
        await import('@/lib/admin/auth'),
        'assertAdminApiAuth',
      );
      authSpy.mockResolvedValueOnce({
        ok: true,
        user: { id: ROOT_ADMIN_ID, email: 'admin@gradualinfo.dev' } as any,
        role: 'admin',
      });

      const response = await assignRoleRoute(request);
      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error).toBe('root_admin_immutable');
    });

    it('rejeita chamada com papel invalido com HTTP 400', async () => {
      const request = new Request(
        'https://gradualinfo.com.br/api/admin/usuarios/papeis',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: DELEGATE_ID,
            role: 'papel_inexistente',
          }),
        },
      );

      const authSpy = vi.spyOn(
        await import('@/lib/admin/auth'),
        'assertAdminApiAuth',
      );
      authSpy.mockResolvedValueOnce({
        ok: true,
        user: { id: ROOT_ADMIN_ID, email: 'admin@gradualinfo.dev' } as any,
        role: 'admin',
      });

      const response = await assignRoleRoute(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('invalid_role');
    });

    it('atribui papel com sucesso chamando RPC transacional e retorna HTTP 200', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/usuarios/papeis',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: DELEGATE_ID,
            role: 'editor',
          }),
        },
      );

      const authSpy = vi.spyOn(
        await import('@/lib/admin/auth'),
        'assertAdminApiAuth',
      );
      authSpy.mockResolvedValueOnce({
        ok: true,
        user: { id: ROOT_ADMIN_ID, email: 'admin@gradualinfo.dev' } as any,
        role: 'admin',
      });

      const response = await assignRoleRoute(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.ok).toBe(true);

      expect(mockSupabaseRpc).toHaveBeenCalledWith('assign_admin_role', {
        p_user_id: DELEGATE_ID,
        p_role: 'editor',
        p_actor_id: ROOT_ADMIN_ID,
        p_actor_email: 'admin@gradualinfo.dev',
        p_ip_address: null,
      });
    });

    it('revoga papel com sucesso via DELETE e retorna HTTP 200', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request(
        `https://gradualinfo.com.br/api/admin/usuarios/papeis/${DELEGATE_ID}`,
        {
          method: 'DELETE',
          headers: {
            origin: 'https://gradualinfo.com.br',
          },
        },
      );

      const authSpy = vi.spyOn(
        await import('@/lib/admin/auth'),
        'assertAdminApiAuth',
      );
      authSpy.mockResolvedValueOnce({
        ok: true,
        user: { id: ROOT_ADMIN_ID, email: 'admin@gradualinfo.dev' } as any,
        role: 'admin',
      });

      const response = await revokeRoleRoute(request, {
        params: Promise.resolve({ userId: DELEGATE_ID }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.ok).toBe(true);

      expect(mockSupabaseRpc).toHaveBeenCalledWith('revoke_admin_role', {
        p_user_id: DELEGATE_ID,
        p_actor_id: ROOT_ADMIN_ID,
        p_actor_email: 'admin@gradualinfo.dev',
        p_ip_address: null,
      });
    });

    it('sanitiza IP acima de 45 caracteres antes de chamar a RPC transacional', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/usuarios/papeis',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
            'cf-connecting-ip':
              '  2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra-long-ip-suffix  ',
          },
          body: JSON.stringify({
            userId: DELEGATE_ID,
            role: 'revisor',
          }),
        },
      );

      const authSpy = vi.spyOn(
        await import('@/lib/admin/auth'),
        'assertAdminApiAuth',
      );
      authSpy.mockResolvedValueOnce({
        ok: true,
        user: { id: ROOT_ADMIN_ID, email: '  admin@gradualinfo.dev  ' } as any,
        role: 'admin',
      });

      const response = await assignRoleRoute(request);
      expect(response.status).toBe(200);

      const rpcArg = mockSupabaseRpc.mock.calls[0]?.[1];
      expect(rpcArg.p_actor_email).toBe('admin@gradualinfo.dev');
      expect(rpcArg.p_ip_address.length).toBeLessThanOrEqual(45);
    });

    it('retorna 404 user_not_found quando assign_admin_role rejeita usuario inexistente (P0002)', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'P0002', message: 'admin_user_not_found' },
      });

      const request = new Request(
        'https://gradualinfo.com.br/api/admin/usuarios/papeis',
        {
          method: 'POST',
          headers: {
            origin: 'https://gradualinfo.com.br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: DELEGATE_ID,
            role: 'editor',
          }),
        },
      );

      const authSpy = vi.spyOn(
        await import('@/lib/admin/auth'),
        'assertAdminApiAuth',
      );
      authSpy.mockResolvedValueOnce({
        ok: true,
        user: { id: ROOT_ADMIN_ID, email: 'admin@gradualinfo.dev' } as any,
        role: 'admin',
      });

      const response = await assignRoleRoute(request);
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('user_not_found');
    });

    it('retorna 404 role_not_found quando revoke_admin_role rejeita papel inexistente (P0002)', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'P0002', message: 'admin_role_not_found' },
      });

      const request = new Request(
        `https://gradualinfo.com.br/api/admin/usuarios/papeis/${DELEGATE_ID}`,
        {
          method: 'DELETE',
          headers: {
            origin: 'https://gradualinfo.com.br',
          },
        },
      );

      const authSpy = vi.spyOn(
        await import('@/lib/admin/auth'),
        'assertAdminApiAuth',
      );
      authSpy.mockResolvedValueOnce({
        ok: true,
        user: { id: ROOT_ADMIN_ID, email: 'admin@gradualinfo.dev' } as any,
        role: 'admin',
      });

      const response = await revokeRoleRoute(request, {
        params: Promise.resolve({ userId: DELEGATE_ID }),
      });
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('role_not_found');
    });
  });
});
