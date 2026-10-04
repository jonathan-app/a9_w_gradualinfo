# workflow/STATE.md — fila de delegação

> Este arquivo é a **memória de passagem de bastão** entre agentes. O contexto
> do projeto (stack, convenções, o que já foi resolvido) está em `AGENTS.md`.
> O que construir está em `docs/scope/`. Aqui mora só uma coisa: **quem faz o
> quê, e o que está na fila agora**.

## Como usar

1. Toda tarefa que muda ou decide algo acrescenta **uma linha** no histórico.
2. A linha do **histórico** é registro. Quem manda no próximo passo é a seção
   **Bastão atual**: ela é a fonte canônica, e o bloco de delegação da
   resposta não a substitui.
3. Ao terminar, feche a resposta com o bloco de delegação descrito em
   `AGENTS.md`.
4. Sem trabalho legítimo sobrando, marque `encerrado` — não invente fila para
   "continuar".
5. Tarefa que só lê, inspeciona ou pergunta não acrescenta linha nem delega.

Concorrência: releia o arquivo imediatamente antes de escrever e use append de
linha. O slot de próxima delegação é a seção **Bastão atual**; reescrever o
arquivo inteiro perde o handoff de quem estiver escrevendo ao mesmo tempo.

## Bastão atual

**Renomeação do projeto**: encerrado.** Substituídas todas as referências de "Aqua9" para "Gradualinfo" e o dev responsável para "Jonathan Simão" nos arquivos de configuração, testes e código-fonte. Próxima etapa desta tarefa: nenhuma. As pendências anteriores do produto e das branches seguem abaixo.

**Aberto.** A base do boilerplate existe e está verificada; falta decidir o que
o produto faz.

- **Onde está:** `AGENTS.md` (contexto), `README.md` (uso), este arquivo (fila).
- **Provedor do dado:** `docs/scope/` criado vazio. O `/scope` está travado
  esperando decisão humana, não esperando agente: a pergunta é **qual é o
  produto — o que ele faz, para quem, e qual é a primeira fatia?** Sem essa
  resposta o `/scope` não tem o que escrever.
- **Bloqueio conhecido:** o build e a CI rodam sem `.env` porque `lib/env.ts`
  tem padrão local. A autenticação só funciona depois de `.env.local` e
  `pnpm supabase:start`.
- **Limite do gate:** `workflow/STATE.md` está no `.prettierignore`. A fila é
  append-only por regra, e o realinhamento de tabela do Prettier fazia cada
  linha nova reprovar o `format:check`.
- **Fila paralela (independe do `/scope`):** 10 branches de trabalho prontas,
  mapeadas em `BRANCHES.md` com a ordem de merge. Cada uma é 1 PR com `/check`
  antes do merge, e a branch `audit/mcp-sdd-skills-comentarios-check` entra por
  último (branch 10, adiciona os docs que as outras consomem). Merge exige ação
  humana no GitHub.

## Histórico

| #   | Data       | Habilidade                               | Artefato principal                                                                                                                 | Estado    |
| --- | ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 01  | 2026-10-04 | bootstrap (fora do fluxo de skill)       | `package.json`, `next.config.ts`, `open-next.config.ts`, `app/`, `lib/`, `proxy.ts`, `.github/workflows/ci.yml`, `.agents/skills/` | concluído |
| 02  | 2026-10-04 | protocolo de delegação                   | `AGENTS.md`, `workflow/STATE.md`                                                                                                   | em curso  |
| 03  | 2026-10-03 | manutenção (fora do fluxo de skill)      | `eslint.config.mjs`, `open-next.config.ts`, `components/shared/theme-toggle.tsx`                                                   | concluído |
| 04  | 2026-10-03 | /sync                                    | `AGENTS.md`, `README.md`, `workflow/STATE.md`                                                                                      | concluído |
| 05  | 2026-10-04 | teste do protocolo (delegação 1 de 2)    | `workflow/STATE.md`                                                                                                                | concluído |
| 06  | 2026-10-04 | correção do protocolo (delegação 2 de 2) | `AGENTS.md`, `workflow/STATE.md`                                                                                                   | em curso  |
| 07  | 2026-10-04 | manutenção (fora do fluxo de skill)      | `.gitattributes`, `scripts/sync-gitattributes.mjs`, `dist/.gitkeep`, `package.json`                                              | concluído |
| 08  | 2026-10-04 | manutenção (fora do fluxo de skill)      | `scripts/export-template.mjs`, `package.json` (`template:export`)                                                                 | concluído |
| 09  | 2026-10-03 | auditoria (fora do fluxo de skill)       | branch `audit/mcp-sdd-skills-comentarios-check`: `.agents/mcp.json`, `docs/MCP.md`, templates em `docs/`, `GUIA-RAPIDO-SKILLS.md`, `skills-load-config.md`, `exemplos/`, `docs/workflow/comentarios-codigo.md`, `.gitignore` (`!.agents/mcp.json`) | concluído |
| 10  | 2026-10-04 | manutenção (fora do fluxo de skill)      | `.prettierignore` (fila do STATE fora do `format:check`)                                                                            | concluído |
| 11  | 2026-10-04 | /check da auditoria (fora do fluxo de skill) | branch `audit/mcp-sdd-skills-comentarios-check`: `docs/reviews/_TEMPLATE.md` (`pnpm security:env` inexistente → `security:secrets`), `skills-load-config.md` + `GUIA-RAPIDO-SKILLS.md` (23 skills listadas que não existem no lock), `docs/MCP.md` (referência de domínio removida; devDeps do MCP fora), `package.json` (devDeps removidas e ordenadas), `pnpm-workspace.yaml` (override `playwright-core: 1.63.0`), `pnpm-lock.yaml` (ressincronizado), `prettier --write` nos 8 arquivos da branch | concluído |

| 12  | 2026-10-04 | manutenção e /sync (sem contexto a sincronizar) | `.gitignore` (ambientes, caches, relatórios de segurança, sessões Playwright e skills versionáveis), `workflow/STATE.md`; 21 caminhos validados com `git check-ignore --no-index` | encerrado |
| 13  | 2026-10-04 | manutenção (fora do fluxo de skill)             | `.gitattributes` (`/dist export-ignore` para o `pnpm template:export`)                                                                                                        | concluído |
| 14  | 2026-10-04 | manutenção (fora do fluxo de skill)             | Vários arquivos: renomeado "Aqua9" para "Gradualinfo" e o dev para "Jonathan Simão"                                                                                           | concluído |

### Evidência da linha 01

Verificado nesta máquina, com o código no estado atual:

| Comando                     | Resultado                                      |
| --------------------------- | ---------------------------------------------- |
| `pnpm check:all`            | passa (typecheck, lint, prettier, 18 testes)   |
| `pnpm build:next`           | passa; Next 16 reconhece `proxy.ts` como Proxy |
| `pnpm test:e2e`             | 5/5 no Chromium                                |
| `pnpm build`                | passa; `.open-next/worker.js` gerado           |
| `wrangler deploy --dry-run` | worker válido, 20 assets, 2 bindings           |

Cinco defeitos foram encontrados e corrigidos durante o bootstrap; estão
registrados em `AGENTS.md`, em "Onde as coisas quebram com mais frequência".
