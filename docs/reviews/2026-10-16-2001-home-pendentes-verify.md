# /check verify empírico: pendências visuais da home de 2026-10-13/14 (faixa, grade, capas e menu com busca)

**Data**: 2026-10-16 20:01 (America/Sao_Paulo)
**Spec**: nenhuma spec vigente cobre estes itens (ver finding F-01)
**Veredito**: **VERIFICADO EMPIRICAMENTE: 10/10 PASS** (gate formal `check-decision.mjs` não executado, ver F-01)

## Resumo

| Métrica      | Valor |
| ------------ | ----- |
| ACs totais   | 10    |
| PASS         | 10    |
| FAIL         | 0     |
| UNVERIFIABLE | 0     |
| BLOCKER      | 0     |
| WARNING      | 3     |

## Metadados de Avaliação

- **Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`
- **Spec de verificação**: `e2e/verify-home-pendentes.spec.ts` (SHA-256 `91be231dbc503b1475506f348de8ffe3a86dbf3254ba42d76925e184892f5f87`), bloqueada por `VERIFY_HOME_RUN=1`. Sem a variável a suíte padrão mostra 10 skipped e não é afetada.
- **Runner**: `next dev --turbopack` (Next 16.4.0) em `http://127.0.0.1:3100`, com dados do Supabase local (`127.0.0.1:54321`); Playwright 1.64 em Chromium headless, viewports 1440x900 e 375x667.
- **Comando**: `VERIFY_HOME_RUN=1 pnpm exec playwright test e2e/verify-home-pendentes.spec.ts` (10 passed, 19,0s).
- **Ressalva de produção**: produção intocada; nenhum segredo, migração ou deploy foi manipulado.

## Manifesto SHA-256 dos Arquivos Finais Testados

| Arquivo                                     | Hash SHA-256                                                       |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `app/page.tsx`                              | `87068838c893588a8705cd4ff63c8af376cea992d7f1ed1607cc63d7b2410f09` |
| `components/layout/site-header.tsx`         | `b396dce302f3116aa409e83f8de65fb452a7f8c0931e651089554454cd1ba695` |
| `components/home/home-section-grid.tsx`     | `15a7938841ff6030f1b70d3f4da8f1eac398e407f9c44bc657571c2b7b63df0c` |
| `components/home/post-card-editorial.tsx`   | `906ee8720007c5ec13654d3e635a7e4340ce949d4e25e7431020f27916307af3` |
| `components/home/home-editorial.module.css` | `fb498cd81a6c6234f9947636fd941b5eb29d4254fb5514f8f6f4d599216daf29` |
| `app/busca/page.tsx`                        | `702ac0895741cfb1a8c74b9b9fd6a1b28e6d7e32deed44a85a8fdf30e952506f` |
| `lib/utils/search-posts.ts`                 | `30fa81c782d039a324724ae1a22117ccc87420e56b2fadcd32a5479d682d90a5` |
| `e2e/verify-home-pendentes.spec.ts`         | `91be231dbc503b1475506f348de8ffe3a86dbf3254ba42d76925e184892f5f87` |

## Critérios de Aceite

Os ACs foram derivados dos bastiões de 2026-10-13/14 registrados em `workflow/STATE.md` (faixa, grade de recentes, capas e menu com busca), já que não existe spec Accepted compatível (F-01).

