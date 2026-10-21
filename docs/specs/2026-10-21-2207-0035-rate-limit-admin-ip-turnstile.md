# 0035. Rate-limit administrativo por IP/Turnstile

**Date**: 2026-10-21  
**Status**: Proposed  
**Decision source**: Pendente — aguardando confirmação do proprietário após revisão final

## Summary

Esta spec documenta a decisão de **não implementar** uma camada adicional de rate-limit por IP/Turnstile no fluxo administrativo, mantendo a arquitetura da Spec 0009 (Cloudflare Access como gate de admissão + quotas globais `login` e `mfa` no Durable Object, 5 tentativas por janela de 60 segundos).

A spec autoriza uma janela de investigação de até 7 dias **após confirmação de que há telemetria suficiente** para distinguir bloqueios do Cloudflare Access (na borda) de requisições que chegam ao Worker. Apenas se a investigação evidenciar exposição anterior à admissão ou impacto operacional relevante, uma camada por IP poderá ser proposta posteriormente, com revisão arquitetural própria.

Esta spec **não** altera código, não muda quotas, não adiciona variáveis de ambiente nem secrets, e não autoriza deploy.

## Context

O Worker protege rotas administrativas (`/admin-dashboard`, `/api/admin`) com Cloudflare Access como barreira de admissão. Somente requisições admitidas consomem as duas quotas persistentes no Durable Object (`login` e `mfa`, 5 tentativas/60s cada). Uma requisição não admitida não consome quota.

**Verificado no código:**

- `lib/admin/access-worker.ts:57` chama `admitAdminAccess(request, bindings)` antes de qualquer despacho ao OpenNext. Se `admission instanceof Response` (recusa), retorna imediatamente sem consumir quota.
- `app/api/admin/auth/login/route.ts:44` e `app/api/admin/auth/mfa/verify/route.ts:68` chamam `consumeAdminRateLimit('login')` / `consumeAdminRateLimit('mfa')` separadamente, após a admissão.
- `lib/admin/rate-limit-do.ts` armazena quotas em SQLite com `operation TEXT PRIMARY KEY CHECK(operation IN ('login','mfa'))`, `count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 5)`, `expires_at INTEGER NOT NULL`. O consumo é atômico via `transactionSync`.

**Não verificado no código:**

- Não há teste de integração que rode o fluxo completo `admitAdminAccess` seguido de `consumeAdminRateLimit` contra o Worker ou o DO publicado. Os testes existentes cobrem `readBoundedJson` (unidade) e `classifyAdminPath` (unidade), mas não cobrem o fluxo ponta a ponta de admissão seguida de consumo de quota.

Não há evidência atual de que bots ou scripts automatizados consigam contornar o Access e atingir o Worker. Também não há telemetria que distinga bloqueios do Access (na borda) de requisições que chegam ao Worker. A ausência de evidência não é prova de ausência de risco, mas também não justifica adicionar complexidade sem causa.

Implementar uma camada por IP agora introduziria estado adicional, armazenamento e regras de saturação sem justificativa documentada, além do risco de falsos bloqueios por NAT compartilhado (vários usuários atrás de um mesmo IP).

## Requirements

### User stories

- Como administrador, quero que o acesso ao painel seja protegido por Cloudflare Access antes de qualquer consumo de quota, para que apenas usuários admitidos possam tentar fazer login ou MFA.
- Como operador, quero que as quotas existentes (`login` e `mfa`) continuem protegendo contra consumo excessivo por identidade admitida, sem depender de endereço IP.
- Como engenheiro, quero que qualquer decisão sobre rate-limit por IP seja baseada em evidência observável, não em suposição.

### Acceptance criteria

