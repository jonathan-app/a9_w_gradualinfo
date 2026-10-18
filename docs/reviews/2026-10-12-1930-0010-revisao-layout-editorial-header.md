# 2026-10-12-1930-0010-revisao-layout-editorial-header

> Gerado pelo `/check verify` + `/check review` da spec
> `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md` (Accepted).
> Decisão: `scripts/check-decision.mjs` → **REPROVADO** (exit 1).

## Veredito

| Item         | Valor     |
| ------------ | --------- |
| ACs          | 10        |
| PASS         | 9         |
| FAIL         | 0         |
| UNVERIFIABLE | 1 (AC-08) |
| BLOCKER      | 1         |
| WARNING      | 1         |

A reprovação não é do header: é do **bloqueio editorial independente** que a
própria spec arquiva em `## Context` (linha 17) — a home sob falha da fonte
retorna 200 com interface de 404. A spec diz textualmente que isso impede
declarar AC-08 aprovado até resolução independente. O gate só faz o que o
contrato manda: UNVERIFIABLE reprova.

## Verify — por AC

| AC                       | Status           | Evidência                 | O que foi conferido                                                                                                                                                                                                                         |
| ------------------------ | ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout-editorial/AC-01` | PASS             | `ac01-home-capa.png`      | Capa é o índice 0; cada artigo aparece uma única vez; links reais para `/artigos/{slug}`.                                                                                                                                                   |
| `layout-editorial/AC-02` | PASS             | `ac02-home-1440.png`      | Desktop amplo com capa, dois destaque e lista de recentes; título da capa dominante; sem conteúdo fixo de demonstração (`Lorem ipsum` ausente).                                                                                             |
| `layout-editorial/AC-03` | PASS             | `ac01-home-capa.png`      | H1 institucional único (`h1` count = 1); sem duplicatas.                                                                                                                                                                                    |
| `layout-editorial/AC-04` | PASS             | `evidence-manifest.json`  | Screenshot em 320, 375, 768 e 1440 px; nenhuma rolagem horizontal; ordem mobile (capa, secundários, recentes).                                                                                                                              |
| `layout-editorial/AC-05` | PASS             | `ac05-artigo-detalhe.png` | Artigo exibe navegação (`Voltar ao início`), h1, capa (`img[src]` termina em `.jpeg`) e seção `Fontes`. Corpo com largura máxima e tipografia conforme DESIGN.md.                                                                           |
| `layout-editorial/AC-06` | PASS             | `ac05-artigo-detalhe.png` | Capa com `alt=""` (decorativa), proporção reservada, URL aprovada pelo resolvedor.                                                                                                                                                          |
| `layout-editorial/AC-07` | PASS             | `header-1440.png`         | Foco visível, um link principal por card, um h1 por página, landmarks (`banner`, `navigation`, `main`), tema claro/escuro preservando contraste.                                                                                            |
| `layout-editorial/AC-08` | **UNVERIFIABLE** | `ac05-artigo-detalhe.png` | Slugs, canonical, OG, JSON-LD, sitemap e políticas de cache estão conformes _quando a fonte está saudável_. A spec condiciona este AC à resolução do bloqueio da home, que ainda não ocorreu.                                               |
| `layout-editorial/AC-09` | PASS             | `header-1440.png`         | Cabeçalho mantém marca (símbolo em degraus), Início, Editorias, área administrativa em `/admin-dashboard/login` sem `prefetch` e seletor de tema. Nenhum controle aponta para destino inexistente — `/busca` existe (`app/busca/page.tsx`). |
| `layout-editorial/AC-10` | PASS             | `evidence-manifest.json`  | Typecheck, lint, formatação e testes passam; provas visuais e de navegação em 320/375/768/1440 px e artigo com título longo e corpo extenso.                                                                                                |

## Review — achados classificados

### BLOCKER

- **AC-08 UNVERIFIABLE.** A spec declara em `## Context` que a falha da
  home (200 com interface de 404 sob falha da fonte) impede aprovar este AC
  até resolução independente. O bloqueio editorial registrado na rodada de
  20:29 permanece. Nenhum PASS aqui-through seria honesto.

### WARNING

- **Hydration mismatch em `<body>`.** O attributes
  `cz-shortcut-listen="true"` é injetado no `<body>` por uma extensão do
  navegador no ambiente de teste (não em produção). O código em
  `app/layout.tsx:81` não tem responsabilidade por isso. A extensão é
  desligada em ambientes de CI limpos; em produção o app não sofre o
  mismatch.

### INFO

- **Busca no header.** O header atual inclui `form action="/busca"` e um link
  `/busca`. A rota `app/busca/page.tsx` existe, portanto o AC-09 (nenhum
  controle aponta para destino inexistente) é cumprido. O texto da spec não
  menciona o campo de busca, mas a restrição que ele impõe é atendida.

## Próximos passos

1. Resolver o bloqueio editorial da home (fora do escopo deste relatório).
2. Re-executar `/check verify` da spec 0010 para que AC-08 possa ser marcado
   PASS.
3. `/sync` para manter `AGENTS.md`, `STATE.md` e o escopo alinhados.

## Evidências

- `docs/reviews/evidence/2026-10-12-1830-0010-header-verify/`
  - `header-320.png`, `header-375.png`, `header-768.png`, `header-1440.png`
  - `ac01-home-capa.png`, `ac02-home-1440.png`, `ac05-artigo-detalhe.png`
  - `artigo-longo.png`
  - `evidence-manifest.json`, `evidence-manifest3.json`
