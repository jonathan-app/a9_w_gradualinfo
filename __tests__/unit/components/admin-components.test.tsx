/**
 * @fileoverview Suíte de componentes da área administrativa (AdminHeader, AdminSidebar, AdminShell, AdminLoginPage).
 * @module __tests__/unit/components/admin-components
 * @description Comprova o contrato de acessibilidade, renderização semântica e segurança da interface:
 *   - AdminHeader exibe indicador AAL2, e-mail do administrador, link do portal e formulário de logout POST;
 *   - AdminSidebar fornece links válidos para dashboard, Sanity Studio e MFA com rótulos acessíveis;
 *   - AdminShell orquestra alternância do menu lateral e renderiza conteúdo;
 *   - AdminLoginPage renderiza inputs acessíveis, preserva destino sanitizado e não exibe cadastro de leitores.
 * @dependencies @testing-library/react, @testing-library/user-event, vitest,
 *   @/components/admin/admin-header, @/components/admin/admin-sidebar, @/components/admin/admin-shell,
 *   @/app/admin-dashboard/login/page.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    siteUrl: 'https://gradualinfo.com.br',
    adminUserId: '11111111-1111-4111-8111-111111111111',
    adminEmail: 'a3qua96@gmail.com',
    sanityStudioUrl: 'https://gradualinfo.sanity.studio',
    previewSecret: 'teste-segredo-preview-1234567890123456',
    previewSigningKey: 'chave-assinatura-preview-1234567890123456',
    previewUserId: '11111111-1111-4111-8111-111111111111',
    isProduction: false,
    supabase: {
      url: 'http://127.0.0.1:54321',
      anonKey: 'fake-anon-key',
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/lib/site-config', () => ({
  SITE_ORIGIN: 'https://gradualinfo.com.br',
  SITE_URL: 'https://gradualinfo.com.br/',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin-dashboard',
}));

import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminShell } from '@/components/admin/admin-shell';
import AdminLoginPage from '@/app/admin-dashboard/login/page';

describe('Componentes do Painel Administrativo (TailAdmin Adaptado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. AdminHeader', () => {
    it('renderiza indicador de sessão protegida AAL2 e e-mail do operador', () => {
      render(<AdminHeader userEmail="a3qua96@gmail.com" />);

      expect(screen.getByText('Sessão AAL2 Protegida')).toBeInTheDocument();
      expect(screen.getByText('a3qua96@gmail.com')).toBeInTheDocument();
      expect(screen.getByText('Administrador Único')).toBeInTheDocument();
    });

    it('contém link semântico de retorno para o portal público', () => {
      render(<AdminHeader userEmail="a3qua96@gmail.com" />);

      const portalLink = screen.getByRole('link', { name: 'Ver Portal' });
      expect(portalLink).toHaveAttribute('href', '/');
    });

    it('contém formulário de logout seguro com action POST', () => {
      render(<AdminHeader userEmail="a3qua96@gmail.com" />);

      const logoutButton = screen.getByRole('button', { name: 'Sair' });
      expect(logoutButton).toBeInTheDocument();

      const form = logoutButton.closest('form');
      expect(form).toHaveAttribute('action', '/api/admin/auth/logout');
      expect(form).toHaveAttribute('method', 'POST');
    });

    it('dispara onToggleSidebar quando o botão mobile é acionado', async () => {
      const onToggle = vi.fn();
      render(
        <AdminHeader
          userEmail="a3qua96@gmail.com"
          onToggleSidebar={onToggle}
        />,
      );

      const toggleButton = screen.getByRole('button', {
        name: 'Alternar menu lateral',
      });
      await userEvent.click(toggleButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. AdminSidebar', () => {
    it('renderiza navegação para visão geral e configuração de MFA', () => {
      render(<AdminSidebar isOpen={true} />);

      expect(
        screen.getByRole('link', { name: /visão geral/i }),
      ).toHaveAttribute('href', '/admin-dashboard');

      expect(
        screen.getByRole('link', { name: /configurar mfa/i }),
      ).toHaveAttribute('href', '/admin-dashboard/mfa/setup');
    });

    it('renderiza link externo seguro para o CMS Sanity Studio', () => {
      render(<AdminSidebar isOpen={true} />);

      const sanityLink = screen.getByRole('link', {
        name: /cms sanity studio/i,
      });
      expect(sanityLink).toHaveAttribute(
        'href',
        'https://gradualinfo.sanity.studio',
      );
      expect(sanityLink).toHaveAttribute('target', '_blank');
      expect(sanityLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('chama onClose ao acionar o botão de fechar a navegação', async () => {
      const onClose = vi.fn();
      render(<AdminSidebar isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByRole('button', {
        name: 'Fechar navegação',
      });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. AdminShell', () => {
    it('renderiza o conteúdo filho envelopado pela barra superior e menu lateral', () => {
      render(
        <AdminShell userEmail="a3qua96@gmail.com">
          <div data-testid="conteudo-operacional">Área Operacional Teste</div>
        </AdminShell>,
      );

      expect(screen.getByTestId('conteudo-operacional')).toBeInTheDocument();
      expect(screen.getByText('Painel Editorial')).toBeInTheDocument();
      expect(screen.getByText('Sessão AAL2 Protegida')).toBeInTheDocument();
    });
  });

  describe('4. AdminLoginPage', () => {
    it('renderiza formulário com campos acessíveis de e-mail e senha sem cadastro público', async () => {
      const page = await AdminLoginPage({
        searchParams: Promise.resolve({}),
      });
      render(page);

      expect(
        screen.getByRole('heading', { name: 'Painel Administrativo' }),
      ).toBeInTheDocument();

      const emailInput = screen.getByLabelText('E-mail Administrativo');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();

      const passwordInput = screen.getByLabelText('Senha');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toBeRequired();

      expect(
        screen.getByRole('button', { name: 'Entrar no Painel' }),
      ).toBeInTheDocument();

      // Confirma que não há link ou botão para criar conta de leitor
      expect(screen.queryByText(/criar conta/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cadastre-se/i)).not.toBeInTheDocument();
    });

    it('exibe alerta de erro acessível quando credenciais inválidas são informadas', async () => {
      const page = await AdminLoginPage({
        searchParams: Promise.resolve({ error: 'invalid_credentials' }),
      });
      render(page);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'Credenciais inválidas. Verifique seu e-mail e senha.',
      );
    });

    it('exibe alerta de rate limiting quando informado', async () => {
      const page = await AdminLoginPage({
        searchParams: Promise.resolve({ error: 'rate_limited' }),
      });
      render(page);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(
        'Muitas tentativas consecutivas. Aguarde um minuto.',
      );
    });

    it('preserva parâmetro de redirecionamento sanitizado no campo oculto', async () => {
      const page = await AdminLoginPage({
        searchParams: Promise.resolve({
          redirectTo: '/admin-dashboard/mfa/setup',
        }),
      });
      render(page);

      const hiddenInput = document.querySelector('input[name="redirectTo"]');
      expect(hiddenInput).toHaveValue('/admin-dashboard/mfa/setup');
    });

    it('neutraliza prefixos colidentes no campo oculto de redirecionamento', async () => {
      const page = await AdminLoginPage({
        searchParams: Promise.resolve({
          redirectTo: '/admin-dashboard-falso/phishing',
        }),
      });
      render(page);

      const hiddenInput = document.querySelector('input[name="redirectTo"]');
      expect(hiddenInput).toHaveValue('/admin-dashboard');
    });
  });
});
