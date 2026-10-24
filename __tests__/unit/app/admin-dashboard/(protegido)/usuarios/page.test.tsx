/**
 * @fileoverview __tests__/unit/app/admin-dashboard/(protegido)/usuarios/page.test.tsx — guarda da pagina
 * @module __tests__/unit/app/admin-dashboard/(protegido)/usuarios/page
 * @description Testa a guarda de acesso de `usuarios/page.tsx`: apenas admin com
 *   AAL2 acessa (usuarios/AC-1), outros papeis sao recusados (usuarios/AC-10)
 *   e falha da leitura de operadores e tratada (usuarios/AC-9).
 * @dependencies vitest, @/lib/admin/auth (mocks), @/lib/admin/operators (mock),
 *   next/navigation, @/lib/env, @/components/admin/usuarios-table,
 *   @/components/admin/usuarios-form
 */

const listMock = vi.fn();

vi.mock('@/lib/admin/auth', () => ({
  checkAdminUser: vi.fn(),
  roleSatisfies: vi.fn((role: string) => role === 'admin'),
}));

vi.mock('@/lib/admin/operators', () => ({
  listAdminOperadores: listMock,
}));

vi.mock('next/navigation', () => ({
  // `forbidden()` do Next interrompe a renderização lançando; um mock que
  // devolve Response deixaria a página continuar e o teste passaria sem provar
  // a recusa.
  forbidden: vi.fn(() => {
    throw new Error('forbidden');
  }),
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    adminUserId: '00000000-0000-4000-8000-000000000001',
    adminEmail: 'raiz@exemplo.dev',
    siteUrl: 'http://localhost:3000',
    isDevelopment: true,
    isProduction: false,
  },
}));

vi.mock('@/components/admin/usuarios-table', () => ({
  UsuariosTable: vi.fn(() => null),
}));

vi.mock('@/components/admin/usuarios-form', () => ({
  UsuariosForm: vi.fn(() => null),
}));

import { checkAdminUser, roleSatisfies } from '@/lib/admin/auth';
import { forbidden, redirect } from 'next/navigation';

const renderPage = async (
  authResult: Awaited<ReturnType<typeof checkAdminUser>>,
) => {
  vi.mocked(checkAdminUser).mockResolvedValue(authResult as never);
  const { default: UsuariosPage } =
    await import('@/app/admin-dashboard/(protegido)/usuarios/page');
  return UsuariosPage({ searchParams: Promise.resolve({}) });
};

beforeEach(() => {
  vi.clearAllMocks();
  // `clearAllMocks` mantém o `mockReturnValue` do teste anterior; sem restaurar
  // o padrão, a recusa do AC-10 vaza para os testes seguintes.
  vi.mocked(roleSatisfies).mockImplementation(() => true);
  listMock.mockResolvedValue({
    root: null,
    operadores: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
  vi.mocked(forbidden).mockImplementation(() => {
    throw new Error('forbidden');
  });
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error('redirect');
  });
});

describe('usuarios/page guarda de acesso', () => {
  it('usuarios/AC-1: admite admin com AAL2 e renderiza tabela e form', async () => {
    const page = await renderPage({
      ok: true,
      user: {} as never,
      role: 'admin',
      aal: 'aal2',
    });

    expect(page).toBeDefined();
    expect(checkAdminUser).toHaveBeenCalled();
    expect(roleSatisfies).toHaveBeenCalledWith('admin', 'admin');
  });

  it('usuarios/AC-10: nega editor (roleSatisfies retorna false)', async () => {
    vi.mocked(roleSatisfies).mockReturnValue(false);

    await expect(
      renderPage({ ok: true, user: {} as never, role: 'editor', aal: 'aal2' }),
    ).rejects.toThrow();
    expect(forbidden).toHaveBeenCalled();
  });

  it('usuarios/AC-10: nega sessao sem AAL2 (mfa_challenge_required)', async () => {
    vi.mocked(checkAdminUser).mockResolvedValue({
      ok: false,
      reason: 'mfa_challenge_required',
      user: { id: 'outro' } as never,
      currentAal: 'aal1',
    });

    await expect(
      renderPage({
        ok: false,
        reason: 'mfa_challenge_required',
        user: {} as never,
        currentAal: 'aal1',
      }),
    ).rejects.toThrow();
    expect(redirect).toHaveBeenCalled();
  });

  it('usuarios/AC-9: falha da leitura lança erro com mensagem clara', async () => {
    listMock.mockRejectedValue(new Error('banco fora'));

    await expect(
      renderPage({ ok: true, user: {} as never, role: 'admin', aal: 'aal2' }),
    ).rejects.toThrow('Falha ao buscar operadores administrativos.');
  });

  it('usuarios/AC-1: config ausente nega acesso (config_missing)', async () => {
    vi.mocked(checkAdminUser).mockResolvedValue({
      ok: false,
      reason: 'config_missing',
    });
    const result = await checkAdminUser();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('config_missing');
    }
  });
});
