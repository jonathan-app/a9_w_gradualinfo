# seo/AC-02: JSON-LD da home (WebSite e Organization)

- Run: `2026-10-17-1218-0023-seo-aprofundado`
- Revisão avaliada: árvore de trabalho no commit efêmero `e4b8631abd59a4ee5765f6bb7f61276577ad27cb` (árvore `7ccb67531a1bdc448791b74cf401d08367f42c60`)
- Ambiente: build de produção local, servidor `next start --port 3000`, Sanity desligado por env vazia.

## Como foi verificado

`curl -s http://localhost:3000/` com o HTML salvo em arquivo; blocos `application/ld+json` extraídos e parseados por script Node (`/tmp/opencode/verify-runtime.mjs`).

Cabeçalhos da página: status 200, `<title>Gradualinfo</title>`, `robots: index, follow`, canonical `http://localhost:3000`. Dois blocos JSON-LD: `WebSite` e `Organization`.

## Saída bruta (home)

```json
[
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Gradualinfo",
    "url": "http://localhost:3000/",
    "inLanguage": "pt-BR",
    "publisher": {
      "@type": "Organization",
      "name": "Gradualinfo",
      "url": "http://localhost:3000/",
      "logo": "http://localhost:3000/icon.png",
      "description": "Guias de tecnologia para estudantes de programação tomarem decisões sobre equipamentos e ferramentas."
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "http://localhost:3000/busca?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Gradualinfo",
    "url": "http://localhost:3000/",
    "logo": "http://localhost:3000/icon.png",
    "description": "Guias de tecnologia para estudantes de programação tomarem decisões sobre equipamentos e ferramentas."
  }
]
```

## Conclusão

- WebSite com `url`, `name`, `inLanguage` (pt-BR), `publisher` (Organization) e SearchAction apontando `http://localhost:3000/busca?q={search_term_string}`: presente.
- Organization com `name`, `url`, `logo` absoluto (`http://localhost:3000/icon.png`) e `description`: presente.
- Grafia canônica "Gradualinfo" nos dois blocos e no título; valores alimentados por `lib/site-config.ts`.
- O bloco `WebSite` carrega `publisher` além dos campos listados no AC, sem conflito com o contrato.
