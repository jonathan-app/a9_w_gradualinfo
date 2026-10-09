// @vitest-environment node
/**
 * @fileoverview Testes unitários do cliente Sanity Content Lake (spec 0006).
 * @module __tests__/unit/sanity-client.test
 * @description Comprova o mapeamento seguro de documentos do Sanity para a interface Post,
 *   a filtragem estrita de rascunhos e posts agendados para leitores públicos,
 *   a liberação autorizada de rascunhos e agendados sob flag de preview no servidor,
 *   o isolamento total de tokens e a distinção estrita entre 404 e erros de infraestrutura.
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

describe('Cliente Sanity Server-Side (spec 0006 - Leitura Editorial)', () => {
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

  describe('2. Listagem Pública e Corte Temporal', () => {
    it('executa consulta pública sem enviar token de autorização e aplica filtro temporal', async () => {
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

      // Confirma exclusão de drafts e corte por status/data
      const query = calledUrl.searchParams.get('query') ?? '';
      expect(query).toContain('!(_id in path("drafts.**"))');
      expect(query).toContain('publishedAt <= $now');
      expect(query).toContain('status == "publicado"');

      // Confirma que NÃO enviou cabeçalho Authorization em consulta pública
      expect(callOptions.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('3. Artigos por Slug: Rascunhos, Agendados e Preview', () => {
    it('consulta pública por slug inclui filtros de publicação e data passada', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              {
                _id: 'pub-slug-1',
                _type: 'post',
                title: 'Post Público',
                slug: { current: 'post-publico' },
                status: 'publicado',
                publishedAt: '2026-10-01T00:00:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const post = await getSanityPostBySlug('post-publico', {
        isPreview: false,
      });

      expect(post).not.toBeNull();
      expect(post?.slug).toBe('post-publico');

      const calledUrl = new URL(fetchSpy.mock.calls[0]![0] as string);
      const query = calledUrl.searchParams.get('query') ?? '';
      expect(query).toContain('!(_id in path("drafts.**"))');
      expect(query).toContain('publishedAt <= $now');

      const headers = fetchSpy.mock.calls[0]![1]?.headers;
      expect(headers).not.toHaveProperty('Authorization');
    });

    it('retorna null quando artigo não é encontrado na consulta pública', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const post = await getSanityPostBySlug('slug-inexistente', {
        isPreview: false,
      });
      expect(post).toBeNull();
    });

    it('em preview inclui token de autorização e permite acesso a rascunho', async () => {
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

      // Confirma ordenação priorizando versão rascunho
      const calledUrl = new URL(callArgs[0] as string);
      const query = calledUrl.searchParams.get('query') ?? '';
      expect(query).toContain('order(_id match "drafts.*" desc)[0]');
    });

    it('em preview permite visualizar artigo agendado com data futura', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              {
                _id: 'artigo-agendado-1',
                _type: 'post',
                title: 'Artigo do Futuro',
                slug: { current: 'artigo-futuro' },
                status: 'publicado',
                publishedAt: futureDate,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const post = await getSanityPostBySlug('artigo-futuro', {
        isPreview: true,
      });

      expect(post).not.toBeNull();
      expect(post?.published_at).toBe(futureDate);
    });
  });

  describe('4. Distinção de Erros de Infraestrutura vs 404', () => {
    it('propaga exceção com status HTTP quando o Sanity responde erro 500/503 (não mascara como 404)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        }),
      );

      await expect(
        getSanityPostBySlug('qualquer-slug', { isPreview: false }),
      ).rejects.toThrow('Falha na consulta ao Sanity (HTTP 503)');
    });

    it('propaga erro de rede ou DNS quando o fetch falha', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new Error('Network error / connection refused'),
      );

      await expect(getSanityPublishedPosts(10)).rejects.toThrow(
        'Network error / connection refused',
      );
    });
  });
});
