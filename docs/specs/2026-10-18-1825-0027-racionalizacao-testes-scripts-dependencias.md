# 0027. Racionalizacao de testes, scripts e dependencias (Lote L4)

**Date**: 2026-10-18  
**Status**: Accepted  
**Decision source**: Aprovado pelo proprietario no chat em 2026-10-18

## Summary

Esta decisao formaliza a racionalizacao de scripts operacionais legados e a blindagem das suites de teste e banco de dados para o Lote L4 da faxina de backend do GradualInfo. Os scripts de deploy manual em Python e testes associados sao purgados cirurgicamente do repositorio por estarem obsoletos perante o fluxo padrao via OpenNext e Cloudflare Wrangler. A totalidade das suites de teste de seguranca, autenticacao e integracao permanece intocada, e o historico de migrations em supabase/migrations e estritamente preservado.

## Context

Durante a auditoria de qualidade e inventario exaustivo do Lote L0 (docs/audits/2026-10-18-1420-inventario-faxina-backend-l0.md), catalogamos 54 scripts e 83 suites de teste. Dentre eles, identificamos artefatos obsoletos que nao participam do ciclo de integracao continua nem dos comandos declarados no package.json:

1. scripts/deploy-version.py: script Python com 401 linhas que manipulava chamadas diretas a API REST da Cloudflare antes da adocao do OpenNext (opennextjs-cloudflare build e deploy).
2. scripts/compare-versions.py e scripts/check-version-readonly.py: utilitarios auxiliares que dependiam exclusivamente de deploy-version.py para leitura manual de versoes antigas.
3. test_deploy_version.py: arquivo de teste isolado na raiz do projeto cujo unico objetivo era testar scripts/deploy-version.py.
4. scripts/verify-spec-0016.mjs: verificador pontual de formatacao dos 10 rascunhos editoriais da Spec 0016 executado em 2026-10-12 e ja totalmente encerrado.

A manutencao desses arquivos mortos induz desenvolvedores e agentes a erro, consome tempo em auditorias estaticas e polui a raiz do projeto. Ao mesmo tempo, qualquer intervencao em testes ou banco de dados exige respeito absoluto aos Criterios de Protecao Inviolaveis do escopo.

## Requirements

**User stories**:

- Como mantenedor do projeto, quero remover ferramentas legadas de deploy que foram superadas pelo Wrangler e OpenNext, para manter o repositorio enxuto e livre de caminhos mortos.
- Como engenheiro de seguranca, quero garantia explicita de que nenhum teste de seguranca, autenticacao real ou auditoria probatoria sera descartado ou afrouxado durante a faxina.
- Como administrador do banco de dados, quero que o historico de migrations em supabase/migrations permaneca integro e imutavel, assegurando compatibilidade com testes pgTAP.

**Acceptance criteria**:

- **test-clean/AC-01**: Remocao cirurgica de scripts legados e testes orfaos de deploy Python (scripts/deploy-version.py, scripts/compare-versions.py, scripts/check-version-readonly.py e test_deploy_version.py) e do verificador historico da Spec 0016 (scripts/verify-spec-0016.mjs), sem qualquer impacto nas rotinas ativas do package.json.
- **test-clean/AC-02**: Preservacao integral de 100 por cento dos testes em **tests**/integration e **tests**/unit, mantendo a cobertura de branches em no minimo 80 por cento e todas as 83 suites Vitest verdes.
- **test-clean/AC-03**: Inviolabilidade do historico de migrations em supabase/migrations, garantindo que nenhuma tabela, funcao ou politica de seguranca em nivel de linha (RLS) seja alterada ou removida.
- **test-clean/AC-04**: Verificacao de sanidade das dependencias no package.json, confirmando que todos os pacotes de producao possuem utilidade comprovada e que nenhuma remocao acidental ocorra.
- **test-clean/AC-05**: Aprovacao integral do portao de qualidade pnpm check:all apos a limpeza dos scripts orfaos, com 0 segredos no Gitleaks e 0 achados no Semgrep.

## Options considered

### Option 1: Purgar scripts de deploy e manter suites de teste integrais (Recomendada)

Remover cirurgicamente os 4 scripts Python de deploy e o validador historico de rascunhos, mantendo todos os 859 testes Vitest, 171 testes pgTAP e 45 testes Playwright rigorosamente intactos.

**Pros**:

