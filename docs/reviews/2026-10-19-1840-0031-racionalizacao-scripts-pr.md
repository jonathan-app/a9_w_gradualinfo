# Rascunho de PR: 0031. Racionalização de scripts operacionais (Lote R1) e refino do seletor de tema

- Data: 2026-10-19 18:40, America/Sao_Paulo.
- Feature: Lote R1 da racionalizacao geral (docs/scope/2026-10-18-2200-racionalizacao-geral-repositorio.md), spec docs/specs/2026-10-19-1835-0031-racionalizacao-scripts-lote-r1.md (Accepted).
- Estado da arvore: alteracoes locais validadas na branch main; envio remoto e abertura de PR dependem de autorizacao do usuario.

## Titulo

chore: racionalizacao de scripts operacionais (Lote R1) e refino do seletor de tema

## Corpo

## What

Este PR remove 719 linhas de codigo orfao ou redundante eliminando 3 scripts legados em scripts/ (client-preflight.mjs, verify-test-draft.py e verify-editorial-parity.mjs) e substitui a verificacao de paridade editorial por uma suite de testes unitarios rapida e confiavel em `__tests__/unit/editorial-parity.test.ts`. Adicionalmente, refina o componente ThemeToggle eliminando contornos cinzentos e garantindo alinhamento geometrico rigoroso da capsula e do indicador deslizante ativo. Todos os 871 testes Vitest em 86 suites passam com sucesso e o portao pnpm check:all permanece 100 por cento aprovado.

## Why

O inventario exaustivo de scripts realizado na Fase 1 identificou rotinas que nao possuiam chamadores no package.json, na CI ou nos ganchos Git, representando codigo morto e gerando manutencao desnecessaria. A verificacao de paridade de artigos Markdown locais antes executada por script procedural avulso foi promovida para suite de teste automatizada, assegurando que futuras adicoes de conteudo mantenham consistencia com o catalogo local. No componente ThemeToggle, bordas translucidas desenhadas sobre o fundo escuro criavam um anel cinza indesejado, que foi eliminado com estilizacao direta e geometricamente calibrada.

## Changes

- Remocao de scripts orfaos: exclusao de scripts/client-preflight.mjs e scripts/verify-test-draft.py, eliminando 405 linhas sem qualquer chamador ativo.
- Substituicao de script procedural por teste unitario: exclusao de scripts/verify-editorial-parity.mjs (314 linhas) e criacao da suite unitaria `__tests__/unit/editorial-parity.test.ts` (72 linhas) com validacao rigorosa dos 17 artigos Markdown locais contra lib/editorial/local-posts.json.
- Refino visual do ThemeToggle em components/shared/theme-toggle.tsx: remocao das classes de borda translucida que geravam contorno cinza, simplificacao do fundo da capsula para `bg-black/30 backdrop-blur-sm`, indicador ativo com `bg-white/25` e ajuste da largura para 88px exatos com passos deslizantes de 28px.
- Blindagem do portao de qualidade: 871 testes Vitest em 86 suites verdes, typecheck limpo, lint limpo, formatacao conferida pelo Prettier e 0 achados de seguranca em Gitleaks e Semgrep.

## How to test / verify

- Rodar `pnpm check:all` para comprovar que typecheck, lint, formatacao, testes unitarios e seguranca estatica passam com sucesso.
- Rodar `pnpm vitest run __tests__/unit/editorial-parity.test.ts` para checar a validacao de paridade editorial dos 17 artigos Markdown locais.
- Rodar `pnpm vitest run __tests__/unit/components/theme-toggle.test.tsx` para validar o comportamento do seletor de tema.
- Rodar `node scripts/check-decision.mjs check/0031-racionalizacao-scripts/results.json --spec docs/specs/2026-10-19-1835-0031-racionalizacao-scripts-lote-r1.md` para inspecionar o veredito formal APROVADO emitido pela autoridade executavel do projeto.

## Risk & rollout

- Risco nulo: os scripts excluidos nao sao consumidos por nenhuma rotina de build, deploy, CI ou hook de commit.
- O fluxo editorial de leitura local continua integralmente protegido pela nova suite de testes unitarios.

## Notes for reviewers

- Entrega vinculada a Spec 0031 Accepted com 5 criterios de aceite rigorosamente aprovados e auditados em docs/reviews/2026-10-19-1830-0031-racionalizacao-scripts.md.
