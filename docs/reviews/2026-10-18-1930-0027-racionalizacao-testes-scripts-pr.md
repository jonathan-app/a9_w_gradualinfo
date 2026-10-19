# Rascunho de PR: 0027. Racionalização de testes, scripts e dependências (Lote L4)

- Data: 2026-10-18 19:30, America/Sao_Paulo.
- Feature: Lote L4 da faxina de backend (docs/scope/2026-10-18-1400-faxina-backend.md), spec docs/specs/2026-10-18-1825-0027-racionalizacao-testes-scripts-dependencias.md (Accepted).
- Estado da árvore: trabalho local staged na branch main; abertura remota do PR depende de branch dedicada e autorização do proprietário.

## Título

chore: racionalizacao de scripts legados e blindagem de testes

## Corpo

## What

Este PR remove 756 linhas de código obsoleto composto por scripts legados de deploy manual em Python e validação pontual de migração antiga. O fluxo de build e deploy do projeto é atendido integralmente por OpenNext e Cloudflare Wrangler através dos comandos do package.json. Todos os 859 testes Vitest em 83 suítes foram rigorosamente preservados e validados, e nenhuma alteração foi realizada nas migrations SQL do Supabase.

## Why

Durante a auditoria e inventário do backend (Lote L0), identificamos ferramentas operacionais em Python que manipulavam chamadas manuais à API REST da Cloudflare antes da adoção do pipeline moderno do OpenNext. A permanência desses arquivos induzia novos desenvolvedores a erro e poluía a raiz do repositório com arquivos de teste órfãos. Além disso, o script de validação de rascunhos da Spec 0016 havia cumprido seu propósito temporário em 12 de outubro e já se encontrava encerrado. A remoção limpa desses 5 arquivos reduz a dívida técnica sem alterar nenhum contrato ativo.

## Changes

- Remoção de scripts legados de deploy Python (scripts/deploy-version.py, scripts/compare-versions.py, scripts/check-version-readonly.py): eliminação de 525 linhas de chamadas procedimentais à API Cloudflare tornadas obsoletas pelo Wrangler e OpenNext.
- Remoção de teste órfão na raiz (test_deploy_version.py): eliminação de 111 linhas de testes isolados que cobriam exclusivamente o script de deploy legado.
- Remoção de validador pontual de migração (scripts/verify-spec-0016.mjs): eliminação de 120 linhas de script temporário de checagem editorial da Spec 0016 já consolidada.
- Preservação da suíte de testes: 100 por cento dos 859 testes Vitest mantidos em 83 suítes verdes com cobertura inalterada.
- Preservação de banco de dados: 10 migrations SQL em supabase/migrations mantidas intactas sem nenhuma linha modificada.

## How to test / verify

- Execute `pnpm check:all` e confirme a aprovação integral de typecheck, lint, formatação e testes unitários (859 testes PASS em 83 suítes, 0 segredos Gitleaks e 0 erros Semgrep).
- Execute `pnpm test:run` para validar a integridade de todas as suítes de teste de autenticação, ofertas e editorial.
- Execute `node scripts/check-decision.mjs check/0027-racionalizacao-testes-scripts/results.json --spec docs/specs/2026-10-18-1825-0027-racionalizacao-testes-scripts-dependencias.md` e confirme o veredito APROVADO emitido pela autoridade executável do projeto.

## Risk & rollout

- Risco nulo: nenhum código de aplicação ou rota em app/api foi alterado.
- Os scripts removidos não possuíam nenhuma chamada declarada em package.json, GitHub Actions ou ganchos Husky.
- Relatório de verificação empírica e revisão imparcial aprovado com 5 PASS e 0 BLOCKER (docs/reviews/2026-10-18-1920-0027-racionalizacao-testes-scripts.md).

## Notes for reviewers

- Esta limpeza cumpre integralmente os 5 critérios de aceite da Spec 0027 e prepara o repositório para a etapa final de verificação e encerramento da faxina de backend (Lote L5).
