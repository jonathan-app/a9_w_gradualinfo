# Evidência de Execução e Conformidade: usuarios/AC-1

- **Critério:** Apenas usuários com papel admin e MFA AAL2, admitidos pelo Access, acessam a página
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 1: login com senha real, matrícula TOTP, alcance de AAL2 e admissão por cookie de Access no Worker)
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/lib/admin/auth.test.ts (checkAdminUser valida identidade via auth.getUser(), roleSatisfies(role, admin) e escada MFA)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: E2E prova login real + AAL2 + Access no Worker; teste unitário prova a guarda estrita no servidor.
