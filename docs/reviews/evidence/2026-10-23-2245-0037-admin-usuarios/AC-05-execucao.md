# Evidência de Execução e Conformidade: usuarios/AC-5

- **Critério:** Revogação remove o papel administrativo inteiro, mantendo a conta
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 2: DELETE /api/admin/usuarios/papeis/[userId] revoga o papel e atualiza a tabela)
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/app/api/admin/usuarios/papeis-delete.test.ts (DELETE revoga em admin_user_roles, preserva auth.users; recusa conta raiz com 409)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário valida que o registro em auth.users permanece intacto; E2E valida a revogação real no banco via UI.
