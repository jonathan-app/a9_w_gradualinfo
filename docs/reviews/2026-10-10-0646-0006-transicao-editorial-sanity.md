# /check verify: Transição Editorial Sanity (spec 0006)

**Data**: 2026-10-10 06:46 (America/Sao_Paulo)
**Modo**: verify (bastão atual em `workflow/STATE.md`)
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`
**Sha256 da spec**: `50920860f259e08be0c87b33ffcc42aa1f43e1c0cd33cabebffe6095e9148e38`
**Commit avaliado**: `307141daa8ab8bc059cf3e6fa9893949bf0f541f`
**Árvore avaliada**: `52ded399cd2a63a648c83d3ace2a81a0f6c35af7`
**Veredito**: **REPROVADO** (exit 1, autoridade `scripts/check-decision.mjs`)

Contagem do gate: **5 PASS, 0 FAIL, 3 UNVERIFIABLE, 0 evidências ausentes, 0 BLOCKER, 2 WARNING**.

A rodada anterior, às 20:29 de 09/10, reprovou com 1 BLOCKER: a home respondia soft 200 com
skeletons presos sob falha do Content Lake. O dono decidiu, no mesmo dia, o contrato da seção 3.C
da spec (probe no proxy com 503 real mais bloco honesto dentro da página). O `/develop`
implementou; esta rodada prova que a decisão surtiu efeito na rede.

## O que mudou desde 2026-10-09 20:29

| AC           | Antes        | Agora        | Por quê                                                                                                                                                |
| ------------ | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sanity/AC-06 | **FAIL**     | **PASS**     | Sob `SANITY_DATASET` inexistente, `/` responde 503 com `private, no-store` e `noindex, nofollow` e o corpo diz "Serviço temporariamente indisponível". |
| sanity/AC-04 | UNVERIFIABLE | **PASS**     | A validação de slug roda antes da comparação do token: slugs inválidos respondem 400 sem exigir o segredo real de preview.                             |
| sanity/AC-01 | PASS         | PASS         | Mantido: probe nomeia o projeto e o dataset do Sanity na falha; sem Sanity ativo a home não cai no Supabase.                                           |
| sanity/AC-03 | PASS         | PASS         | Mantido: 0 ocorrências do valor do token no bundle cliente.                                                                                            |
| sanity/AC-07 | PASS         | PASS         | Mantido: `wrangler.jsonc` aponta para `https://gradualinfo.com.br`; 0 resíduos de `gradualinfo.pages.dev`.                                             |
| sanity/AC-02 | UNVERIFIABLE | UNVERIFIABLE | Dataset remoto continua sem artigo publicado para o anon.                                                                                              |
| sanity/AC-05 | UNVERIFIABLE | UNVERIFIABLE | `next start` local não tem binding do Durable Object.                                                                                                  |
| sanity/AC-08 | UNVERIFIABLE | UNVERIFIABLE | Ainda depende de gate 100% PASS antes da retirada do Supabase.                                                                                         |

O BLOCKER da AC-06 **não existe mais**: a falha de infraestrutura deixou de ser mascarada como
404 na home. As três ACs restantes sem PASS não são defeito de código; são precondições de
ambiente que não existem localmente.

## Como a prova foi feita

Nada foi medido por inspeção de código e assumido como comportamento. Tudo que aparece como
PASS veio de rede:

- Build de produção (`pnpm build:next`, saída em `.next`) servido por `next start` nas portas
  3102 (falha induzida) e 3103/3104/3105 (medições finais). Servidores derrubados ao final.
- Falha induzida na fonte por override de processo, sem tocar em código:
  `SANITY_DATASET=gradualinfo-dataset-inexistente-verificacao SANITY_PROJECT_ID=4iipvaar
npx next start`. O Sanity remoto responde 404 para dataset inexistente, então a indução é
  válida e o probe (`lib/sanity/client.ts:168`, timeout de 800 ms) propaga
  `ContentUnavailableError` até `unavailableResponse` (`lib/supabase/middleware.ts:30`).
