# Evidência de Execução e Conformidade: usuarios/AC-3

- **Critério:** Listagem exibe UUID, email, papel único e data de atribuição
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 2: tabela renderizada no navegador com linhas de operadores reais do seed)
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/components/admin/usuarios-table.test.tsx (tabela exibe UUID, email, badge semântico de papel e data formatada; raiz destacada sem controles de mutação)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário valida a presença das colunas e destaque da raiz; E2E comprova renderização sob o runtime real do Worker.
