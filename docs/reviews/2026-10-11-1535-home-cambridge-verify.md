# Home Cambridge — Relatório de Verificação e Qualidade

**Data/Hora:** 2026-10-11 15:35  
**Contexto:** Validação da home com composição Cambridge, integrada sobre o modo editorial local.  
**Spec de referência:** [2026-10-11-1416-home-cambridge.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/specs/2026-10-11-1416-home-cambridge.md)  
**Pacote aplicado:** `gradualinfo-home-cambridge` (backup em `/home/jonathan/Workspace/Projetos_Ativos/gradualinfo-backup-8er38nld`)

---

## 1. Critérios de Aceite Verificados

| Critério  | Descrição                                                                                                               | Status   | Evidência                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| **AC-01** | Hero com capa prioritária, título, lead, autor e data real/rascunho                                                     | **PASS** | Componente `HomeHeroFeatured`, testado em `__tests__/unit/app-home.test.tsx` e E2E Playwright.                  |
| **AC-02** | Até dois destaques com capas e até quatro últimas leituras, sem repetir o hero no topo. Omissão de colunas vazias       | **PASS** | Componente `HomeTeaserList`, testado em unitário (`omite colunas vazias quando existe apenas um artigo`).       |
| **AC-03** | Uma seção por editoria presente nos dados; até quatro cards iniciais, expansão nativa “Ver todos” se houver mais        | **PASS** | Componente `HomeSectionGrid` com tag `<details>` / `<summary>`, verificado em `app-home.test.tsx` e Playwright. |
| **AC-04** | Navegação local por âncoras para todas as seções existentes (`#home-editoria-N`)                                        | **PASS** | Navegação por âncoras testada em 30 cenários Playwright desktop e mobile (`toHaveURL(/#home-editoria-/)`).      |
| **AC-05** | Links de card levam a `/artigos/[slug]`; apenas hero contém lead                                                        | **PASS** | `PostCardEditorial` e `HomeHeroFeatured` conferidos via Vitest e Playwright click navigation.                   |
| **AC-06** | Responsividade: 1 col celular (320/390px), 2 col tablet (768px), 3 col desktop (1280px), sem overflow horizontal        | **PASS** | 16 cenários de viewport testados no Playwright com asserção `scrollWidth <= innerWidth`.                        |
| **AC-07** | Tokens e dark mode herdados. CSS Module exclusivo da home (`home-editorial.module.css`). Arquivos de artigo preservados | **PASS** | Dark mode alternado via classe `.dark` em testes Playwright. 8 arquivos protegidos conferidos por hash.         |
| **AC-08** | Consome `getPublishedPosts` com limite explícito de 60                                                                  | **PASS** | Asserção `expect(getPublishedPosts).toHaveBeenCalledWith(expect.anything(), 60)` em `app-home.test.tsx`.        |
| **AC-09** | Rascunhos mostram “Rascunho · prévia local”, sem inventar data de publicação                                            | **PASS** | Validação no `PostByline` testada em `app-home.test.tsx`.                                                       |
| **AC-10** | Estados vazio e indisponível, canonical, renderização dinâmica e tratamento de erros mantidos                           | **PASS** | `HomePage` testado para estado vazio (`ArtigosVazios`), dinâmico (`force-dynamic`) e canonical intacto.         |

---

## 2. Resultados dos Testes e Comandos

### A. TypeScript (`pnpm typecheck`)

- **Resultado:** **PASS** (exit code 0).
- **Ajuste realizado:** Exclusão de diretórios de empacotamento temporários/entregas (`gradualinfo-*/**`) em `tsconfig.json` para evitar que cópias parciais de payloads isolados colidissem com a compilação do projeto ativo.

### B. Linter (`pnpm lint`)

- **Resultado:** **PASS** (exit code 0, 0 erros, 0 avisos).
- **Ajuste realizado:** Adicionado `'gradualinfo-*/**'` aos `globalIgnores` do `eslint.config.mjs`.

### C. Testes Unitários e de Componente (`pnpm test:run`)

- **Resultado:** **PASS** (53 suítes, 570 testes aprovados, 0 falhas).
- **Ajuste realizado:** Adequação da consulta de acessibilidade do link de artigo em `__tests__/unit/app-home.test.tsx` para usar expressão regular `/Artigo Um/`, contemplando o prefixo da editoria presente no mesmo elemento âncora.

### D. Build de Produção Next.js (`pnpm build:next`)

- **Resultado:** **PASS** (exit code 0, Turbopack, 17 páginas estáticas/dinâmicas geradas com sucesso, incluindo `/` dinâmica e `/artigos/[slug]` dinâmica).

### E. Testes End-to-End Playwright (`pnpm test:editorial`)

- **Resultado:** **PASS** (30/30 testes aprovados):
  - 15 testes no projeto **Desktop Chrome**: viewports 320px, 390px, 768px, 1280px em temas claro e escuro, 6 artigos e teste de 404.
  - 15 testes no projeto **Mobile (emulação iPhone 13 via Chromium)**: viewports 320px, 390px, 768px, 1280px em temas claro e escuro, 6 artigos e teste de 404.
  - Ausência de transbordamento horizontal (`scrollWidth <= innerWidth`) validada em todos os viewports.
  - Âncoras `#home-editoria-*` e navegação para artigos validadas.

### F. Formatação (`pnpm format:check`)

- **Resultado:** 15 avisos preexistentes mantidos (relatórios históricos, resultado.json, rascunhos markdown). Os arquivos autorais novos da home Cambridge foram formatados e estão conformes com o Prettier.

---

## 3. Integridade do Artigo de Referência

O artigo de referência `/artigos/diagnosticar-erro-500-503-site` foi rigorosamente preservado:

- HTTP status 200 conferido no servidor local `pnpm dev:editorial`.
- Cabeçalhos, sumário, tempo de leitura, capa editorial, blocos de código, tabelas responsivas, fontes e outras leituras intactos.
- Hash conferido contra `preservados.json`: `app/artigos/[slug]/page.tsx`, `components/editorial/article-body.tsx`, `components/editorial/article-share.tsx`, `components/shared/editorial-cover.tsx` e `lib/editorial/reading.ts` não sofreram nenhuma alteração.

---

## 4. Estado Atual e Servidor Local

- Servidor em execução: `pnpm dev:editorial` escutando em `http://127.0.0.1:3000`.
- Home ativa: [http://127.0.0.1:3000](http://127.0.0.1:3000) (hero, destaques, últimas leituras, seções por editoria).
- Artigo de referência: [http://127.0.0.1:3000/artigos/diagnosticar-erro-500-503-site](http://127.0.0.1:3000/artigos/diagnosticar-erro-500-503-site).
- Nenhum push, deploy ou publicação remota realizado.
