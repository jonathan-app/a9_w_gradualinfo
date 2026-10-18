---
title: 'SEO no Next.js 16: metadados, indexação e erros que passam despercebidos'
slug: 'seo-nextjs-16-metadata-indexacao'
editoria: 'Desenvolvimento Web'
excerpt: 'A API de Metadados do Next.js 16 simplifica Open Graph e canonicals, mas introduz armadilhas silenciosas em streaming e layouts aninhados. Aprenda a configurar metadados estáticos e dinâmicos, sitemaps e robots sem falhas de indexação.'
cover_image: '/artigos/seo-nextjs-16-metadata-indexacao.jpeg'
author: 'Redação GradualInfo'
published_at: null
status: 'rascunho'
fontes_citadas:
  - titulo: 'Next.js App Router: Metadata Files and API Reference'
    url: 'https://nextjs.org/docs/app/api-reference/functions/generate-metadata'
  - titulo: 'Next.js App Router: not-found.js and Streaming Behavior'
    url: 'https://nextjs.org/docs/app/api-reference/file-conventions/not-found'
  - titulo: 'Open Graph Protocol Specification'
    url: 'https://ogp.me/'
  - titulo: 'Google Search Central: Robots.txt and Canonical URLs'
    url: 'https://developers.google.com/search/docs/crawling-indexing/canonicalization'
---

# SEO no Next.js 16: metadados, indexação e erros que passam despercebidos

O Next.js 16 consolidou o App Router como padrão definitivo de arquitetura para aplicações React modernas. Para desenvolvedores e arquitetos que buscam autoridade orgânica, o framework oferece ferramentas nativas poderosas para SEO técnico — mas também introduz armadilhas sutis de renderização, streaming e metadados que podem comprometer a visibilidade do projeto se não forem dominadas.

Neste guia, exploramos os padrões oficiais da API de Metadados, a geração de sitemaps programáticos e os principais erros que afetam a indexação no Next.js 16.

---

## 1. A API de Metadados: Estática vs Dinâmica

No App Router, a antiga tag `<Head>` do Pages Router foi inteiramente substituída pelo objeto tipado `Metadata` ou pela função assíncrona `generateMetadata`.

### Metadados Estáticos (`layout.tsx` ou `page.tsx`)

Para páginas cujo conteúdo não varia por parâmetro de URL (como a página inicial ou páginas institucionais), exporta-se uma constante `metadata`:

```typescript
import type { Metadata } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: 'Gradualinfo — Tecnologia para Estudar Programação',
    template: '%s | Gradualinfo',
  },
  description:
    'Guias e análises técnicas para desenvolvedores e estudantes tomarem decisões informadas.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Gradualinfo',
    description: 'Guias e análises técnicas para desenvolvedores e estudantes.',
    url: SITE_ORIGIN,
    siteName: 'Gradualinfo',
    locale: 'pt_BR',
    type: 'website',
  },
};
```

### Metadados Dinâmicos (`generateMetadata`)

Para rotas dinâmicas, como páginas de artigos (`app/artigos/[slug]/page.tsx`), os metadados precisam ser computados com base nos dados reais do artigo:

```typescript
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/services/posts';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Artigo não encontrado',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/artigos/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.published_at || undefined,
      authors: [post.author_name],
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : [],
    },
  };
}
```

---

## 2. Geração Programática de `sitemap.xml` e `robots.txt`

Em vez de manter arquivos XML estáticos desatualizados, o Next.js 16 permite gerar o mapa do site e as diretivas de robôs dinamicamente na raiz da pasta `app/`.

### `app/sitemap.ts`

```typescript
import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';
import { getSanityPublishedPosts } from '@/lib/sanity/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSanityPublishedPosts(100);

  const postsEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_ORIGIN}/artigos/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: SITE_ORIGIN,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...postsEntries,
  ];
}
```

---

## 3. Os 3 Erros Invisíveis Mais Frequentes no Next.js 16

### Erro 1: Captura de Exceção que vira "Soft 404" e a Armadilha do Streaming

Quando um artigo não existe no banco, capturar o erro em um bloco `try/catch` que apenas renderiza uma mensagem textual dentro do JSX faz o Next.js responder **HTTP 200 OK**, gerando um _Soft 404_ prejudicial ao SEO.

A correção recomendada é invocar explicitamente a função `notFound()` do pacote `next/navigation`. Porém, é crucial entender a mecânica da convenção `not-found.js` sob streaming:

- **Antes do início do streaming**: Se `notFound()` for disparado antes do envio dos primeiros cabeçalhos HTTP (por exemplo, na resolução inicial de dados do Server Component), o Next.js emite o código de status **HTTP 404 Not Found** real e injeta `<meta name="robots" content="noindex" />`.
- **Após o início do streaming**: Se a chamada a `notFound()` ocorrer dentro de um componente assíncrono envelopado por `<Suspense>` ou após o fluxo de chunks HTTP ter sido iniciado, os cabeçalhos de resposta já podem ter sido enviados. Quando o streaming já iniciou, o status HTTP **não pode ser alterado para 404** (os cabeçalhos foram enviados com 200). Nesse cenário, o componente `not-found.js` é renderizado no corpo da resposta e o Next.js injeta a tag `<meta name="robots" content="noindex" />` para prevenir a indexação, ainda que o código de status permaneça HTTP 200. Esse é o comportamento esperado em respostas em streaming.

_Regra prática para SEO técnico_: Em páginas onde a emissão do status HTTP 404 estrito for mandatória para o Googlebot, resolva a existência do recurso no nível raiz do segmento da rota antes de abrir limites de streaming concorrentes.

### Erro 2: Falta de `metadataBase`

Se você define imagens em OpenGraph com caminhos relativos (ex: `/capa.jpg`) sem configurar a propriedade `metadataBase`, o Next.js emite alertas em build time e não consegue gerar as tags `og:image` com URLs absolutas válidas, quebrando pré-visualizações no WhatsApp, Twitter e LinkedIn.

### Erro 3: Uso excessivo de `'use client'` em componentes estruturais

Colocar `'use client'` no topo de uma página ou em um componente de layout converte toda a subárvore em um componente cliente. Embora o SSR inicial ainda ocorra na maioria dos casos, dados dinâmicos buscados via `useEffect` no cliente não estarão no HTML estático do primeiro pacote TCP recebido pelos bots de rastreamento. Mantenha as páginas como **Server Components** por padrão.