- Elimina mais de 500 linhas de codigo morto e remove o arquivo de teste orfao test_deploy_version.py da raiz.
- Respeita os principios de Senioridade Preguicosa (Ponytail) de diff minimo e corte cirurgico.
- Risco nulo de regressao funcional ou reducao de cobertura defensiva.
- Totalmente reversivel via historico Git caso necessario.

**Cons**:

- Exige atualizacao do indice de specs e documentacao de limpeza.

### Option 2: Refatorar profundamente suites de teste para tentar consolidar mocks

Modificar os testes unitarios de componentes e servicos para compartilhar um mock unico global de Supabase e Sanity.

**Pros**:

- Poderia reduzir algumas linhas duplicadas de inicializacao de teste.

**Cons**:

- Alto risco de acoplamento entre suites independentes.
- Pode mascarar falhas pontuais de isolamento e quebrar testes de concorrencia real.
- Viola a diretriz de conservadorismo estrito da faxina.

## Decision

**Chosen option**: Option 1: Purgar scripts de deploy e manter suites de teste integrais.

Remover os arquivos scripts/deploy-version.py, scripts/compare-versions.py, scripts/check-version-readonly.py, test_deploy_version.py e scripts/verify-spec-0016.mjs. Nao alterar nenhuma migration em supabase/migrations e preservar todos os testes existentes.

## Rationale

O fluxo atual de publicacao utiliza a esteira padrao da Cloudflare via OpenNext (pnpm build e opennextjs-cloudflare deploy) validada no commit 4e2294e e na CI. Os scripts manuais em Python foram desenvolvidos durante uma fase experimental e tornaram-se passivos de manutencao sem uso real. Purgar esses arquivos limpa o perimetro de analise estatica sem tocar em codigo de producao ou testes vigentes.

## Standard definition

**Canonical pattern**:

```bash
# Comandos canônicos de deploy e validação (mantidos e protegidos)
pnpm build          # compilação Next.js via OpenNext para runtime de Workers
pnpm deploy         # publicação direta via opennextjs-cloudflare deploy
pnpm deploy:full    # portão completo check:all + build + deploy
pnpm check:all      # validação integral de typecheck, lint, formatação, testes e segurança
```

**Replaces**:

- `python3 scripts/deploy-version.py` (obsoleto e descontinuado)
- `python3 scripts/compare-versions.py` (obsoleto e descontinuado)
- `python3 scripts/check-version-readonly.py` (obsoleto e descontinuado)
- `pytest test_deploy_version.py` (obsoleto e descontinuado)
- `node scripts/verify-spec-0016.mjs` (obsoleto e descontinuado)

**Enforcement**:

- Execucao automatizada de pnpm check:all e gitleaks/semgrep.

## Build plan

1. Remover scripts/deploy-version.py, scripts/compare-versions.py e scripts/check-version-readonly.py, satisfaz **test-clean/AC-01**.
2. Remover test_deploy_version.py da raiz do repositorio, satisfaz **test-clean/AC-01**.
3. Remover scripts/verify-spec-0016.mjs, satisfaz **test-clean/AC-01**.
4. Executar pnpm test:run e verificar que os 859 testes Vitest continuam passando sem alteracao em **tests**, satisfaz **test-clean/AC-02**.
5. Inspecionar o diretorio supabase/migrations confirmando que nenhuma migration foi tocada, satisfaz **test-clean/AC-03**.
6. Auditar as dependencias do package.json confirmando integridade de bibliotecas, satisfaz **test-clean/AC-04**.
7. Executar pnpm check:all comprovando saida exit 0 e integridade do portao, satisfaz **test-clean/AC-05**.

## Consequences

**Positive**:

- Mais de 500 linhas de codigo descontinuado removidas da arvore de trabalho.
- Raiz do repositorio limpa com a eliminacao de test_deploy_version.py.
- Zero impacto nas rotinas de deploy atuais, que operam via OpenNext e Wrangler.
- Preservacao de 100 por cento dos testes de seguranca e regressao.

**Negative / tradeoffs**:

- Scripts manuais em Python deixam de existir localmente, dependendo do historico Git para consulta arqueologica caso alguem precise inspecionar abordagens passadas.

**Neutral**:

- Nenhuma alteracao em codigo de runtime de navegadores ou APIs do portal.

## Follow-up

- [ ] Avanco para o Lote L5 para consolidacao final e fechamento da faxina de backend.