- **0035/AC-01**: O acesso administrativo exige validação do Cloudflare Access (JWT assinado, JWKS, issuer, audience, claims) antes de qualquer consumo de quota no Durable Object, conforme o contrato existente na Spec 0009. Esta spec não cria novos requisitos de validação JWT; referencia o contrato vigente. **Comportamento observado no código:** `lib/admin/access-worker.ts:57` chama `admitAdminAccess` antes de despachar; `app/api/admin/auth/login/route.ts:44` e `app/api/admin/auth/mfa/verify/route.ts:68` chamam `consumeAdminRateLimit` apenas após admissão. **Limitação:** esta afirmação se baseia na leitura do código, não em teste automatizado executado.
- **0035/AC-02**: As quotas globais `login` e `mfa` no Durable Object permanecem inalteradas (5 tentativas por janela fixa de 60 segundos, consumo atômico e persistente). Não há nova chave de quota por IP. **Comportamento observado no código:** `lib/admin/rate-limit-do.ts` usa `CHECK(count BETWEEN 1 AND 5)`, `expires_at` com `now + 60000`, consumo via `transactionSync`. **Limitação:** não há teste de integração que rode cinco requisições contra o DO real e confirme a sexta resposta 429; este item está listado como trabalho futuro no Follow-up.
- **0035/AC-03**: Não há nova camada de rate-limit por IP/Turnstile implementada no código, nem bindings, vars ou segredos relacionados adicionados ao Worker.
- **0035/AC-04**: Existe um plano de investigação de até 7 dias com critérios objetivos para decidir se a camada por IP é necessária. A investigação só começa após confirmação de que há telemetria suficiente para distinguir bloqueios do Access de requisições que chegam ao Worker. **A verificar:** existência de telemetria suficiente; se não houver, registrar limitação e não iniciar a contagem.
- **0035/AC-05**: Se a telemetria não permitir distinguir bloqueios do Access de requisições que chegam ao Worker, o resultado é registrado como "inconclusivo", não como "ausência de risco".

## Options considered

### Option 1: Manter arquitetura atual (Cloudflare Access + quotas globais DO)

Implementar apenas a investigação de até 7 dias para observar se há probing antes da admissão. Não adicionar rate-limit por IP agora.

**Pros**:

- Não adiciona complexidade ao Worker (sem novo estado, armazenamento ou regras de saturação).
- Não arrisca falsos bloqueios por NAT compartilhado.
- Não consome quota de identidades legítimas que compartilham IP.
- Mantém o contrato da Spec 0009 intacto.

**Cons**:

- Não mitiga diretamente ataques de um único IP antes da admissão (se existirem — não há evidência de que ocorram).
- Requer investigação separada para confirmar se tal ataque ocorre.

### Option 2: Implementar rate-limit por IP/Turnstile agora

Adicionar camada de rate-limit por IP (chave derivada com pepper de `cf-connecting-ip`) na borda, antes ou junto da admissão Access.

**Pros**:

- Poderia bloquear bots de um único IP antes da validação Access.
- Reduziria teoricamente o número de requisições que atingem a aplicação.

**Cons**:

- Não há evidência de que tal ameaça existe.
- NAT compartilhado pode causar falsos bloqueios para usuários legítimos.
- `cf-connecting-ip` pode ser confiável apenas na borda Cloudflare; em ambientes de desenvolvimento ou pipes não confiáveis, requer tratamento especial.
- Adiciona estado, armazenamento e regras de saturação que precisam de operação e manutenção.
- Contraria o princípio de não implementar sem evidência.

**Nota importante:** Rate-limit por IP e Turnstile são mecanismos distintos. Esta spec não avalia nem autoriza uma implementação combinada. Uma proposta futura deverá justificar cada mecanismo separadamente.

## Decision

**Chosen option**: Option 1 (manter arquitetura atual; não implementar rate-limit por IP agora).

Adicionar uma camada de rate-limit por IP sem evidência de necessidade viola o princípio de não introduzir complexidade sem justificativa. A Spec 0009 já estabelece que o acesso administrativo passa pelo Cloudflare Access antes de consumir quota, e que as quotas globais `login` e `mfa` persistem no Durable Object com consumo atômico. A decisão de não implementar por IP agora não é permanente: está condicionada ao resultado de uma investigação de até 7 dias.

**Implementation skills**: Nenhuma (nenhuma alteração de código, dependência ou configuração de produção nesta etapa).

## Rationale

