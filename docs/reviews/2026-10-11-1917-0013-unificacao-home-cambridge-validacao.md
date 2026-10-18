# Relatório de Verificação: Spec 0013 — Unificação Home Cambridge

**Data/Hora:** 2026-10-11 19:17  
**Spec:** `docs/specs/2026-10-11-1552-0013-unificacao-home-cambridge.md`  
**Estado:** **VALIDAÇÃO PARCIAL (PENDÊNCIAS EXPLÍCITAS)** — Spec 0013 NÃO APROVADA

---

## 1. Sumário Executivo

A implementação da unificação da Home Cambridge sobre o modo editorial local avançou com conformidade nos portões estáticos, testes unitários e integridade de arquivos protegidos. Contudo, em estrito cumprimento às diretrizes de governança e revisão imparcial, o estado permanece como **validação parcial com pendências explícitas**, não sustentando aprovação definitiva da spec 0013 nesta rodada.

---

## 2. Pendências e Pontos em Aberto

### 2.1. Playwright: Término Natural do Processo e Código de Saída

- **Situação:** Nos testes E2E executados contra o servidor de desenvolvimento loopback (`pnpm test:editorial`), todos os 15 testes foram executados e passaram com asserções válidas (8 cenários em `home-cambridge.spec.ts` cobrindo 320px, 390px, 768px e 1280px em temas claro/escuro, e 7 cenários em `reading.spec.ts`).
- **Pendência:** O ciclo de encerramento do processo do test runner reteve descritores/processo filho (`next dev`/worker) antes do desmonte final pelo harness de background, exigindo interrupção de processo. Conforme diretriz de governança, o código de saída **0** não é considerado comprovado de forma autônoma até que o desmonte ocorra com encerramento 100% natural do comando no ambiente de execução.

### 2.2. Cobertura de Projetos E2E (15 vs 30 testes)

- **Situação:** O relatório preliminar anterior mencionava 30 testes em dois projetos (Desktop + Mobile emulado).
- **Esclarecimento:** A configuração ativa de [`playwright.editorial.config.ts`](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/playwright.editorial.config.ts) define estritamente um único projeto (`chromium` Desktop Chrome), executando os 15 testes existentes no diretório `e2e/editorial-local` (8 testes de responsividade/âncoras da home + 7 testes de leitura/404). A spec 0013 previa a manutenção de configuração confiável em `chromium`. Fica formalmente registrado que a contagem atual é de 15 testes em 1 projeto, e não 30 testes.
- **Ressalva de Cobertura:** Testar viewports estreitos (320px/390px via `page.setViewportSize`) valida quebras visuais e overflow de CSS, mas **não equivale à emulação mobile completa** (user-agent, touch events, device scale factor e características de viewport de dispositivo móvel presentes na emulação anterior). Esta diferença de cobertura permanece explicitada como pendência de alinhamento.

### 2.3. Âncoras: Comportamento de Sufixos Numéricos sob Inserção de Slugs Colidentes

- **Situação:** A função `buildStableEditoriaIdMap` em `lib/utils/format.ts` é determinística, imune à reordenação da lista de posts e resolve colisões via sufixo numérico por ordenação alfabética.
- **Evidência Empírica Adicionada:** Foi adicionado o teste unitário em `__tests__/unit/lib/format.test.ts` comprovando a suscetibilidade a deslocamento: se uma nova editoria colidente for introduzida e anteceder alfabeticamente uma editoria colidente preexistente (ex: inserção de `Tech B!` entre `Tech B` e `Tech B?`), o sufixo numérico das editorias subsequentes sofre deslocamento (`-2` torna-se `-3`). Recomenda-se registrar este comportamento como limitação conhecida da abordagem puramente léxica sem persistência de mapeamento.

---

## 3. Resultados dos Portões de Qualidade na Árvore Final

Após as correções pontuais em `scripts/sync-editorial.mjs` (suporte a aspas simples no scalar de frontmatter), `scripts/dev-editorial.mjs` (tratamento de término de processo) e acréscimo de teste em `__tests__/unit/lib/format.test.ts`, todos os portões afetados foram reexecutados na árvore final:

| Portão               | Comando             | Código de Saída | Resultado                                                 |
| :------------------- | :------------------ | :-------------: | :-------------------------------------------------------- |
| **Typecheck**        | `pnpm typecheck`    |      **0**      | Sucesso (`tsc --noEmit` sem erros)                        |
| **Lint**             | `pnpm lint`         |      **0**      | Sucesso (`eslint .` sem erros ou avisos)                  |
| **Formatação**       | `pnpm format:check` |      **0**      | Sucesso (`All matched files use Prettier code style!`)    |
| **Testes Unitários** | `pnpm test:run`     |      **0**      | Sucesso (**53 suítes, 580 testes PASS**)                  |
| **Build Next**       | `pnpm build:next`   |      **0**      | Sucesso (Turbopack, 17 rotas estáticas/dinâmicas geradas) |

---

## 4. Preservação dos Arquivos Protegidos

Comparação estrita dos hashes SHA-256 calculados byte a byte contra os valores de referência em [`scratch/entregas-arquivadas/gradualinfo-home-cambridge/preservados.json`](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/scratch/entregas-arquivadas/gradualinfo-home-cambridge/preservados.json):

```text
✓ app/globals.css                   (7321b6c2bebc8b9b6cc16eff5e84f598842487fe415f54e43612d4a7b564b9ae)
✓ app/layout.tsx                    (4c137e8eb68e5675a4642b9e5d285e80981405317de3cbda8ed7d7224c397562)
✓ components/layout/site-header.tsx (4bcc0df4c73a1af3f477c785b981768081c175c8aa49a14ac63eba6023639b6e)
✓ app/artigos/[slug]/page.tsx       (74353e2c3bc972c9a62773b3aa76f8b28208f288fe5616910899af52ccd03155)
✓ components/editorial/article-body.tsx (1a83d6ff5f31b094db7ae29286466f612bd1d04235aad7474787d107d316fa2f)
✓ components/editorial/article-share.tsx (d8e7fbb4ab8ed51c641ca4b5c1961315762491aece11cbf7af41abeb8ebdb7e4)
✓ components/shared/editorial-cover.tsx (7885910f1ef2dec0f2c62f9cf874681e739ecf35942889f93337eb9a45b05371)
✓ lib/editorial/reading.ts          (f62fb1c41ee27656f2bc9ad7d0ba5f8c81c3724caf58e03a0683af8ce347c586)
Resultado: 8/8 arquivos protegidos rigorosamente idênticos (0 alterações).
```

---

## 5. Rastreamento e Arquivamento

- Execução de `git ls-files scratch/ gradualinfo-home-cambridge/` confirmou retorno vazio.
- O diretório `scratch/` permanece devidamente ignorado no `.gitignore` e nenhum artefato empacotado temporário está no índice do Git.
- O arquivo ad-hoc `docs/rascunhos-editoriais/artigo-teste-preview.md` que causava quebra na validação de capas do catálogo foi removido, restaurando o conjunto canônico exato dos 6 artigos de rascunho. Foi confirmado que se tratava de uma fixture transitória descartável de staging: nenhum teste da suíte Vitest ou Playwright dependia deste arquivo localmente (a suíte de leitura referencia estritamente `local-posts.json` derivado dos 6 rascunhos com capas em `public/`).

---

## 6. Conclusão e Estado do Bastão

- **Classificação:** Implementação concluída; validação parcial; pendências declaradas.
- **Aprovação da spec 0013:** **PENDENTE** (bloqueada até resolução autônoma do encerramento de processos E2E e decisão arquitetural sobre a limitação de âncoras colidentes).
