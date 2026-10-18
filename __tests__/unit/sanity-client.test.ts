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
import { approvedCoverImageUrl } from '@/lib/editorial-images';

vi.mock('@/lib/env', () => ({
  env: {
    siteUrl: 'https://gradualinfo.com.br',
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
    it('mapeia a capa numerada antiga para o arquivo público do slug', () => {
      const doc = {
        _id: 'post-legado',
        _type: 'artigo' as const,
        _createdAt: '2026-10-01T10:00:00Z',
        _updatedAt: '2026-10-02T12:00:00Z',
        title: 'Artigo legado',
        slug: { current: 'site-lento-mesmo-com-boa-nota-pagespeed' },
        cover_image_url:
          '/1. Seu site é lento mesmo com uma boa nota no PageSpeed? O que os testes não mostram.jpeg',
      };
      const mapped = mapSanityDocumentToPost(doc);
      expect(mapped.cover_image_url).toBe(
        '/artigos/site-lento-mesmo-com-boa-nota-pagespeed.jpeg',
      );
      expect(approvedCoverImageUrl(mapped.cover_image_url)).toBe(
        '/artigos/site-lento-mesmo-com-boa-nota-pagespeed.jpeg',
      );
      expect(
        mapSanityDocumentToPost({
          ...doc,
          cover_image_url: `https://gradualinfo.com.br${doc.cover_image_url}`,
        }).cover_image_url,
      ).toBe('/artigos/site-lento-mesmo-com-boa-nota-pagespeed.jpeg');
    });

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

    it('usa slug em texto puro, corpo em body e campos no padrão camelCase', () => {
      const camelDoc: SanityPostDocument = {
        _id: 'post-camel-1',
        _type: 'artigo',
        _createdAt: '2026-10-01T10:00:00Z',
        _updatedAt: '2026-10-02T12:00:00Z',
        title: 'Artigo no padrão camelCase',
        slug: 'artigo-camel',
        body: '## Corpo em Markdown',
        coverImage: {
          asset: {
            url: 'https://cdn.sanity.io/images/proj/production/capa.jpg',
          },
        },
        author: { name: 'Autor A' },
        fontesCitadas: [{ titulo: 'Fonte', url: 'https://fonte.com' }],
        publishedAt: '2026-10-01T10:00:00Z',
        status: 'publicado',
      };

      const post = mapSanityDocumentToPost(camelDoc);

      expect(post.slug).toBe('artigo-camel');
      expect(post.content).toBe('## Corpo em Markdown');
      expect(post.cover_image_url).toBe(
        'https://cdn.sanity.io/images/proj/production/capa.jpg',
      );
      expect(post.author_name).toBe('Autor A');
      expect(post.fontes_citadas[0]?.titulo).toBe('Fonte');
      expect(post.published_at).toBe('2026-10-01T10:00:00Z');
    });

    it('usa o id como slug quando o slug não vem definido e cobre título ausente', () => {
      const noSlugDoc: SanityPostDocument = {
        _id: 'drafts.post-sem-slug',
        _type: 'post',
        _createdAt: '2026-10-03T00:00:00Z',
        _updatedAt: '2026-10-03T00:00:00Z',
        status: 'rascunho',
      };

      const withoutTitle: SanityPostDocument = {
        _id: 'post-sem-titulo',
        _type: 'post',
        _createdAt: '2026-10-03T00:00:00Z',
        _updatedAt: '2026-10-03T00:00:00Z',
        slug: { current: 'post-sem-titulo' },
        status: 'publicado',
      };

      const draftPost = mapSanityDocumentToPost(noSlugDoc);
      const titlePost = mapSanityDocumentToPost(withoutTitle);

      expect(draftPost.slug).toBe('post-sem-slug');
      expect(draftPost.status).toBe('rascunho');
      expect(titlePost.slug).toBe('post-sem-titulo');
      expect(titlePost.title).toBe('Sem título');
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
      // Home page usa revalidação de 60s; leitura pública sem cache intermediário
      expect(callOptions.next).toEqual({ revalidate: 60 });
    });

    it('inclui o limite padrão e o parâmetro $now no corpo da consulta pública', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const posts = await getSanityPublishedPosts();

      expect(posts).toEqual([]);

      const calledUrl = new URL(fetchSpy.mock.calls[0]![0] as string);
      const query = calledUrl.searchParams.get('query') ?? '';

      expect(query).toContain('[0...10]');
      const nowParam = calledUrl.searchParams.get('$now');
      expect(nowParam).toBeDefined();
      const parsedNow = JSON.parse(nowParam ?? '') as string;
      expect(parsedNow).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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

    it('não envia o corte temporal $now na consulta de preview', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const post = await getSanityPostBySlug('post-agendado', {
        isPreview: true,
      });

      expect(post).toBeNull();

      const calledUrl = new URL(fetchSpy.mock.calls[0]![0] as string);
      const query = calledUrl.searchParams.get('query') ?? '';
      const nowParam = calledUrl.searchParams.get('$now');

      // Preview não aplica corte temporal: posts agendados permanecem visíveis
      expect(query).not.toContain('publishedAt <= $now');
      expect(nowParam).toBeNull();
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
