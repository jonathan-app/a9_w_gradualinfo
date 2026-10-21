# Auditoria do Projeto GradualInfo

**Data:** 2026-10-21  
**Branch:** `feat/admin-fases-2-3-4-consolidado`  
**Commit HEAD:** `de30076` (test: remove teste Sanity problemático de posts)  
**Node:** v22.23.1 | **pnpm:** 12.5.1  
**Artefato gerado:** `docs/audits/2026-10-21-1400-auditoria-projeto-gradualinfo.md` (convenção 12 do AGENTS.md)

## Resumo executivo

O portão de qualidade `pnpm check:all` está 100% verde nas camadas executáveis localmente: typecheck, lint, formatação, testes unitários e scanners de segurança (gitleaks + semgrep) retornam zero apontamentos. Não há segredos expostos na árvore nem no histórico. O `pnpm install --frozen-lockfile` conclui com o lockfile válido. Não houve alteração de código, migrations, contrato de qualidade ou deploy nesta auditoria — apenas inspeção e emissão de relatório.

## Escopo da auditoria

Foi executado o portão completo definido em `AGENTS.md`:

1. `pnpm security:secrets` — gitleaks sobre histórico e árvore atual
2. `pnpm security:sast` — semgrep com regras em `security/semgrep.yml`
3. `pnpm typecheck` — `tsc --noEmit` (TypeScript 6.0.3, strict)
4. `pnpm lint` — ESLint sobre a árvore
5. `pnpm format:check` — Prettier sobre a árvore
6. `pnpm test:run` — Vitest (jsdom), suítes unitárias e de componente

O `pnpm build` (OpenNext para Cloudflare Workers) e os testes E2E (Playwright) dependem de ambiente externo (Worker publicado, Supabase local/remoto, Durable Objects, Cloudflare Access) e foram deixados como pendentes de ambiente, não como falha de código.

## Resultados detalhados

| Porta               | Comando                          | Resultado                       | Evidência                                          |
| ------------------- | -------------------------------- | ------------------------------- | -------------------------------------------------- |
| Segredos (gitleaks) | `pnpm security:secrets`          | 0 findings — histórico e árvore | saída do scanner: `Gitleaks: 0 findings redigidos` |
| SAST (semgrep)      | `pnpm security:sast`             | 0 findings ERROR                | saída do scanner: `Semgrep: 0 findings ERROR`      |
| Typecheck           | `pnpm typecheck`                 | limpo, saída 0                  | `tsc --noEmit` sem erros                           |
| Lint                | `pnpm lint`                      | limpo, saída 0                  | `eslint .` sem apontamentos                        |
| Formatação          | `pnpm format:check`              | todos os arquivos conformes     | `prettier --check .` aprovado                      |
| Testes              | `pnpm test:run`                  | 1059/1059 PASS, 101 arquivos    | Vitest v5.0.5, duração ~21s                        |
| Instalação          | `pnpm install --frozen-lockfile` | lockfile válido, 53ms           | supply-chain policies verificadas                  |

## Arquivos modificados não commitados (estado da árvore)

A árvore de trabalho tem 3 alterações pendentes, todas em documentação/spec, sem impacto de código de aplicação:

1. `docs/scope/2026-10-18-2200-racionalizacao-geral-repositorio.md` (modificado) — escopo da racionalização geral, Lote R3 in-progress
2. `docs/specs/2026-10-08-2228-INDICE.md` (modificado) — índice de specs, inclui `0034` Accepted
3. `docs/specs/2026-10-21-1128-0034-auditoria-dependencias-auxiliares.md` (novo) — spec Accepted de auditoria de dependências auxiliares

Nenhum arquivo de código de aplicação, migration, teste ou contrato de qualidade foi alterado.

## Bastão atual do repositório

Conforme `workflow/STATE.md` (linha 733, seção Bastão atual), a próxima etapa do repositório é:

> `/architect auditoria de dependencias auxiliares` — formalizando contrato mínimo para comprovar consumidores, remoção segura, lockfile reconciliado e preservação das skills; depois repetir `/check review`.

Isso corresponde ao Lote R3 da especificação `0034` (Accepted), que remove `ponytail` (pacote npm, não a skill), `@chromatic-com/storybook`, `@spotlightjs/spotlight`, `concurrently` e o script `dev:spotlight`, preservando Storybook, análise de bundle e a skill Ponytail materializada em `.agents/skills/ponytail/`.

## Recomendações

1. Executar `/architect` para a Spec 0034 e prosseguir com `/develop` do Lote R3, seguido de `/check verify` e `/check review`.
2. Apenas após o /check aprovado, autorizar commit e push dos 3 arquivos pendentes (nenhum deles é código de aplicação).
3. Não há risco de segurança imediato: gitleaks e semgrep estão zerados, e não há tokens ou segredos expostos na árvore.

## Limites da auditoria

- Não foram executados `pnpm build` (OpenNext/Cloudflare), testes E2E Playwright, `pnpm supabase:test` (pgTAP) nem Lighthouse, pois dependem de ambiente externo não disponível neste sandbox (Worker publicado, Supabase local, Durable Objects, Cloudflare Access, domínio ativo).
- Esses itens permanecem como `UNVERIFIABLE por pré-condição de ambiente`, não como defeito de código, conforme o histórico do repositório.

---

Relatório gerado em 2026-10-21. Nenhum token ou segredo foi exposto neste documento.
