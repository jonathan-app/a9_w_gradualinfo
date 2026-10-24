# Evidência de Execução e Conformidade: usuarios/AC-2

- **Critério:** Paginação padrão 20 itens, limite máximo 50
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 4: navegação com limit=1 de página 1 -> 2 -> 1 com preservação de estado da tabela)
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/app/api/admin/usuarios/papeis-list.test.ts (defaults page=1 e limit=20; recusa de limit > 50 com HTTP 400)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário testa rigorosamente os limites padrão (20) e teto (50); E2E comprova a navegação real entre páginas no navegador.
