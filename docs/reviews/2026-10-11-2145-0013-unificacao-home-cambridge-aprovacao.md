# Relatório de Verificação e Aprovação Final — Spec 0013 (Unificação Home Cambridge)

**Data:** 2026-10-11 21:45  
**Spec:** `docs/specs/2026-10-11-1552-0013-unificacao-home-cambridge.md`  
**Responsável:** Engenharia Agêntica (`/check` verify)  
**Decisão:** **APROVADO** (100% dos portões de qualidade satisfeitos, pendências sanadas e comprovadas)

---

## 1. Resumo Executivo

A validação final da **Spec 0013 — Unificação Home Cambridge** foi concluída com sucesso após resolução definitiva das pendências identificadas na validação parcial anterior.

As ações executadas nos bastões autorizados (`/debug`, `/develop` e `/check`) sanaram:

1. O encerramento autônomo da suíte E2E do Playwright com **exit code 0** (sem necessidade de interrupção manual nem travamento de descritores).
2. A estabilidade determinística das âncoras de editorias colidentes, imunes à inserção de novas editorias em qualquer ordem.
3. A formalização dos limites de cobertura E2E (15 testes / 1 projeto Desktop vs. emulação móvel real).
4. A confirmação de descarte seguro da fixture descartável `artigo-teste-preview.md`.
5. A integridade rigorosa (100% dos hashes conferidos) dos 8 arquivos do artigo protegidos contra alteração.

---

## 2. Resolução do Encerramento Natural do Playwright E2E (`/debug`)

### 2.1 Causa-Raiz Isolada

A análise do processo identificou duas causas simultâneas para a retenção do runner:

1. **Divergência de dependências:** `@playwright/test` estava na versão `^1.64.0` em `package.json`, mas `pnpm-workspace.yaml` fixava `playwright-core: 1.63.0`. Durante o encerramento do worker, a chamada interna a `import_bootstrap.processExit` resultava em `TypeError` silencioso não capturado, impedindo o envio do sinal de saída para o processo pai.
2. **Ciclo de vida do subprocesso Next.js:** O script `scripts/dev-editorial.mjs` invocava `spawn` com a opção `detached: true`. O harness de teste do Playwright encerrava o wrapper de shell, mas o subprocesso do Next permanecia com pipes de stdio abertos, impedindo o disparo do evento `close` no runner.

### 2.2 Correções Implementadas

- Atualizado o override em `pnpm-workspace.yaml` para `playwright-core: 1.64.0`, harmonizando o runtime com `@playwright/test: 1.64.0` e Chromium 1248.
- Removido `detached: true` de `scripts/dev-editorial.mjs`, alinhando os tratadores de sinais `SIGINT`/`SIGTERM` para encerramento gracioso em árvore de processos única.

### 2.3 Evidência Empírica

- Execução de `pnpm test:editorial`:
  - 15 testes executados e aprovados (`15 passed (1.0m)`).
  - Encerramento natural e automático com **exit code 0**.
  - Liberação imediata da porta TCP `3200`.

---

## 3. Estabilidade Determinística de Âncoras de Editorias (`/develop`)

### 3.1 Causa-Raiz e Solução

Anteriormente, colisões de slug utilizavam sufixos ordenados alfabeticamente (`#editoria`, `#editoria-2`), fazendo com que a adição de uma nova editoria com nome anterior na ordem lexicográfica deslocasse os sufixos já existentes.
Além disso, a verificação `isExactMatch` utilizava `replace(/\s+/g, '-') === baseSlug`, ignorando conectores editoriais canônicos como `&`. Categorias reais do portal (`"Performance & SEO"`) tinham `isExactMatch === false` ao colidir com variantes (`"Performance / SEO"`), perdendo o slug canônico limpo (`home-editoria-performance-seo`).

A função `buildStableEditoriaIdMap` em `lib/utils/format.ts` foi consolidada:

- Editorias cujo slug é canônico e exclusivo mantêm o slug limpo (`isExactMatch`), inclusive com conectores canônicos de ampersand normalizados (`\s*&\s*` para `-`).
- Para editorias colidentes ou variantes, é calculado um hash determinístico invariante via algoritmo FNV-1a de 32 bits (`stableHash(rawName)`).
- A adição de novas categorias colidentes preserva os IDs previamente atribuídos nos cenários avaliados, inclusive quando a categoria original estava inicialmente sozinha, com unicidade e imutabilidade comprovadas nos cenários testados.

### 3.2 Testes Unitários

- A suíte em `__tests__/unit/lib/format.test.ts` comprova as propriedades determinísticas:
  - `garante estabilidade dos IDs existentes sob inserção de nova editoria com slug colidente`: **APROVADO**.
  - `preserva ID de editoria canônica com ampersand quando estava sozinha e recebe variante colidente`: **APROVADO** (atesta que `"Performance & SEO"` mantém `home-editoria-performance-seo` e a nova variante `"Performance / SEO"` recebe `home-editoria-performance-seo-<hash>`, com unicidade estrita).
  - Total da suíte `format.test.ts`: **27/27 testes aprovados**.

