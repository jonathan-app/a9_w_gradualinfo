# seo/AC-03: JSON-LD do artigo publicado (Article e BreadcrumbList)

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`)
- Ambiente: build de produção local, servidor `next start --port 3000`, Sanity desligado por env vazia.

## Como foi verificado

`curl -s http://localhost:3000/artigos/fixture-publicado` com HTML salvo e blocos JSON-LD parseados por script Node. O slug `fixture-publicado` é o artigo publicado do seed com `published_at` `2026-10-16T14:09:01.556857+00:00` ("Mão na Massa"), confirmado no banco local via service role.

Cabeçalhos da página: status 200, `<title>Fixture publicado | Gradualinfo</title>`, canonical `http://localhost:3000/artigos/fixture-publicado`. Dois blocos: `Article` e `BreadcrumbList`.

## Saída bruta (artigo)

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Fixture publicado",
    "description": "Exemplo local",
    "url": "http://localhost:3000/artigos/fixture-publicado",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "http://localhost:3000/artigos/fixture-publicado"
    },
    "image": [
      {
        "@type": "ImageObject",
        "url": "http://localhost:3000/editorial-cover.svg",
        "width": 1200,
        "height": 630
      }
    ],
    "datePublished": "2026-10-16T14:09:01.556857+00:00",
    "dateModified": "2026-10-17T14:09:01.556857+00:00",
    "author": {
      "@type": "Person",
      "name": "Equipe GradualInfo"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Gradualinfo",
      "url": "http://localhost:3000/",
      "logo": "http://localhost:3000/icon.png",
      "description": "Guias de tecnologia para estudantes de programação tomarem decisões sobre equipamentos e ferramentas."
    },
    "inLanguage": "pt-BR"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Início",
        "item": "http://localhost:3000/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Fixture publicado",
        "item": "http://localhost:3000/artigos/fixture-publicado"
      }
    ]
  }
]
```

## Conclusão

- Article completo: `headline`, `description`, `url` canônico, `datePublished`, `dateModified`, `author` (Person), `image` com um item 1200x630, `publisher` e `mainEntityOfPage`: presentes.
- BreadcrumbList de dois itens: "Início" (`http://localhost:3000/`) e o artigo com a URL canônica, posições 1 e 2.
- Rascunho e artigo não público não emitem nada: `/artigos/fixture-rascunho`, `/artigos/fixture-agendado` e `/artigos/fixture-arquivado` responderam 404 com `robots: noindex` e zero blocos JSON-LD (detalhe bruto em `ac-09-invariantes.md`).
- Serialização segura: os blocos são renderizados pelo componente `JsonLd` (único caminho de `innerHTML` para scripts JSON-LD); o caso do título malicioso permanece dado parseável, coberto em unidade por `__tests__/unit/structured-data.test.tsx` ("JsonLd > serializa com escape e devolve o dado fiel ao parser") e em e2e por `e2e/verify-md0002-tarefa5.spec.ts` (md-0002/AC-05, AC-06, AC-09).
