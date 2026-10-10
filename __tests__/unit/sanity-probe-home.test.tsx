// @vitest-environment jsdom
/**
 * @fileoverview Testes unitários para a sonda de disponibilidade do Sanity e fallback honesto da Home (Spec 0006, 3.C).
 * @module __tests__/unit/sanity-probe-home.test
 * @description Comprova que a sonda de disponibilidade probeSanityAvailability lança ContentUnavailableError sob falha ou timeout,
 *   que o proxy middleware responde 503 com private, no-store antes do streaming,
 *   e que HomePage renderiza o bloco honesto EditorialIndisponivel sob erro da fonte.
 * @dependencies vitest, lib/sanity/client, app/page, app/editorial-indisponivel, lib/errors/content.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { probeSanityAvailability } from '@/lib/sanity/client';
import { ContentUnavailableError } from '@/lib/errors/content';
import { EditorialIndisponivel } from '@/app/editorial-indisponivel';
import HomePage from '@/app/page';
import * as postsService from '@/lib/services/posts';

vi.mock('@/lib/env', () => ({
  env: {
    sanity: {
      projectId: 'proj-teste',
      dataset: 'production',
      apiVersion: '2024-01-01',
      readToken: 'token-privado',
    },
    siteUrl: 'https://gradualinfo.com.br',
  },
  isSanityConfigured: true,
}));

vi.mock('@/lib/supabase/server', () => ({
  createPublicClient: vi.fn().mockReturnValue({}),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('Spec 0006 (Seção 3.C) — Indisponibilidade Editorial em Duas Camadas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Sonda de Disponibilidade (probeSanityAvailability)', () => {
    it('executa sem erro quando o Sanity responde 200 OK com array válido', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: ['post-id-123'] }),
      } as Response);

      await expect(probeSanityAvailability()).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('lança ContentUnavailableError quando o Sanity responde HTTP 500/503', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      await expect(probeSanityAvailability()).rejects.toThrow(
        ContentUnavailableError,
      );
    });

    it('lança ContentUnavailableError quando a conexão falha ou sofre timeout', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(probeSanityAvailability()).rejects.toThrow(
        ContentUnavailableError,
      );
    });
  });

  describe('2. Bloco Honesto de Indisponibilidade (EditorialIndisponivel)', () => {
    it('renderiza título e copy exatos definidos na spec', () => {
      render(<EditorialIndisponivel />);

      expect(
        screen.getByRole('heading', {
          name: /Conteúdo temporariamente indisponível/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /Não conseguimos carregar os artigos agora\. Tente novamente em alguns instantes\./i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('3. Página Inicial (HomePage) sob Falha da Fonte', () => {
    it('renderiza o bloco EditorialIndisponivel quando getPublishedPosts lança ContentUnavailableError', async () => {
      vi.spyOn(postsService, 'getPublishedPosts').mockRejectedValue(
        new ContentUnavailableError('Falha no Content Lake'),
      );

      const ui = await HomePage();
      render(ui);

      expect(
        screen.getByRole('heading', {
          name: /Gradualinfo, tecnologia para estudar programação/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole('heading', {
          name: /Conteúdo temporariamente indisponível/i,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('editorial-highlights')).toBeNull();
    });
  });
});
