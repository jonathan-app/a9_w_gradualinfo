/**
 * @fileoverview Testes da validação de URL de capa editorial.
 * @module __tests__/unit/lib/editorial-images
 * @description Comprova capas locais, origem do site, bucket público do Supabase,
 *   CDN do Sanity e o protocolo (https sempre, http só fora de
 *   produção), incluindo fallback para a capa padrão.
 * @dependencies vitest, @/lib/editorial-images, @/lib/env (mockado).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    siteUrl: 'https://gradualinfo.com.br',
    supabase: { url: 'https://xyz.supabase.co', anonKey: 'fake' },
    editorialImageBucket: 'editorial-covers',
    sanity: { projectId: 'proj-gradual', dataset: 'production' },
    isProduction: true,
  },
}));

import { approvedCoverImageUrl, coverImageUrl } from '@/lib/editorial-images';

describe('approvedCoverImageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aceita URL da origem do site em https', () => {
    expect(
      approvedCoverImageUrl('https://gradualinfo.com.br/img/capa.jpg'),
    ).toBe('https://gradualinfo.com.br/img/capa.jpg');
  });

  it('usa a capa local relativa à origem da página', () => {
    expect(approvedCoverImageUrl('/artigos/exemplo-de-artigo.jpeg')).toBe(
      '/artigos/exemplo-de-artigo.jpeg',
    );
    expect(approvedCoverImageUrl('/artigos/exemplo-de-artigo.jpg')).toBe(
      '/artigos/exemplo-de-artigo.jpg',
    );
    expect(approvedCoverImageUrl('/artigos/exemplo-de-artigo.png')).toBe(
      '/artigos/exemplo-de-artigo.png',
    );
    expect(approvedCoverImageUrl('/artigos/exemplo-de-artigo.webp')).toBe(
      '/artigos/exemplo-de-artigo.webp',
    );
    expect(coverImageUrl('/artigos/exemplo-de-artigo.jpeg')).toBe(
      'https://gradualinfo.com.br/artigos/exemplo-de-artigo.jpeg',
    );
  });

  it('rejeita caminhos relativos arbitrários e URLs protocol-relative', () => {
    expect(approvedCoverImageUrl('//evil.com/artigos/capa.jpeg')).toBeNull();
    expect(approvedCoverImageUrl('/artigos/../segredo.jpeg')).toBeNull();
  });

  it('aceita apenas imagens do projeto e dataset Sanity configurados', () => {
    expect(
      approvedCoverImageUrl(
        'https://cdn.sanity.io/images/proj-gradual/production/capa.jpg',
      ),
    ).toBe('https://cdn.sanity.io/images/proj-gradual/production/capa.jpg');
    expect(
      approvedCoverImageUrl(
        'https://cdn.sanity.io/images/outro/production/capa.jpg',
      ),
    ).toBeNull();
  });

  it('aceita URL do bucket público do Supabase em https', () => {
    expect(
      approvedCoverImageUrl(
        'https://xyz.supabase.co/storage/v1/object/public/editorial-covers/capa.png',
      ),
    ).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/editorial-covers/capa.png',
    );
  });

  it('rejeita URL de origem arbitrária', () => {
    expect(approvedCoverImageUrl('https://evil.com/img.jpg')).toBeNull();
  });

  it('rejeita URL do bucket com caminho que não começa no path público', () => {
    expect(
      approvedCoverImageUrl(
        'https://xyz.supabase.co/storage/v1/object/secret/editorial-covers/x.png',
      ),
    ).toBeNull();
  });

  it('rejeita URL do bucket com nome de bucket diferente', () => {
    expect(
      approvedCoverImageUrl(
        'https://xyz.supabase.co/storage/v1/object/public/other-bucket/x.png',
      ),
    ).toBeNull();
  });

  it('rejeita http em produção', () => {
    expect(
      approvedCoverImageUrl('http://gradualinfo.com.br/img.jpg'),
    ).toBeNull();
  });

  it('aceita http fora de produção (Supabase local)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        siteUrl: 'https://gradualinfo.com.br',
        supabase: { url: 'http://127.0.0.1:54321', anonKey: 'fake' },
        editorialImageBucket: 'editorial-covers',
        isProduction: false,
      },
    }));
    const mod = await import('@/lib/editorial-images');
    expect(
      mod.approvedCoverImageUrl(
        'http://127.0.0.1:54321/storage/v1/object/public/editorial-covers/x.png',
      ),
    ).toBe(
      'http://127.0.0.1:54321/storage/v1/object/public/editorial-covers/x.png',
    );
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        siteUrl: 'https://gradualinfo.com.br',
        supabase: { url: 'https://xyz.supabase.co', anonKey: 'fake' },
        editorialImageBucket: 'editorial-covers',
        isProduction: true,
      },
    }));
  });

  it('retorna null para string vazia', () => {
    expect(approvedCoverImageUrl('')).toBeNull();
  });

  it('retorna null para string não URL', () => {
    expect(approvedCoverImageUrl('não é uma url')).toBeNull();
  });

  it('decodifica path percent-encoded para bater com arquivos em public/', () => {
    expect(
      approvedCoverImageUrl(
        'https://gradualinfo.com.br/15.%20Como%20criar%20uma%20arquitetura.jpeg',
      ),
    ).toBe('https://gradualinfo.com.br/15. Como criar uma arquitetura.jpeg');
  });
});

describe('coverImageUrl', () => {
  it('devolve a URL aprovada quando válida', () => {
    expect(coverImageUrl('https://gradualinfo.com.br/img/capa.jpg')).toBe(
      'https://gradualinfo.com.br/img/capa.jpg',
    );
  });

  it('devolve a capa padrão quando rejeitada', () => {
    expect(coverImageUrl('https://evil.com/x.jpg')).toBe(
      'https://gradualinfo.com.br/editorial-cover.svg',
    );
  });
});
