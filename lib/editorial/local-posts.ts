/**
 * @fileoverview Conteúdo editorial de demonstração local.
 * @module lib/editorial/local-posts
 * @description Usa os Markdown do catálogo local; não altera o Sanity.
 * @dependencies local-posts.json, env, tipo Post.
 */
import staticRecords from './local-posts.json';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { env } from '@/lib/env';
import type { Post } from '@/lib/services/posts';

function getRawRecords(): typeof staticRecords {
  try {
    const jsonPath = path.resolve(
      process.cwd(),
      'lib/editorial/local-posts.json',
    );
    if (existsSync(jsonPath)) {
      return JSON.parse(readFileSync(jsonPath, 'utf8'));
    }
  } catch {
    // Fallback para importação estática se leitura em disco falhar
  }
  return staticRecords;
}

/** Entrega rascunhos apenas quando o modo local está habilitado. */
export function getLocalPosts(limit?: number): Post[] {
  if (!env.editorialLocal) return [];
  const records = getRawRecords();
  const max = limit !== undefined ? limit : records.length;
  return records.slice(0, Math.max(0, max)).map((record) => ({
    id: `local.${record.slug}`,
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    content: record.content,
    editoria: record.editoria,
    author_name: record.author,
    // A capa local deve seguir a origem da requisição, inclusive em porta de prévia diferente.
    cover_image_url: record.cover,
    fontes_citadas: record.sources,
    status: 'rascunho',
    published_at: null,
    created_at: '2026-10-11T00:00:00.000Z',
    updated_at: '2026-10-11T00:00:00.000Z',
  }));
}

/** Busca os slugs do catálogo local, sem consulta externa. */
export function getLocalPostBySlug(slug: string): Post | null {
  return getLocalPosts().find((post) => post.slug === slug) ?? null;
}
