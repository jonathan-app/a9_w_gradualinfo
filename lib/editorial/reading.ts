/**
 * lib/editorial/reading.ts — mecânica editorial sem dependências de navegador
 * @fileoverview Gera âncoras únicas de sumário e estimativa de tempo de leitura.
 * @module lib/editorial/reading
 * @description Funciona sobre a árvore Markdown já parseada: extrai títulos para o
 *   sumário com âncoras estáveis (sem repetir slugs), calcula minutos de leitura
 *   ignorando links e monta artigos relacionados por editoria.
 * @dependencies @/lib/services/posts (tipo Post), @/lib/utils/format (slugify).
 */
import type { Post } from '@/lib/services/posts';
import { slugify } from '@/lib/utils/format';
export interface ArticleHeading {
  id: string;
  text: string;
  depth: number;
}
interface MarkdownNode {
  type: string;
  depth?: number;
  value?: string;
  alt?: string;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
}

/** Estimativa aproximada de leitura, sem contar destinos de links como palavras. */
export function readingMinutes(markdown: string): number {
  const text = markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*`|>_]/g, ' ');
  return Math.max(
    1,
    Math.ceil((text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) / 220),
  );
}

/** Plugin remark: extrai o sumário da mesma árvore usada para renderizar o corpo. */
export function articleHeadings(headings: ArticleHeading[]) {
  return () => (tree: MarkdownNode) => {
    const used = new Set<string>();
    const textOf = (node: MarkdownNode): string =>
      node.value ?? node.alt ?? node.children?.map(textOf).join('') ?? '';
    const visit = (node: MarkdownNode) => {
      if (node.type === 'heading') {
        const text = textOf(node);
        const base =
          'sec-' +
          (text
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-|-$/g, '') || 'secao');
        let id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        used.add(id);
        node.data = {
          ...node.data,
          hProperties: { ...node.data?.hProperties, id },
        };
        if ((node.depth ?? 2) <= 3)
          headings.push({ id, text, depth: Math.max(2, node.depth ?? 2) });
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

/** Prioriza a mesma editoria e preserva a ordem editorial, sem repetir slugs. */
export function relatedPosts(
  post: Post,
  candidates: Post[],
  limit = 3,
): Post[] {
  const same: Post[] = [];
  const other: Post[] = [];
  const seen = new Set([post.slug]);
  const postEditoriaSlug = slugify(post.editoria);
  for (const item of candidates) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    if (slugify(item.editoria) === postEditoriaSlug) {
      same.push(item);
    } else {
      other.push(item);
    }
  }
  return [...same, ...other].slice(0, limit);
}
