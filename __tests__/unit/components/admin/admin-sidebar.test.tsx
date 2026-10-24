/**
 * @fileoverview __tests__/unit/components/admin/admin-sidebar.test.tsx — sidebar administrativa
 * @module __tests__/unit/components/admin/admin-sidebar
 * @description Testa `AdminSidebar` de `components/admin/admin-sidebar.tsx`:
 *   marca, itens de navegacao, href do item Usuarios e estado ativo (Spec 0033).
 * @dependencies @testing-library/react, mocks de next/navigation e next/link
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin-dashboard'),
  useRouter: vi.fn(() => ({})),
}));

vi.mock('next/link', () => {
  const defaultLink = ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children);
  return { default: defaultLink };
});

import { usePathname } from 'next/navigation';

const linksPorHref = () => {
  const links = screen.getAllByRole('link');
  const mapa = new Map<string, string>();
  for (const link of links) {
    mapa.set(link.getAttribute('href') ?? '', link.textContent ?? '');
  }
  return mapa;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePathname).mockReturnValue('/admin-dashboard');
});

const renderSidebar = (pathname: string) => {
  vi.mocked(usePathname).mockReturnValue(pathname);
  render(<AdminSidebar sanityStudioUrl="https://gradualinfo.sanity.studio" />);
};

describe('AdminSidebar', () => {
  it('renderiza a marca GradualInfo e o subtitulo editorial', () => {
    renderSidebar('/admin-dashboard');

    expect(screen.getByText('Gradual')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(
      screen.getByText(/Tecnologia e consumo digital/),
    ).toBeInTheDocument();
  });

  it('renderiza os itens de navegacao principal', () => {
    renderSidebar('/admin-dashboard');

    const mapa = linksPorHref();
    const itens = [
      'Dashboard',
      'Conte\u00fado',
      'Ofertas',
      'Usu\u00e1rios',
      'Seguran\u00e7a',
      'Configura\u00e7\u00f5es',
    ];
    for (const item of itens) {
      expect([...mapa.values()].some((t) => t.includes(item))).toBe(true);
    }
  });

  it('o item Usuarios aponta para a pagina de gestao de operadores', () => {
    renderSidebar('/admin-dashboard');

    const mapa = linksPorHref();
    expect(mapa.get('/admin-dashboard/usuarios')).toContain('Usu\u00e1rios');
  });

  it('marca o item ativo conforme o caminho atual', () => {
    renderSidebar('/admin-dashboard/usuarios');

    const usuarios = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === '/admin-dashboard/usuarios');
    expect(usuarios).toBeDefined();
    expect(
      usuarios?.querySelector('[class*="bg-blue-600"]'),
    ).toBeInTheDocument();
  });

  it('nao marca nenhum item quando o caminho nao coincide', () => {
    renderSidebar('/admin-dashboard/dashboard');

    expect(
      document.querySelector('[class*="bg-blue-600"]'),
    ).not.toBeInTheDocument();
  });
});
