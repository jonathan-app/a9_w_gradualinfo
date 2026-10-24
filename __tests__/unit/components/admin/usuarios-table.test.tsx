/**
 * @fileoverview __tests__/unit/components/admin/usuarios-table.test.tsx — tabela de operadores
 * @module __tests__/unit/components/admin/usuarios-table
 * @description Testa `UsuariosTable` de `components/admin/usuarios-table.tsx`:
 *   conta raiz destacada, lista paginada com UUID/email/papel/data, lista vazia
 *   e controles de paginacao (usuarios/AC-2, usuarios/AC-3).
 * @dependencies @testing-library/react, @/components/admin/usuarios-table
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsuariosTable } from '@/components/admin/usuarios-table';

const operador = (
  overrides: Partial<{
    userId: string;
    email: string;
    role: string;
    assignedAt: string | null;
  }> = {},
) => ({
  userId: '00000000-0000-4000-8000-000000000002',
  email: 'ana@exemplo.dev',
  role: 'editor',
  assignedAt: '2026-10-20T10:00:00Z',
  ...overrides,
});

const meta = (
  overrides: Partial<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> = {},
) => ({
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
  ...overrides,
});

const renderTable = (props: {
  root: {
    userId: string;
    email: string;
    role: string;
    assignedAt: string | null;
    isRoot: true;
  } | null;
  operadores: ReturnType<typeof operador>[];
  meta: ReturnType<typeof meta>;
  page: number;
}) => {
  render(
    <UsuariosTable
      root={props.root}
      operadores={props.operadores}
      meta={props.meta}
      page={props.page}
    />,
  );
};

describe('UsuariosTable', () => {
  it('destaca a conta raiz separadamente com e-mail, papel e selo imutavel', () => {
    renderTable({
      root: {
        userId: '00000000-0000-4000-8000-000000000001',
        email: 'raiz@exemplo.dev',
        role: 'admin',
        assignedAt: null,
        isRoot: true,
      },
      operadores: [],
      meta: meta({ total: 0, totalPages: 1 }),
      page: 1,
    });

    expect(screen.getByText('Conta raiz')).toBeInTheDocument();
    expect(screen.getByText('raiz@exemplo.dev')).toBeInTheDocument();
    expect(screen.getByText(/Imut/)).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('lista os delegados com UUID, email, papel e data de atribuicao (usuarios/AC-3)', () => {
    renderTable({
      root: null,
      operadores: [
        operador({
          userId: '00000000-0000-4000-8000-000000000002',
          email: 'ana@exemplo.dev',
          role: 'editor',
        }),
        operador({
          userId: '00000000-0000-4000-8000-000000000003',
          email: 'bia@exemplo.dev',
          role: 'revisor',
        }),
      ],
      meta: meta({ total: 2, totalPages: 1 }),
      page: 1,
    });

    const uuids = screen.getAllByText('00000000-0000-4000-8000-000000000002');
    expect(uuids).toHaveLength(1);
    expect(screen.getByText('ana@exemplo.dev')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Revisor')).toBeInTheDocument();
    expect(screen.getAllByText(/de 2026/)).toHaveLength(2);
  });

  it('mostra mensagem de lista vazia quando nao ha operadores', () => {
    renderTable({
      root: null,
      operadores: [],
      meta: meta({ total: 0, totalPages: 1 }),
      page: 1,
    });

    expect(screen.getByText('Nenhum operador encontrado.')).toBeInTheDocument();
  });

  it('exibe total e paginacao quando ha mais de uma pagina (usuarios/AC-2)', () => {
    renderTable({
      root: null,
      operadores: [operador()],
      meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
      page: 1,
    });

    expect(screen.getByText(/Total/)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/P\u00e1gina/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // Primeira pagina: Anterior desabilitado (span), Proxima como link
    const anterior = screen.getByText('Anterior');
    expect(anterior).not.toHaveAttribute('href');
    const proxima = screen.getByText('Próxima') as HTMLAnchorElement;
    expect(proxima).toHaveAttribute(
      'href',
      '/admin-dashboard/usuarios?page=2&limit=20',
    );
  });

  it('ativa Anterior e desativa Proxima na ultima pagina', () => {
    renderTable({
      root: null,
      operadores: [operador()],
      meta: { page: 3, limit: 20, total: 45, totalPages: 3 },
      page: 3,
    });

    const anterior = screen.getByText('Anterior').closest('a')!;
    expect(anterior).toHaveAttribute(
      'href',
      '/admin-dashboard/usuarios?page=2&limit=20',
    );
    const proxima = screen.getByText('Próxima');
    expect(proxima).not.toHaveAttribute('href');
  });

  it('nao renderiza paginacao quando ha apenas uma pagina', () => {
    renderTable({
      root: null,
      operadores: [operador()],
      meta: meta({ total: 1, totalPages: 1 }),
      page: 1,
    });

    expect(screen.queryByText(/P\u00e1gina/)).not.toBeInTheDocument();
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
    expect(screen.queryByText(/Pr\u00f3xima/)).not.toBeInTheDocument();
  });
});
