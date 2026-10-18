/**
 * @fileoverview Verifica as capas da prévia editorial no caminho servido pelo site.
 * @module __tests__/unit/lib/local-editorial-covers.test
 * @description A lista local deve usar caminhos relativos que existem em public/artigos.
 * @dependencies vitest, node:fs, lib/editorial/local-posts, lib/editorial-images.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { editorialLocal: true, siteUrl: 'https://gradualinfo.com.br' },
}));

import { getLocalPosts } from '@/lib/editorial/local-posts';
import { approvedCoverImageUrl } from '@/lib/editorial-images';
import { isLocalEditorialPath } from '@/lib/editorial/local-mode';

describe('capas do catálogo local', () => {
  it('aponta os 17 artigos para arquivos da origem atual', () => {
    const posts = getLocalPosts();
    expect(posts).toHaveLength(17);
    for (const post of posts) {
      const cover = `/artigos/${post.slug}.jpeg`;
      expect(post.cover_image_url).toBe(cover);
      expect(approvedCoverImageUrl(post.cover_image_url)).toBe(cover);
      expect(existsSync(resolve('public', cover.slice(1)))).toBe(true);
      expect(isLocalEditorialPath('127.0.0.1', cover)).toBe(false);
    }
  });

  it('não trata caminhos de assets de capa como rascunhos editoriais em loopback', () => {
    const cover = '/artigos/arquitetura-conteudo-seo-clusters.jpeg';
    expect(isLocalEditorialPath('127.0.0.1', cover)).toBe(false);
    expect(isLocalEditorialPath('localhost', cover)).toBe(false);
  });
});
