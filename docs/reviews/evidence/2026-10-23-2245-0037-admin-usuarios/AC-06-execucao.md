# Evidência de Execução e Conformidade: usuarios/AC-6

- **Critério:** Diálogo de confirmação aparece antes da mutação e impede envio duplicado
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 2: modal de confirmação aparece antes da requisição e mutação de rede é despachada exatamente uma vez)
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/components/admin/usuarios-form.test.tsx (modal de confirmação intercepta o submit e botão é desabilitado em trânsito prevenindo envio duplicado)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário comprova a desabilitação contra múltiplos cliques; E2E comprova a contagem única de requisição de rede.