- Um detalhe de diagnóstico que atrasou o começo desta rodada: testes preliminares contra a
  porta 3101 mostravam 200 na home porque o processo antigo (build sem o probe) ainda estava
  de pé e os novos `next start` falhavam com `EADDRINUSE`. O 503 só apareceu quando a porta
  foi liberada e o servidor reiniciado limpo.
- `curl` para status, cabeçalho e corpo; `rg` no bundle cliente para os hashes de token e
  resíduos de domínio.

## Resultado por AC

| AC           | Status       | Evidência                                    | O que a rede mostrou                                                                                                                                                                                                                                                                                         |
| ------------ | ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sanity/AC-01 | PASS         | `2026-10-10-0646-ac-01.log`                  | Sob falha do dataset a home responde 503 em vez de cair para o Supabase; `lib/services/posts.ts` só entra no ramo Supabase quando `isSanityActive()` é false (rollback da seção 6).                                                                                                                          |
| sanity/AC-02 | UNVERIFIABLE | `2026-10-10-0646-ac-02.log`                  | Sem artigo publicado no dataset não existe `<link rel="canonical">` nem `og:url` de artigo na rede para comparar.                                                                                                                                                                                            |
| sanity/AC-03 | PASS         | `2026-10-10-0646-ac-03.log`                  | 0 ocorrências do valor do `SANITY_API_READ_TOKEN` em `.next/static`; o literal no chunk `32ev0pvo51kjo.js` é só o shim de env do edge (`s.default.env.SANITY_API_READ_TOKEN??""`), sem valor.                                                                                                                |
| sanity/AC-04 | PASS         | `2026-10-10-0646-ac-06-e-ac-04-saudavel.log` | GET em `/api/preview` e `/api/preview/logout` responde 405 com `Allow: POST`; origem divergente responde 403 nos dois; token errado no corpo responde 401; slugs `../admin`, `https://evil.com`, `foo/bar`, `UPPER` e `a b` respondem 400. Tudo sem o segredo real, porque o slug é validado antes do token. |
| sanity/AC-05 | UNVERIFIABLE | `2026-10-10-0646-ac-05.log`                  | Sem binding do Durable Object o `next start` usa armazenamento em memória; não existe alavanca de ambiente para provar na rede o 503 com DO indisponível, o 303 condicionado à persistência da revogação nem a rejeição da cópia de cookie pós logout.                                                       |
| sanity/AC-06 | **PASS**     | `2026-10-10-0646-ac-06.log`                  | Saudável: `/` 200 com `no-store`; `/artigos/slug-que-nao-existe` 404 com `private, no-store`. Falha induzida: `/` 503 com `private, no-store` e `noindex, nofollow`, corpo "Serviço temporariamente indisponível"; `/artigos/<slug>` 503 da mesma forma.                                                     |
| sanity/AC-07 | PASS         | `2026-10-10-0646-ac-07.log`                  | `wrangler.jsonc` tem `NEXT_PUBLIC_SITE_URL: "https://gradualinfo.com.br"` e rotas no apex; 0 arquivos com `gradualinfo.pages.dev` em `.next/static` e `.open-next`; `app/artigos/[slug]/page.tsx` monta canonical com `SITE_ORIGIN`.                                                                         |
| sanity/AC-08 | UNVERIFIABLE | `2026-10-10-0646-ac-08.log`                  | A AC condiciona a retirada do Supabase a uma validação 100% PASS do Sanity; essa validação não existe e esta rodada ainda reprovou.                                                                                                                                                                          |

## Findings

**WARNING, sanity/AC-03.** Os nomes `SANITY_API_READ_TOKEN` e `SANITY_API_VERSION` aparecem no
chunk cliente `.next/static/chunks/32ev0pvo51kjo.js`, porque `lib/env.ts` monta um único objeto
de env consumido também no cliente. O valor do token não vaza, 0 ocorrências. Mesmo débito da
rodada anterior; o custo é expor ao cliente quais segredos existem.

