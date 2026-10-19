# Evidência de verificação route-clean/AC-05

- Critério: Preservação total de compatibilidade de contratos existentes, sem quebra nos testes de ingestão HMAC, auditoria WORM probatória, dashboard operacional e rotas públicas de busca e artigos, com aprovação integral em pnpm check:all.
- Spec de referência: docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md
- Commit avaliado: bcdccfbb7914f6ced419397fdef216d580493f15
- Execução: 2026-10-18

## 1. Execução do portão pnpm check:all

Execução do comando:
pnpm check:all

Etapas validadas:
1. Typecheck: tsc --noEmit concluiu sem nenhum erro de tipagem.
2. Lint: eslint . concluiu sem nenhum aviso ou violação.
3. Formatação: prettier --check . aprovou 100% dos arquivos do repositório.
4. Testes automatizados: vitest run executou 83 suítes e 859 testes, obtendo 859 testes aprovados (100% PASS).
5. Segurança de segredos: node scripts/run-gitleaks.mjs encontrou 0 segredos no histórico e na árvore de trabalho.
6. Segurança estática (SAST): node scripts/run-semgrep.mjs com security/semgrep.yml reportou 0 achados de severidade ERROR.

Veredito: PASS
