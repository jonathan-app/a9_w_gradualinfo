# /check verify: Transição Editorial Sanity (spec 0006)

**Data**: 2026-10-09 20:29 (America/Sao_Paulo)
**Modo**: verify (bastão atual em `workflow/STATE.md`)
**Spec**: `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`
**Sha256 da spec**: `bdfb1a9b691ad6935b0a18d2abc15f8b8f6e965909e18a0f18845a61d78cf5c1`
**Commit avaliado**: `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`
**Árvore avaliada**: `9ef0f628b6eef85ca97ae9295b33e4f13343efee`
**Veredito**: **REPROVADO** (exit 1, autoridade `scripts/check-decision.mjs`)

O gate parseou o conjunto completo de 8 ACs desta vez. A rodada anterior, às 16:30, travou
justamente porque a spec ainda usava checkbox no formato `- [x] **sanity/AC-01**` e o regex do
contrato não capturava. O formato atual resolveu isso: `totalACs` 8, `missingEvidence` 0.

## Como a prova foi feita

Nada foi medido por inspeção de código e assumido como comportamento. Tudo que aparece como
PASS ou FAIL veio de rede:

- Build de produção (`pnpm build`, saída OpenNext) servido por `next start` na porta 3101 e
  por `scripts/e2e-server.mjs` com TLS na 3100.
- E2E real em Chromium contra o build de produção: `E2E_PRODUCTION=1`, certificados
  `./localhost-key.pem` e `./localhost-cert.pem`, 4 de 4 testes verdes em
  `e2e/editorial-sanity.spec.ts`.
- `curl` para as medições de status, cabeçalho e corpo.
- Falha induzida na fonte de conteúdo por override de processo, sem tocar em código:
  `SANITY_DATASET=dataset-que-nao-existe-prova-gate` aponta para um dataset inexistente e
  expõe o comportamento real sob indisponibilidade.
- `pnpm check:all` reexecutado nesta árvore: typecheck, lint, formatação e 326 de 326 testes,
  exit 0.

Servidores de teste foram derrubados ao final de cada medição.

## Resultado por AC

| AC           | Status       | Evidência                                        | O que a rede mostrou                                                                                                                                                                                                                                                                                                                                                                           |
| ------------ | ------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sanity/AC-01 | PASS         | `2026-10-09-2029-ac-01-ac-06-falha-induzida.log` | Sob falha do dataset, `/artigos/<slug>` respondeu 503 em vez de cair silenciosamente para o Supabase, e o log do servidor nomeou o projeto e o dataset do Sanity. Com o dataset saudável a home renderizou o estado vazio do Content Lake. Isso prova que a leitura editorial sai do Sanity e só dele.                                                                                         |
| sanity/AC-02 | UNVERIFIABLE | `2026-10-09-2029-ac-02.log`                      | O dataset real não tem nenhum artigo publicado. A home responde "Nenhum artigo publicado" e `/artigos/<slug>` devolve 404. Sem página de artigo não existe `<link rel="canonical">` nem `og:url` para comparar.                                                                                                                                                                                |
| sanity/AC-03 | PASS         | `2026-10-09-2029-ac-03-ac-07.log`                | Zero ocorrências de `sanity.io`, de `Bearer ` e do valor do token de 180 caracteres em qualquer arquivo de `.open-next/assets/_next/static`. O cliente nunca fala com o Sanity.                                                                                                                                                                                                                |
| sanity/AC-04 | UNVERIFIABLE | `2026-10-09-2029-ac-04.log`                      | Provado: GET em `/api/preview` e `/api/preview/logout` responde 405, e origem divergente responde 403. Não provado: a afirmação de que o segredo vai no corpo e a restrição de destino para slugs internos. As duas etapas só são alcançadas com o segredo real de preview, e ele não pode trafegar em claro em relatório ou teste.                                                            |
| sanity/AC-05 | UNVERIFIABLE | `2026-10-09-2029-ac-05.log`                      | Sem o binding do Durable Object o `next start` usa o armazenamento em memória, que não falha fora de `simulateFailure`. Não existe alavanca de ambiente para provar na rede o 503 com DO indisponível, o 303 condicionado à persistência da revogação, a rejeição da cópia de cookie pós logout e o `Max-Age=1800`. Cobertura em unidade existe e está verde, mas unidade não é prova de rede. |
| sanity/AC-06 | FAIL         | `2026-10-09-2029-ac-01-ac-06-falha-induzida.log` | A rota de artigo está correta: 503 com `private, no-store`, `noindex, nofollow` e nenhum vazamento de conteúdo editorial. A home não: sob a mesma falha ela responde HTTP 200 com a UI de "Página não encontrada", mascarando indisponibilidade de infraestrutura como 404.                                                                                                                    |
| sanity/AC-07 | PASS         | `2026-10-09-2029-ac-03-ac-07.log`                | Zero arquivos com `gradualinfo.pages.dev` em todo `.open-next/assets`. O sitemap usa `https://gradualinfo.com.br`.                                                                                                                                                                                                                                                                             |
| sanity/AC-08 | UNVERIFIABLE | `2026-10-09-2029-ac-08.log`                      | A AC condiciona a retirada do Supabase a uma validação 100% PASS do Sanity. Essa validação não existe, e esta própria rodada reprovou. O ramo de contingência segue no código de propósito, conforme a seção 6 da spec, que mantém o rollback.                                                                                                                                                 |