**WARNING, sanity/AC-07.** A home não emite `<link rel="canonical">`, 0 ocorrências no HTML,
apesar de `app/layout.tsx` declarar `metadataBase`. Sitemap, `wrangler.jsonc` e resíduos estão
limpos, então a AC PASS, mas a ausência é um débito de SEO real da home.

**INFO, sanity/AC-08.** O ramo de contingência Supabase em `lib/services/posts.ts` permanece
por decisão da própria spec (seção 6, plano de rollback), não por esquecimento.

**INFO, sanity/AC-04.** Nesta rodada a restrição de destino foi provada sem o segredo real de
preview: a validação de slug (`app/api/preview/route.ts:115`) roda antes da comparação do token
(`route.ts:120`), então slugs inválidos respondem 400 mesmo com token errado no corpo. A rodada
anterior marcava a AC como UNVERIFIABLE porque não tinha testado esse caminho.

## Saída da autoridade

```json
{
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 8,
    "PASS": 5,
    "FAIL": 0,
    "UNVERIFIABLE": 3,
    "missingEvidence": 0,
    "BLOCKER": 0,
    "WARNING": 2
  },
  "reasons": [
    "AC sem PASS: sanity/AC-02",
    "AC sem PASS: sanity/AC-05",
    "AC sem PASS: sanity/AC-08"
  ]
}
```

A saída integral está em
`docs/reviews/evidence/2026-10-10-0646-0006/2026-10-10-0646-check-decision-output.json`.

## Evidências

Tudo em `docs/reviews/evidence/2026-10-10-0646-0006/`, com sha256 gravado no
`2026-10-10-0646-check-result.json`:

- `2026-10-10-0646-ac-06.log`: evidência combinada da AC-06 (via saudável e via de falha).
- `2026-10-10-0646-ac-06-falha-induzida.log`: a medição que derrubava a AC-06 e agora a sustenta.
- `2026-10-10-0646-ac-06-e-ac-04-saudavel.log`: via saudável, 404 real, 405, 403, 401 e 400 de slug.
- `2026-10-10-0646-ac-01.log`, `2026-10-10-0646-ac-02.log`, `2026-10-10-0646-ac-03.log`,
  `2026-10-10-0646-ac-05.log`, `2026-10-10-0646-ac-07.log`, `2026-10-10-0646-ac-08.log`.
- `2026-10-10-0646-git-head.txt`, `2026-10-10-0646-git-status.txt`,
  `2026-10-10-0646-spec-sha256.txt`.

Nenhum valor de segredo foi lido para o relatório, nenhum token aparece nos artefatos, e o
ambiente read only em relação ao Git: nada foi commitado, nenhuma branch criada. Uma sessão
paralela gravou o commit `307141d` durante a rodada; o gate avalia esse commit, que contém o
código medido. O `scripts/cloudflare-worker.ts` estava sujo no worktree (path fix de import de
outra sessão) e ficou fora do escopo desta avaliação.

## Decisão

**REPROVADO.** O veredito vem do gate, não desta leitura. O BLOCKER que exigia decisão humana
foi resolvido e implementado; o que sobra são precondições de ambiente:

- AC-02 precisa de um artigo publicado no dataset do Sanity para que a página de artigo
  renderize canonical e `og:url` na rede.
- AC-05 precisa do Durable Object publicado na Cloudflare (binding real, não o armazenamento
  em memória do `next start`).
- AC-08 depende do gate passar antes, por decisão da própria spec.

Nenhuma delas é gap de código que um `/develop` feche sem novo provisionamento.

## Próxima etapa

`/scope`, para reconciliar o estado da spec 0006 (código pronto e verificado até o limite do
ambiente local) e decidir o que vem na fila: provisionar as precondições remanescentes
(conteúdo publicado e Durable Object em produção) ou desbloquear as specs que dependem do mesmo
ambiente, como a 0010.