| AC    | Critério (resumo)                                          | Status | Evidência                                                                            |
| ----- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| AC-01 | Clique no trilho principal da faixa abre `/artigos/[slug]` | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-01-letreiro-trilho-principal.md`  |
| AC-02 | Clique no trilho duplicado também abre o artigo            | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-02-letreiro-trilho-duplicado.md`  |
| AC-03 | Grade lista até 16 artigos em ordem não crescente          | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-03-grade-ate-16-ordem.md`         |
| AC-04 | Grade com 4 colunas no desktop, sem título nem contagem    | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-04-grade-4-colunas-sem-titulo.md` |
| AC-05 | Link "Recentes" leva a `/#recentes` e rola até a seção     | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-05-ancora-recentes.md`            |
| AC-06 | Capas da home com raio de 0,9 rem (14,4 px) e recorte      | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-06-capas-raio-09rem.md`           |
| AC-07 | Busca desktop e mobile encontra resultados sem acentos     | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-07-busca-sem-acentos.md`          |
| AC-08 | Busca sem correspondência exibe estado vazio               | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-08-busca-estado-vazio.md`         |
| AC-09 | Menu público sem entrada administrativa (desktop e mobile) | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-09-sem-entrada-admin.md`          |
| AC-10 | Grade em celular com 1 coluna e sem rolagem horizontal     | PASS   | `evidence/2026-10-16-2001-home-pendentes-verify/ac-10-grade-mobile.md`               |

## Processo de Verificação

1. Primeira execução: 7/10. As três falhas eram defeitos do próprio artefato de verificação, não do aplicativo: (1) o seletor de capas casava também com `object-cover` dos `<img>` (raio 0 px); (2) no mobile o teste pegou o input oculto do header em vez do campo visível do `<main>`; (3) o clique na faixa exige pairar o mouse antes, porque o CSS pausa a animação no hover (`app/globals.css:481`) e sem isso o link nunca fica estável para o Playwright. Correções aplicadas apenas na spec, com segunda e terceira execuções limpas.
2. Execução final: 10/10 em 19,0s, com `run-log.jsonl` (SHA-256 `202d362bfb71ad2369405630945fdb94437718d64d65db3e8bfcfea271e8d48d`) e 10 screenshots com SHA-256 arquivados em `docs/reviews/evidence/2026-10-16-2001-home-pendentes-verify/`.
3. Prova de não interferência: sem `VERIFY_HOME_RUN=1` a spec reporta 10 skipped e a suíte e2e padrão segue inalterada.

## Verificação Complementar do Cabeçalho (spec anterior)

O bastão de 2026-10-12 (menu com busca) inclui teclado e tema escuro no escopo. A spec pré-existente `e2e/verify-header-public.spec.ts` foi executada contra o mesmo runner (log em `evidence/2026-10-16-2001-home-pendentes-verify/2026-10-16-2010-verify-header-public-run.log`, SHA-256 `5d3a34d0c13f17b80c5cd6ca628a73764a03fa7a0c8ac68d7c60e66db9ba2521`): 8 de 11 testes PASS, incluindo navegação por teclado, tema escuro aplicado ao `<html>`, menu móvel abrindo e fechando, âncora de Recentes e as larguras 320, 375 e 1440. As 3 falhas são expectativas defasadas do próprio spec (F-05), não regressões do aplicativo.

## Portão de Qualidade

| Gate                | Resultado                                                                |
| ------------------- | ------------------------------------------------------------------------ |
| `pnpm typecheck`    | OK                                                                       |
| `pnpm lint`         | OK                                                                       |
| `pnpm test:run`     | 765/765 testes em 75 arquivos                                            |
| `pnpm build:next`   | OK (rotas geradas, incluindo `/busca` e `/artigos/[slug]`)               |
| `pnpm format:check` | **BLOQUEADO** por `scripts/e2e-server.mjs` (F-02, arquivo de outra obra) |

## Findings

### F-01 (WARNING): gate formal não executado por ausência de contrato compatível

`scripts/check-contract.mjs` exige spec com `**Status**: Accepted`, seção `## Requirements` e itens `- **id/AC-n**` com conjunto exato de ACs. Nenhuma spec vigente cobre estes quatro itens: a spec 0010 (Accepted) está defasada (o AC-09 conflita com o header atual), a 0013 usa checklist em formato não parseável e a md-0002 (contrato padrão) está obsoleta. Recomendação: `/architect` normalizar o contrato da home caso o ritual formal de gate seja exigido; até então, este relatório documenta a verificação empírica com evidência por AC.

### F-02 (WARNING): `scripts/e2e-server.mjs` desformatado derruba o `format:check`

O arquivo está modificado na árvore de trabalho pela sessão concorrente de validação da leitura autenticada Sanity (+131/-36 linhas, mtime 19:33) e falha no Prettier, bloqueando `pnpm check:all` e o job quality da CI. Não foi tocado por esta verificação, para não colidir com a obra em andamento. Correção pontual: `pnpm exec prettier --write scripts/e2e-server.mjs`.

### F-03 (INFO): dataset local sem datas distintas

Os 6 artigos publicados no ambiente local compartilham o mesmo `published_at` (`2026-10-11T07:30:26+00:00`). A verificação atesta a ordem não crescente no DOM e a ordenação decrescente fica ancorada em `app/page.tsx:66-68` (sort + `slice(0, 16)`).

### F-04 (INFO): estados de UI aplicáveis

A busca cobre sucesso e vazio, com capturas. Carregamento e erro não se aplicam: a página é renderizada no servidor, sem estado de carregamento visível, e o erro de fonte não é induzível sem quebrar a infraestrutura local. A grade não tem estado vazio próprio induzível sem alterar o banco local.

### F-05 (WARNING): spec `e2e/verify-header-public.spec.ts` desatualizado (3 de 11)

- "marca e links em tablet-768": o teste abre o menu `<details>` em 768 px, mas o painel desktop já aparece nessa largura (o corte é `md`), deixando o `<details>` em `display:none`; o clique espera o elemento visível e expira.
- "a marca é um link de degraus, não texto plano": espera 3 `span` de `brandMark`, a marca antiga substituída pelo logo oficial em 2026-10-15.
- "a faixa abaixo do menu exibe mensagem de boas-vindas e letreiro de artigos": clica no link da faixa animada sem pairar antes; a animação nunca fica estável para o Playwright (mesma causa coberta em AC-01/AC-02, onde o hover resolve).
- Correção de teste recomendada (não aplicada nesta verificação, pertence a `/test` ou a um follow-up do header): ajustar o corte para `md`, trocar a asserção da marca para o logo e adicionar o hover antes do clique. Enquanto isso, `pnpm test:e2e` fica vermelho nesses 3 testes.

## Veredito

**VERIFICADO EMPIRICAMENTE: 10/10 PASS.** Os quatro itens pendentes dos bastiões de 2026-10-13/14 (faixa com trilho duplicado, grade de recentes, capas arredondadas e menu com busca) têm prova observável em navegador real, com screenshots e log com hash. O gate formal `check-decision.mjs` não foi executado pela ausência de contrato (F-01), e este relatório não substitui o ritual formal caso o projeto o exija. `scripts/e2e-server.mjs` (F-02) precisa de formatação antes de qualquer commit que rode `pnpm check:all`, e a spec antiga do cabeçalho (F-05) precisa de atualização antes de `pnpm test:e2e` voltar a ficar verde.