A Spec 0009 já estabelece que o acesso administrativo passa pelo Cloudflare Access antes de consumir quota, e que as quotas `login` e `mfa` persistem no Durable Object com consumo atômico. A alternativa por IP (Option 2) foi avaliada e rejeitada nesta spec porque:

1. Não há evidência de ataques distribuídos ou concentrados por IP que cheguem ao Worker.
2. A admissão Access já filtra requisições sem credenciais válidas na borda, antes de qualquer consumo de quota.
3. Adicionar rate-limit por IP introduz estado, armazenamento e lógica de saturação que não têm causa documentada.

A decisão de não implementar agora não é uma decisão de nunca implementar. É uma decisão de aguardar evidência. A investigação de 7 dias fornece o critério objetivo para reabrir o assunto se necessário.

## Feature design

### Data model sketch

Nenhum novo dado persistido. As quotas existentes (`quotas(operation TEXT PRIMARY KEY, count INTEGER, expires_at INTEGER)` no Durable Object `AdminRateLimitDO`) permanecem inalteradas. Não há nova chave de quota por IP.

### API surface

Nenhuma nova rota, endpoint ou contrato público. As rotas administrativas existentes continuam protegidas pelo fluxo atual (Access → quota DO).

### Value sourcing

Não há valores a produzir, computar ou exibir nesta decisão. Nenhuma nova entrada de configuração, variável de ambiente ou binding de Worker é adicionada.

### Key invariants

- Nenhuma requisição não admitida pelo Cloudflare Access consome quota no Durable Object.
- O Durable Object `AdminRateLimitDO` permanece a fonte da verdade para sessões ativas de rate-limit administrativo (armazena apenas `operation`, `count` e `expires_at` — sem IP, sem identidade pessoal, sem credenciais).
- Nenhuma chave de acesso, token ou segredo é exposto em logs, Sentry ou artefatos de build.

### Security model

Acesso administrativo exige validação do Cloudflare Access (JWT assinado conforme contrato existente na Spec 0009) antes de qualquer consumo de quota. Esta spec não cria novos requisitos de validação JWT; referencia o contrato vigente.

### Configuration required

Nenhuma nova variável de ambiente, secreto ou binding de Worker. A configuração existente (`ADMIN_ACCESS_ISSUER`, `ADMIN_ACCESS_AUD`, `ADMIN_ACCESS_OWNER_EMAIL`, `ADMIN_ACCESS_HOSTS`) permanece inalterada.

## Critical test scenarios

- **0035/AC-01**: Requisição sem token Access válido para `/admin-dashboard` ou `/api/admin` não consome quota no Durable Object. Verifica que a admissão precede o consumo, conforme contrato existente na Spec 0009. **Comportamento observado no código:** `lib/admin/access-worker.ts:57` chama `admitAdminAccess` antes de despachar; `app/api/admin/auth/login/route.ts:44` e `app/api/admin/auth/mfa/verify/route.ts:68` chamam `consumeAdminRateLimit` apenas após admissão. **Limitação:** esta afirmação se baseia na leitura do código, não em teste automatizado executado.
- **0035/AC-02**: Cinco tentativas falhas de `login` por identidade admitida esgotam a quota global DO; a sexta recebe 429 com `Retry-After`. Verifica que a quota global DO funciona conforme especificado. **Comportamento observado no código:** `lib/admin/rate-limit-do.ts` usa `CHECK(count BETWEEN 1 AND 5)`, `expires_at` com `now + 60000`, consumo via `transactionSync`. **Limitação:** não há teste de integração que rode cinco requisições contra o DO real e confirme a sexta resposta 429; este item está listado como trabalho futuro no Follow-up.
- **0035/AC-03**: Não existem bindings, vars ou segredos relacionados a rate-limit por IP no `wrangler.jsonc` ou no código do Worker. Verifica que não houve implementação prematura.
- **0035/AC-04**: Existe um plano de investigação de até 7 dias com critérios objetivos para adicionar ou não a camada por IP. A investigação só começa após confirmação de que há telemetria suficiente para distinguir bloqueios do Access de requisições que chegam ao Worker. **A verificar:** existência de telemetria suficiente; se não houver, registrar limitação e não iniciar a contagem.
- **0035/AC-05**: Se a telemetria não permitir distinguir bloqueios do Access de requisições que chegam ao Worker, o resultado é registrado como "inconclusivo", não como "ausência de risco". Verifica que a ausência de evidência não é tratada como prova de segurança.

