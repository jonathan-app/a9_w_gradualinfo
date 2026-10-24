# Evidência de Execução e Conformidade: usuarios/AC-7

- **Critério:** Modal pode ser fechado por Escape sem disparar requisição
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 2: tecla Escape fecha o diálogo e lista de mutações não incrementa) e e2e/usuarios-journey.spec.ts
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/components/admin/usuarios-form.test.tsx (pressionamento de Escape desmonta o modal sem invocar mutation)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário testa o listener de teclado; E2E comprova que nenhuma requisição HTTP sai pelo navegador.
