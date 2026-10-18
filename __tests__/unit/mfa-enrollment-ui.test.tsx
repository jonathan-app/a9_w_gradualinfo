/**
 * @fileoverview Proteção da matrícula TOTP na folha de navegador.
 * @module __tests__/unit/mfa-enrollment-ui
 * @description Cobre ação explícita, limpeza do DOM e resposta tardia após navegação.
 * @dependencies Vitest, Testing Library e components/admin/mfa-enrollment.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MfaEnrollment } from '@/components/admin/mfa-enrollment';

const fixture = {
  ok: true,
  factorId: 'fixture-factor',
  secret: 'fixture-code',
  uri: 'fixture-uri',
  qrCode: '<svg></svg>',
};
afterEach(() => vi.unstubAllGlobals());

it('não consulta matrícula ao renderizar e pede POST somente no clique', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => fixture });
  vi.stubGlobal('fetch', fetch);
  render(<MfaEnrollment redirectTo="/admin-dashboard" />);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Iniciar configuração TOTP' }),
  );
  expect(await screen.findByText('fixture-code')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    '/api/admin/auth/mfa/enroll',
    expect.objectContaining({ method: 'POST', body: '{}', cache: 'no-store' }),
  );
  expect(
    screen
      .getByAltText('QR para configurar o autenticador')
      .getAttribute('src'),
  ).toMatch(/^data:image\/svg\+xml/);
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(screen.queryByText('fixture-code')).not.toBeInTheDocument();
  expect(
    screen.queryByAltText('QR para configurar o autenticador'),
  ).not.toBeInTheDocument();
});

it('resposta depois de pagehide não reapresenta o segredo', async () => {
  let resolve: (value: unknown) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    ),
  );
  render(<MfaEnrollment redirectTo="/admin-dashboard" />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Iniciar configuração TOTP' }),
  );
  act(() => window.dispatchEvent(new Event('pagehide')));
  await act(async () => resolve({ ok: true, json: async () => fixture }));
  expect(screen.queryByText('fixture-code')).not.toBeInTheDocument();
});

it('confirmação limpa segredo preservando factorId para o POST nativo', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => fixture }),
  );
  render(<MfaEnrollment redirectTo="/admin-dashboard" />);
  await act(async () =>
    fireEvent.click(
      screen.getByRole('button', { name: 'Iniciar configuração TOTP' }),
    ),
  );
  const form = screen
    .getByRole('button', { name: 'Confirmar e ativar MFA' })
    .closest('form')!;
  fireEvent.submit(form);
  expect(screen.queryByText('fixture-code')).not.toBeInTheDocument();
  expect(new FormData(form).get('factorId')).toBe('fixture-factor');
});

it.each(['popstate', 'logout', 'hidden'])(
  'limpa dados em %s',
  async (event) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => fixture }),
    );
    const { container } = render(
      <MfaEnrollment redirectTo="/admin-dashboard" />,
    );
    await act(async () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Iniciar configuração TOTP' }),
      ),
    );
    if (event === 'logout') {
      const form = document.createElement('form');
      form.action = '/api/admin/auth/logout';
      container.appendChild(form);
      fireEvent.submit(form);
    } else if (event === 'hidden') {
      const visibility = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('hidden');
      act(() => document.dispatchEvent(new Event('visibilitychange')));
      visibility.mockRestore();
    } else act(() => window.dispatchEvent(new Event('popstate')));
    expect(screen.queryByText('fixture-code')).not.toBeInTheDocument();
    expect(
      screen.queryByAltText('QR para configurar o autenticador'),
    ).not.toBeInTheDocument();
  },
);
