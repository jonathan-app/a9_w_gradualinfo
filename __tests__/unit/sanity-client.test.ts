// @vitest-environment node
/**
 * @fileoverview Testes unitários do cliente Sanity Content Lake (spec 0006).
 * @module __tests__/unit/sanity-client.test
 * @description Comprova o mapeamento seguro de documentos do Sanity para a interface Post,
 *   a filtragem estrita de rascunhos para leitores públicos e a autorização de rascunhos
 *   apenas sob flag de preview no servidor, garantindo isolamento total de tokens.
 * @dependencies vitest, lib/sanity/client, lib/sanity/types.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapSanityDocumentToPost,
  getSanityPublishedPosts,
  getSanityPostBySlug,
  type SanityPostDocument,
} from '@/lib/sanity/client';

vi.mock('@/lib/env', () => ({
  env: {
    sanity: {
      projectId: 'proj-gradual',
      dataset: 'production',
      apiVersion: '2024-01-01',
      readToken: 'token-privado-leitura-sanity',
    },
  },
  isSanityConfigured: true,
}));

describe('Cliente Sanity Server-Side (spec 0006)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Mapeamento de Documentos Sanity para Modelo Post', () => {
    it('converte documento publicado com todos os campos mapeados', () => {
      const sanityDoc: SanityPostDocument = {
        _id: 'post-123',
        _type: 'post',
        _createdAt: '2026-10-01T10:00:00Z',
        _updatedAt: '2026-10-02T12:00:00Z',
        title: 'Artigo de Teste Sanity',
        slug: { current: 'artigo-teste-sanity' },
        excerpt: 'Resumo do artigo para listagem',
        content: '## Conteúdo completo em Markdown',
        cover_image_url:
          'https://cdn.sanity.io/images/proj/production/image.jpg',
        editoria: 'Tecnologia',
        author_name: 'Jonathan Simão',
        fontes_citadas: [
          { titulo: 'Fonte Confiável', url: 'https://fonte.com' },
        ],
        status: 'publicado',
        published_at: '2026-10-01T10:00:00Z',
      };

      const post = mapSanityDocumentToPost(sanityDoc);

      expect(post.id).toBe('post-123');
      expect(post.slug).toBe('artigo-teste-sanity');
      expect(post.title).toBe('Artigo de Teste Sanity');
      expect(post.status).toBe('publicado');
      expect(post.author_name).toBe('Jonathan Simão');
      expect(post.cover_image_url).toBe(
        'https://cdn.sanity.io/images/proj/production/image.jpg',
      );
      expect(post.fontes_citadas).toHaveLength(1);
      expect(post.fontes_citadas[0]?.titulo).toBe('Fonte Confiável');
    });

    it('identifica rascunho com prefixo drafts. e atribui status rascunho', () => {
      const draftDoc: SanityPostDocument = {
        _id: 'drafts.artigo-rascunho-123',
        _type: 'post',
        _createdAt: '2026-10-08T00:00:00Z',
        _updatedAt: '2026-10-08T01:00:00Z',
        title: 'Rascunho Editorial Privado',
        slug: { current: 'rascunho-editorial-privado' },
        content: 'Conteúdo ainda não publicado',
        status: 'rascunho',
      };

      const post = mapSanityDocumentToPost(draftDoc);

      expect(post.status).toBe('rascunho');
      expect(post.slug).toBe('rascunho-editorial-privado');
      expect(post.author_name).toBe('Redação GradualInfo'); // Fallback padrão
      expect(post.editoria).toBe('Tecnologia');
    });
  });

  describe('2. Consultas HTTP e Isolamento de Tokens', () => {
    it('executa consulta pública sem enviar token de autorização', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              {
                _id: 'pub-1',
                _type: 'post',
                title: 'Primeiro Artigo Público',
                slug: { current: 'primeiro-artigo' },
                status: 'publicado',
                publishedAt: '2026-10-05T00:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const posts = await getSanityPublishedPosts(5);

      expect(posts).toHaveLength(1);
      expect(posts[0]?.slug).toBe('primeiro-artigo');

      // Verifica chamada fetch
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const callArgs = fetchSpy.mock.calls[0]!;
      const calledUrl = new URL(callArgs[0] as string);
      const callOptions = callArgs[1] as RequestInit;

      // Confirma que a URL busca apenas publicados (excluindo drafts)
      expect(calledUrl.searchParams.get('query')).toContain(
        '!(_id in path("drafts.**"))',
      );
      // Confirma que NÃO enviou cabeçalho Authorization em consulta pública
      expect(callOptions.headers).not.toHaveProperty('Authorization');
    });

    it('inclui token de autorização apenas quando isPreview for verdadeiro', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              {
                _id: 'drafts.artigo-privado',
                _type: 'post',
                title: 'Artigo Privado em Preview',
                slug: { current: 'artigo-privado' },
                status: 'rascunho',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const post = await getSanityPostBySlug('artigo-privado', {
        isPreview: true,
      });

      expect(post).toBeDefined();
      expect(post?.status).toBe('rascunho');

      const callArgs = fetchSpy.mock.calls[0]!;
      const callOptions = callArgs[1] as RequestInit;

      // Confirma que enviou Authorization com o token seguro no servidor
      expect(callOptions.headers).toHaveProperty(
        'Authorization',
        'Bearer token-privado-leitura-sanity',
      );
    });
  });
});
