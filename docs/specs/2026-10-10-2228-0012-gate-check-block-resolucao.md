# 0012. Gate check block resolucao

**Date**: 2026-10-10
**Status**: Accepted
**Decision source**: /check review da spec 0006 (transicao-editorial-sanity) — 8 ACs, gate check-decision.mjs reprovado por 7 ACs UNVERIFIABLE + 1 PASS placeholder; falta evidencia empirica de runtime

---

## Summary

Decisao sobre como resolver o bloqueio do gate /check na spec 0006 quando oito criterios de aceite (AC-01 a AC-08) nao podem ser provados empiricamente no ambiente de sandbox. Tres caminhos: (1) configurar environment Worker Secrets, Sanity dataset e Durable Object para gerar hashes de evidencia e reavaliar o gate; (2) documentar o trade-off e prosseguir com os ACs parcialmente verificados, aceitando UNVERIFIABLE como escolha consciente; (3) marcar feature como Blocked no STATE e aguardar decisao do usuario. A recomendacao e o caminho 1: obter saida real e atualizar o gate, pois a spec 0006 e Accepted e /develop nao deve construir com gate reprovado.

---

## Context

A spec 0006 (transicao-editorial-sanity) tem status Accepted e oito ACs (sanity/AC-01 a sanity/AC-08). O gate /check via scripts/check-decision.mjs exige todos os 8 ACs marcados PASS com hashes de evidencia validos para approved: true. No ambiente de sandbox (git EPERM, sem Worker secrets, sem Sanity publicado, sem DO publicado), a verificacao end-to-end nao e possivel: 7 ACs ficam UNVERIFIABLE e 1 so tem PASS placeholder. O /test passa 540 testes unitarios (bump @playwright/test de 1.63.0 para 1.64.0), mas testes unitarios nao substituem verificacao empirica dos ACs de preview, Durable Object, proxy sonda e headers de cache. O diff HEAD~1..HEAD e limpo (apenas bump de dependencia). A decisao atual bloqueia o /develop, pois o skill /develop nao deve construir quando o gate /check reprova.

---

## Requirements

- sanity/AC-01: home e rota /artigos/[slug] obtem artigos exclusivamente do Sanity, sem dual-source ativo
- sanity/AC-02: slugs mantem mesma estrutura de URL e metadados OpenGraph/canonical coincidem com nova origem
- sanity/AC-03: chamadas ao Sanity ocorrem no servidor/Worker; tokens privados nao vazam no bundle cliente
- sanity/AC-04: entrada e logout de preview respondem exclusivamente a POST (GET retorna 405); segredo enviado no corpo; requisicoes com origem divergente respondem 403; destino restrito a slugs internos validos
- sanity/AC-05: sessao criada e persistida no Cloudflare Durable Object com consistencia forte antes da emissao do cookie. Cookie assinado HMAC-SHA256 com TTL de 1800s. Consulta ao DO sem cache intermediario em cada autorizacao de preview. Semantica da falha fechada: sessao invalida, expirada ou revogada para artigo nao publico responde 404; indisponibilidade do DO durante a autorizacao responde 503 sem entregar rascunho; artigo publico permanece acessivel normalmente sem exigir preview. Logout somente confirma 303 apes de persistencia da revogacao no DO. Reutilizacao de copia do cookie apos logout e rejeitada com 404 em teste automatizado
- sanity/AC-06: respostas publicas e de preview mantem Cache-Control: no-store (e private, no-store no preview). Slugs inexistentes respondem 404 real; indisponibilidade de infraestrutura responde status de erro adequado (503/500) sem mascarar falha como 404
- sanity/AC-07: NEXT_PUBLIC_SITE_URL e links canonicos usam o dominio oficial do Worker, sem residuos de gradualinfo.pages.dev
- sanity/AC-08: Supabase desonerado da camada editorial e auth de preview apos validacao 100% PASS do Sanity, mantendo backup sem deleccao destrutiva

---

## Options considered

### Option 1: Gerar evidencia empirica e reavaliar gate

Configurar o ambiente de runtime: provisionar Worker Secrets (7 vars), dataset Sanity production, publicar Durable Object PreviewSessionDO, e executar o fluxo end-to-end cobrindo todos os 8 ACs. Gerar hashes de evidencia nos arquivos correspondentes. Re-executar scripts/check-decision.mjs com hashes validos.Resultado: gate aprovado, /develop pode prosseguir, /test acionado. Custo: configuracao de environment remoto, possivelmente horas de trabalho.Follow-up: apos o gate aprovar, avancar para /test e builds subsiguintes.