## Build plan

1. Documentar a decisão de não implementar rate-limit por IP agora — **a verificar** contra o código existente (não assumir).
2. Definir plano de investigação de até 7 dias com critérios objetivos para adicionar ou não a camada por IP — **a verificar** (incluir etapa de confirmação de telemetria antes de iniciar a contagem).
3. Definir critério de resultado inconclusivo (telemetria insuficiente) — **a verificar**.
4. Executar investigação (se houver telemetria disponível e suficiente) e registrar resultado. Não há código a ser desenvolvido nesta spec.

> **Nota:** os itens acima marcados "a verificar" ainda não foram confirmados contra o código ou contra telemetria real. Este build plan é um plano de trabalho, não um registro de execução.

## Consequences

### Positive

- Não aumenta a superfície de ataque do Worker.
- Não adiciona estado, armazenamento ou regras de saturação sem justificativa.
- Mantém o contrato da Spec 0009 intacto e testável.

### Negative / tradeoffs

- Não há proteção adicional por IP contra ataques que cheguem antes da admissão Access (se existirem — não há evidência).
- A decisão depende de investigação futura para ser reavaliada.

### Neutral

- Não há alteração de runtime, banco de dados, API ou interface pública.
- O tráfego editorial público continua sem alterações.

## Follow-up

- [ ] Verificar cobertura de telemetria para distinguir bloqueios do Access de requisições ao Worker (antes de iniciar a contagem dos 7 dias). **Responsável e prazo: a definir.**
- [ ] Documentar procedimento de verificação de telemetria (o que será considerado evidência suficiente).
- [ ] Se houver telemetria suficiente, executar investigação de até 7 dias sobre tráfego antes da admissão Access.
- [ ] Registrar resultado: implementar rate-limit por IP, não implementar, ou investigação inconclusiva.
- [ ] Se decidir implementar, criar nova spec com revisão arquitetural, testes de regressão e aprovação própria.
- [ ] Adicionar teste de integração que rode `admitAdminAccess` seguido de `consumeAdminRateLimit` contra o DO real.
- [ ] Adicionar teste de integração que rode cinco requisições de `login` contra o DO real e confirme a sexta resposta 429 com `Retry-After`.

## References

### Project sources (verifiable, in this repo)

- `lib/admin/access.ts`: validação de JWT/JWKS, `readAdminAccessConfig`, `admitAdminAccess`.
- `lib/admin/access-worker.ts`: `dispatchWithAdminAccess`, primeira barreira antes do OpenNext.
- `lib/admin/rate-limit-do.ts`: Durable Object `AdminRateLimitDO`, quotas `login`/`mfa` (5 tentativas/60s).
- `lib/admin/access-guard.ts`: guarda interna, exige contexto Access no `env`.
- `wrangler.jsonc`: bindings `PreviewSessionDO` e `AdminRateLimitDO`, `vars` do Worker.
- `docs/specs/2026-10-09-1632-0009-admissao-admin-access.md`: Spec 0009, admissão administrativa com Cloudflare Access.
- `docs/specs/2026-10-09-1644-0009-revisao-admissao-access.md`: Revisão independente da Spec 0009 (R1 a R10).

### Practices & standards

- Fail closed: configuração ausente, path ambíguo ou contexto inválido resulta em 403/503 privado, nunca vazamento.
- Ninguém expor tokens ou segredos: nunca gravar valores reais em chat, comandos, logs, relatórios, commits ou PRs.
- YAGNI e Ponytail: menor diff funcional que resolve a tarefa integralmente, sem abstrações prematuras.

---

Esta spec está em estado `Proposed`. Aguardo confirmação explícita para elevar a `Accepted`. Após a confirmação, **nenhuma alteração de código será feita nesta tarefa** — apenas a investigação de 7 dias será executada separadamente, quando houver telemetria disponível e se o critério de evidência for atendido.
