# Evidência de Execução e Conformidade: usuarios/AC-4

- **Critério:** Formulário aceita UUID arbitrário, permitindo atribuir papel a conta inexistente na listagem
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 2: input de UUID preenchido com UUID delegado e POST atribui com sucesso)
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/components/admin/usuarios-form.test.tsx (campo UUID aceita texto livre e dispara requisição POST com payload { userId, role })
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário valida o disparo do payload; E2E valida a integração ponta a ponta com o backend real.