### Option 2: Documentar o trade-off e prosseguir consciente

Manter o gate reprovado como decisao consciente, registrando quais ACs sao UNVERIFIABLE e por que (limitacoes de sandbox). Atualizar workflow/STATE.md com status Blocked e a observacao especifica. /develop constroi respeitando as limitacoes conhecidas; /test roda os 540 testes unitarios que validam a l integridade basica. Resultado: o produto segue com ACs parcialmente verificadas; futuras configuracoes de environment podem reabrir a validacao.Follow-up: anotao no STATE; decisao registrada; revisita quando environment for provisionado.

### Option 3: Marcar feature como Blocked e aguardar decisao do usuario

Marcar o feature transicao-editorial-sanity como Blocked no workflow/STATE.md com os ACs nao verificados. Rotear para /architect transicao-editorial-sanity para registrar a decisao formal. Aguardar usuario definir se: (a) provisiona o environment e reinicia a validacao, (b) aceita o status parcial, ou (c) redefine escopo. Resultado: decisao formal registrada, mas o trabalho de build estancado ate a definicao.

---

## Decision

**Chosen option**: Option 1 — gerar evidencia empirica e reavaliar gate

A recomendacao e perseguir o caminho 1: configurar o environment de runtime e gerar a evidencia empirica para todos os 8 ACs da spec 0006. Razao: a spec 0006 e Accepted, e o /develop nao deve iniciar construindo com o gate /check reprovado. O bloqueio nao e por falha de codigo (o diff e limpo, todos 540 testes passam), mas por falta de environment para validacao empirica. Configurar o environment tambem habilita validacoes futuras e evita que o projeto acumule ACs permanentemente UNVERIFIABLE. O custo e justificado pelo valor de ter o gate fechado e o fluxo de entrega desbloqueado.

**Implementation skills**: `check` (`.agents/skills/check/`): protocolo de verificacao e revisao de qualidade; `test` (`.agents/skills/test/`): suite de testes unitarios e integracao

**One sentence**: Configurar environment Worker Secrets, Sanity dataset e Durable Object publicado; executar verificacao end-to-end cobrindo todos os 8 ACs; gerar hashes de evidencia; re-executar scripts/check-decision.mjs para aprovar o gate e liberar /develop.

---

## Rationale

A Option 1 e escolhida porque: (1) a spec 0006 ja e Accepted com decisoes documentadas, entao o gate /check bloqueio e a pendencia restante, nao um problema de design nao resolvido; (2) o diff HEAD~1..HEAD e limpo (apenas bump de dependencia), logo nao ha defeito de codigo para corrigir; (3) os 540 testes unitarios validam que o codigo funciona, so que a verificacao dos ACs requer saida real (preview flow, DO, proxy sonda, headers de cache) que o sandbox nao fornece; (4) acumular ACs UNVERIFIABLE permanentemente vai contra a regra do gate (um AC nao testavel reprova); (5) configurar o environment tambem prepara o projeto para futuras validacoes e deploys. A Option 2 e uma alternativa viavel se o environment nao puder ser provisionado, mas deixa o gate aberto de forma inconsciente. A Option 3 estancaria o trabalho de build sem beneficio proposital.

---

## Rationale (continued)

The gate rule explicitly states: "Aprovar por nao haver FAIL e o defeito A01, corrigido aqui." Um AC nao testavel e UNVERIFIABLE, e UNVERIFIABLE reprova. Aprovar sem evidencia empirica e o defeito que este gate existe para evitar. Portanto, a deciso de perseguir a evidencia (Option 1) e a unica que respeita a intencao do gate, ao mesmo tempo em que reconhece que o bloqueio nao e por falha de implementacao.

Alinhado ao build approach Tracer Bullet desta projetoc (entrega fina end-to-end por todas as camadas), a validacao empirica dos ACs e um incremento thin mas completo atravessando as camadas de proxy, Worker, Durable Object e Sanity — o que e exatamente o que o gate exige e o que o /develop deve construir sobre.

---

## Configuration required

- `NEXT_PUBLIC_SITE_URL`: https://gradualinfo.com.br (ja configurado no wrangler.jsonc)
- `SANITY_PROJECT_ID`: sjngngsjvotagwctzpde (ja confirmado via dono)
- `SANITY_DATASET`: production (pendente de populacao)
- `SANITY_API_READ_TOKEN`: secreto no Worker (pendente de configuracao via `wrangler secret put`)
- `ADMIN_USER_ID`: id do administrador (ja configurado localmente)
- `ADMIN_EMAIL`: email do administrador (ja configurado localmente)
- `PREVIEW_SECRET`: segredo do preview (pendente de configuracao via `wrangler secret put`)
- `PREVIEW_SIGNING_KEY`: chave de seguranca do preview (pendente de configuracao via `wrangler secret put`)
- `ADMIN_RATE_LIMIT_DO`: rate limit DO (ja configurado)

