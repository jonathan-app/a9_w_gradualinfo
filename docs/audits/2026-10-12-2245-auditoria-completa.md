# Auditoria completa do projeto, 12 de outubro de 2026

## Escopo e limite

Inspeção da árvore local, configuração, arquitetura, conteúdo editorial, CI, testes e documentação. O repositório tinha 138 entradas alteradas ou não rastreadas no início. Não houve deploy, alteração no Sanity ou inspeção do ambiente de produção. O resultado descreve esta árvore, não uma revisão publicada.

## Veredito

**A árvore atual não está pronta para aprovação ou publicação.** TypeScript e validadores de skills, MCP e portabilidade passaram. O gate local completo é bloqueado por lint, formatação, escopo e testes. O código editorial e as imagens exigem conferência HTTP e visual na prévia local.

## Achados por prioridade

| Prioridade | Achado e evidência                                                                                                                                                                                                              | Ação recomendada                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Alta       | `node scripts/check-targets.mjs` termina com `Fatia S sem ponteiro de spec.`, embora a seção S tenha link para a spec 0016 aceita. Há divergência entre o formato do escopo e o parser.                                         | Corrigir o parser ou a marcação da fatia S sem perder a decisão editorial; repetir o gate.                                         |
| Alta       | `eslint .` falha em `scripts/verify-spec-0016.mjs:18`: `sixPreservedSlugs` foi declarado e não usado.                                                                                                                           | Remover a variável ou usar a lista na verificação pretendida.                                                                      |
| Alta       | `prettier --check .` falha em nove arquivos: `components/layout/site-header.tsx`, cinco rascunhos editoriais, dois relatórios de revisão e `e2e/verify-header-public.spec.ts`.                                                  | Formatar os arquivos após estabilizar as edições concorrentes.                                                                     |
| Alta       | `vitest run` iniciou com 18 falhas em `__tests__/unit/gates.test.ts`; a execução não terminou e foi interrompida.                                                                                                               | Repetir a suíte isolada, identificar a primeira causa e depois rodar `pnpm check:all`. Não concluir que os demais testes passaram. |
| Média      | `git diff --check` aponta linha em branco adicional no fim de `workflow/STATE.md:628`.                                                                                                                                          | Corrigir na próxima edição cirúrgica do STATE.                                                                                     |
| Média      | O `AGENTS.md` ainda descreve o projeto como boilerplate sem domínio, posts no Supabase e Playwright 1.63, mas `package.json` já identifica o portal GradualInfo, a leitura editorial usa Sanity e Playwright está em `^1.64.0`. | Revisar essas contradições com `/sync`; não alterei o texto curado nesta auditoria.                                                |
| Média      | `docs/workflow/governance.md`, exigido pelo contrato da skill `/audit`, não existe. A governança operacional está em `AGENTS.md`, `workflow/STATE.md` e scripts.                                                                | Decidir se o contrato da skill deve apontar para os arquivos reais ou se o documento deve ser criado.                              |
| Média      | A spec 0016 consta como aprovada em relatórios de `/check`, mas a seção S do escopo ainda marca Verify e Review como pendentes.                                                                                                 | Reconciliar o escopo com a evidência atual e com o resultado do gate de revisão.                                                   |
| Média      | As capas têm correção em código e 16 arquivos em `public/artigos/`, mas não há prova HTTP e visual da instância local usada pelo proprietário nesta auditoria.                                                                  | Fazer `/check verify` da prévia local, incluindo requisição real de uma capa e inspeção de artigo, home e busca.                   |

## Verificações executadas

| Verificação                              | Resultado                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `./node_modules/.bin/tsc --noEmit`       | Passou.                                                                               |
| `node scripts/check-skills.mjs`          | Passou.                                                                               |
| `node scripts/check-mcp-config.mjs`      | Passou.                                                                               |
| `node scripts/check-portability.mjs`     | Passou com seis avisos de proximidade do limite de tamanho das instruções.            |
| `node scripts/check-targets.mjs`         | Falhou, fatia S sem ponteiro reconhecido.                                             |
| `./node_modules/.bin/eslint .`           | Falhou, um erro.                                                                      |
| `./node_modules/.bin/prettier --check .` | Falhou, nove arquivos.                                                                |
| `git diff --check`                       | Falhou, whitespace no STATE.                                                          |
| `./node_modules/.bin/vitest run`         | 18 falhas observadas em `gates.test.ts`; execução interrompida antes do resumo final. |

Não foram executados build OpenNext, E2E, banco local, SAST, gitleaks ou verificação em produção. O grande volume de mudanças locais torna importante repetir os gates sobre uma árvore estabilizada.

## Próxima sequência

1. `/develop`: resolver o erro do gate de escopo, lint, formatação e a falha de `gates.test.ts`, preservando as alterações editoriais e de interface em andamento.
2. `/check verify`: repetir a suíte completa e comprovar imagens e navegação na prévia local.
3. `/sync`: reconciliar `AGENTS.md`, escopo e estado somente após os gates, com decisão do proprietário sobre as contradições curadas.
