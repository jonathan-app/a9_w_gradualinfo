# Evidência de Execução e Conformidade: usuarios/AC-8

- **Critério:** Ao fechar modal, foco retorna ao elemento que o abriu
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 2: após fechar modal por Escape, expect(revokeButton).toBeFocused()) e e2e/usuarios-journey.spec.ts
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/components/admin/usuarios-form.test.tsx (returnFocusRef restaura o foco ao elemento ativo anterior)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário e E2E validam a restauração do foco com foco acessível ativo no DOM.