---

## 4. Declaração Formal de Cobertura E2E

Para transparência de auditoria e governança:

- **Projeto único:** A suíte `playwright.editorial.config.ts` executa 15 testes (8 na Home Cambridge e 7 no fluxo do leitor e rota 404) no projeto `chromium` (Desktop Chrome).
- **Cobertura de Viewport vs. Emulação Móvel:** Os testes exercitam a matriz responsiva de larguras (320px, 390px, 768px, 1280px via `page.setViewportSize`) comprovando ausência de overflow horizontal e renderização dos layouts adaptativos em CSS. Contudo, **isto não equivale à emulação completa de dispositivos móveis** (que inclui simulação de densidade de pixels, eventos de touch e user-agent específico do mobile). A cobertura atual atesta fidelidade de layout e contratos funcionais de CSS/DOM.

---

## 5. Confirmação de Fixtures e Arquivamento

- **Fixture `artigo-teste-preview.md`:** Verificada a ausência definitiva no repositório. Tratava-se de rascunho de homologação temporário de preview sem capa associada. Nenhuma suíte de teste depende desse arquivo.
- **Arquivos Arquivados:** Confirmado via `git ls-files scratch/` que nenhum artefato preservado ou arquivado em `scratch/entregas-arquivadas/` está rastreado no controle de versão.

---

## 6. Conferência dos 8 Arquivos Preservados (Hashes SHA-256)

A integridade dos 8 arquivos estritos da entrega do artigo foi conferida byte a byte contra `scratch/entregas-arquivadas/gradualinfo-home-cambridge/preservados.json`:

| Arquivo                                  | Hash Calculado                                                     | Esperado em `preservados.json` | Status  |
| :--------------------------------------- | :----------------------------------------------------------------- | :----------------------------- | :-----: |
| `app/globals.css`                        | `7321b6c2bebc8b9b6cc16eff5e84f598842487fe415f54e43612d4a7b564b9ae` | `7321b6c2...`                  | ✓ MATCH |
| `app/layout.tsx`                         | `4c137e8eb68e5675a4642b9e5d285e80981405317de3cbda8ed7d7224c397562` | `4c137e8e...`                  | ✓ MATCH |
| `components/layout/site-header.tsx`      | `4bcc0df4c73a1af3f477c785b981768081c175c8aa49a14ac63eba6023639b6e` | `4bcc0df4...`                  | ✓ MATCH |
| `app/artigos/[slug]/page.tsx`            | `74353e2c3bc972c9a62773b3aa76f8b28208f288fe5616910899af52ccd03155` | `74353e2c...`                  | ✓ MATCH |
| `components/editorial/article-body.tsx`  | `1a83d6ff5f31b094db7ae29286466f612bd1d04235aad7474787d107d316fa2f` | `1a83d6ff...`                  | ✓ MATCH |
| `components/editorial/article-share.tsx` | `d8e7fbb4ab8ed51c641ca4b5c1961315762491aece11cbf7af41abeb8ebdb7e4` | `d8e7fbb4...`                  | ✓ MATCH |
| `components/shared/editorial-cover.tsx`  | `7885910f1ef2dec0f2c62f9cf874681e739ecf35942889f93337eb9a45b05371` | `7885910f...`                  | ✓ MATCH |
| `lib/editorial/reading.ts`               | `f62fb1c41ee27656f2bc9ad7d0ba5f8c81c3724caf58e03a0683af8ce347c586` | `f62fb1c4...`                  | ✓ MATCH |

**Resultado:** 8 de 8 arquivos com **0% de divergência** (integridade 100% mantida).

---

## 7. Quadro Consolidado dos Portões de Qualidade

Todos os gates foram executados diretamente na árvore final de trabalho:

| Portão                           | Comando               | Duração | Resultado                                      | Código de Saída |
| :------------------------------- | :-------------------- | :------ | :--------------------------------------------- | :-------------: |
| **Typecheck**                    | `pnpm typecheck`      | ~5s     | Sem erros de tipagem (`tsc --noEmit`)          |      **0**      |
| **Lint**                         | `pnpm lint`           | ~6s     | Sem violações de ESLint                        |      **0**      |
| **Formatação**                   | `pnpm format:check`   | ~3s     | Prettier 100% em conformidade                  |      **0**      |
| **Testes Unitários/Componentes** | `pnpm test:run`       | ~11.8s  | 53 arquivos de teste, 582/582 testes aprovados |      **0**      |
| **Testes E2E Editoriais**        | `pnpm test:editorial` | ~60s    | 15/15 testes aprovados, encerramento natural   |      **0**      |
| **Build de Produção Next.js**    | `pnpm build:next`     | ~10s    | Turbopack compilado e otimizado com sucesso    |      **0**      |

---

## 8. Conclusão e Próximos Passos

A **Spec 0013** está integralmente validada e **APROVADA**.

**Restrições mantidas:**

- Sem push para repositório remoto.
- Sem merge de branches.
- Sem deploy remoto.