Contagem do gate: 3 PASS, 1 FAIL, 4 UNVERIFIABLE, 0 evidências ausentes, 1 BLOCKER, 2 WARNING.

## Findings

**BLOCKER, sanity/AC-06.** Com o Content Lake indisponível a home responde 200 com a UI de 404. O caminho é `app/page.tsx` delegando ao `throw` de `getPublishedPosts`, e o Next entregando
a fronteira de `not-found`. A rota de artigo já faz o certo. O que falta é decidir, não
implementar: o comportamento da home sob falha editorial não está escrito em nenhuma spec.
Duas leituras possíveis, ambas plausíveis, e escolher sem registrá seria arbitrário.

**WARNING, sanity/AC-03.** Os nomes `SANITY_API_READ_TOKEN`, `SANITY_API_VERSION` e
`GA_MEASUREMENT_ID` aparecem no chunk cliente
`.open-next/assets/_next/static/chunks/32ev0pvo51kjo.js`, porque `lib/env.ts` monta um objeto
único de env consumido também no cliente. O valor do token não vaza, zero ocorrências. O custo
é expor ao cliente quais segredos existem, o que é informação útil para quem está tentando
adivinhar a superfície.

**WARNING, sanity/AC-07.** A home não emite `<link rel="canonical">`, zero ocorrências no HTML,
apesar de `app/layout.tsx` declarar `metadataBase`. Sitemap e resíduos estão limpos, então a AC
PASS, mas a ausência é um débito de SEO real.

**INFO, sanity/AC-08.** O ramo Supabase em `lib/services/posts.ts` e o caminho legado de auth em
`lib/preview/auth.ts` permanecem por decisão da própria spec, não por esquecimento.

## Saída da autoridade

```json
{
  "approved": false,
  "verdict": "REPROVADO",
  "counts": {
    "totalACs": 8,
    "PASS": 3,
    "FAIL": 1,
    "UNVERIFIABLE": 4,
    "missingEvidence": 0,
    "BLOCKER": 1,
    "WARNING": 2
  },
  "reasons": [
    "AC sem PASS: sanity/AC-02",
    "AC sem PASS: sanity/AC-04",
    "AC sem PASS: sanity/AC-05",
    "AC sem PASS: sanity/AC-06",
    "AC sem PASS: sanity/AC-08"
  ]
}
```

O motivo de BLOCKER completo está transcrito na seção de findings acima e está no arquivo
`2026-10-09-2029-check-decision-output.json`.

## Evidências

Tudo em `docs/reviews/evidence/2026-10-09-2029-0006/`, com sha256 gravado em
`2026-10-09-2029-check-result.json` e saída integral da autoridade em
`2026-10-09-2029-check-decision-output.json`:

- `2026-10-09-2029-check-all.log`: `pnpm check:all`, exit 0, 326 de 326.
- `2026-10-09-2029-ac-06-e2e.log`: E2E de produção, 4 de 4, que prova o lado saudável da AC-06
  (404 real na rede e cabeçalho `no-store`).
- `2026-10-09-2029-ac-01-ac-06-falha-induzida.log`: a medição que derruba a AC-06 e sustenta a
  AC-01.
- `2026-10-09-2029-ac-03-ac-07.log`, `2026-10-09-2029-ac-03-investigacao.log`,
  `2026-10-09-2029-ac-02.log`, `2026-10-09-2029-ac-04.log`, `2026-10-09-2029-ac-05.log`,
  `2026-10-09-2029-ac-08.log`.

Nenhum valor de segredo foi lido para o relatório, nenhum token aparece nos artefatos, e o
ambiente read only em relação ao Git: nada foi commitado, nenhuma branch criada.

## Decisão

**REPROVADO.** O veredito vem do gate, não desta leitura. A razão que precisa de decisão humana
é o BLOCKER da AC-06, porque as duas leituras possíveis da home sob falha mudam a arquitetura:
uma delas põe custo de latência em toda página inicial, a outra muda o contrato de erro que o
usuário vê.

As demais ACs sem PASS não são defeito de código. AC-02, AC-04 e AC-05 exigem precondições que
não existem localmente, com conteúdo publicado no dataset, o segredo real de preview e um
Durable Object publicado. AC-08 depende do gate passar antes.

## Próxima etapa

`/architect`, para decidir e registrar na spec 0006 o comportamento da home sob falha
editorial. Depois disso, `/develop` para implementar a decisão.