---

## Build plan

1. Configurar variaveis de ambiente no Worker via `wrangler secret put <NOME> --env <ambiente>` para os 7 secrets listados acima (ou confirmar que ja estao configurados no ambiente de producao)
2. Popular dataset Sanity `production` com artigos publicados (pelo menos 1 artigo com slug valido para testes de rota /artigos/[slug])
3. Publicar Durable Object PreviewSessionDO no Worker (deploy do migration ou comando analogous)
4. Executar verificacao end-to-end: iniciar `pnpm dev`, navegar em `/`, testar rota `/artigos/[slug]` com slug existente e inexistente, testar preview via POST em `/api/preview`, testar logout via POST em `/api/preview/logout`, testar rejeucao de copia de cookie apos logout
5. Gerar hashes de evidencia: para cada AC, capturar o output (screenshot, log, status code) e computar sha256; gravar o hash no campo evidence Sha256 do artefato de decisao
6. Re-executar `scripts/check-decision.mjs --spec docs/specs/2026-10-08-2228-0006-transicao-editorial-sanida.md <arquivo-json>` para confirmar approved: true, verdict: APROVADO
7. Se aprovado, avancar para /test (ja validado: 540 passed) e prosseguir com builds e deploy

Each task satisfies one or more ACs as documented in ## Requirements. Order reflects Tracer Bullet approach: thin end-to-end through proxy, Worker, DO, Sanity before thickening.

---

## Consequences

### Positive

- Gate /check aprovado: 0 FAIL, 0 UNVERIFIABLE, 0 BLOCKER, todos os 8 ACs PASS com evidencia
- /develop pode prosseguir com construcao sobre spec 0006 acceptada
- /test acionado com suiete completa
- Ambiente de producao fica configurado e mensuravel para futuras validacoes
- Contrato entre spec, gate e implementacao fico fechado e tracado

### Negative / tradeoffs

- Custo de tempo para provisionar environment remoto (Worker secrets, Sanity dataset, DO)
- Pode ser necessario aguardar autorizacao do dono para configurar secrets reais na Cloudflare
- Mudanca de estado: do sandbox isolado para environment com bindings reais

### Neutral

- Nao ha alteracao de codigo de aplicacao (o diff e limpo)
- Os 540 testes unitarios permanecem validos independentes da decisao de environment

---

## Follow-up

- [ ] Provisionar Worker Secrets via `wrangler secret put` (7 variaveis): NEXT_PUBLIC_SITE_URL, SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_READ_TOKEN, ADMIN_USER_ID, ADMIN_EMAIL, PREVIEW_SECRET, PREVIEW_SIGNING_KEY, ADMIN_RATE_LIMIT_DO
- [ ] Confirmar dataset Sanity `production` populado com artigos publicados
- [ ] Publicar Durable Object PreviewSessionDO na Cloudflare (wrangler deploy ou migration)
- [ ] Re-executar verificacao end-to-end e gerar hashes de evidencia para todos os 8 ACs
- [ ] Re-executar scripts/check-decision.mjs e confirmar approved: true
- [ ] Se aprovado, avancar para /test e registrar resultado em check/<feature>/<run-id>/TEST.md
- [ ] Se nao possivel provisionar environment, reavaliar Option 2 (documentar trade-off consciente)

---

## References

### Project sources (verifiable, in this repo)

- `AGENTS.md`: convencoes técnicas, autoriedade de artefatos e delegacao
- `workflow/STATE.md`: bastao atual e historico de execucao
- `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`: spec aceita com 8 ACs
- `scripts/check-decision.mjs`: autoridade executavel da decisao
- `scripts/check-gate.mjs`: gate mecanico (referencia)

### Practices & standards

- Gate /check exige todos os ACs PASS com evidencia de hash SHA-256; UNVERIFIABLE reprova
- /develop nao deve construir quando o gate /check reprova (regra AGENTS.md Decision Check)
- /test passa 540 testes em 51 arquivos; bump @playwright/test de 1.63.0 para 1.64.0 e compativel
- Build approach Tracer Bullet: entrega fina end-to-end por todas as camadas primeiro, depois engorda

### Links (web verified)

- none verified (stage (c) never retornou links para esta decisao)
