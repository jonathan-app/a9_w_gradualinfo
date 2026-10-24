# Evidência de Execução e Conformidade: usuarios/AC-10

- **Critério:** Negar acesso a usuários editor, revisor ou MFA nível AAL1
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 3: operador com papel editor e depois revisor com AAL2 comprovado recebem tela 403 na UI e status HTTP 403 na API)
- **Comprovação Unitária / Componente (Vitest):** __tests__/unit/lib/admin/auth.test.ts (checkAdminUser retorna mfa_challenge_required quando a sessão está em AAL1 e nega papéis insuficientes)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: unitário comprova a recusa de AAL1; E2E comprova a recusa de editor e revisor na UI (tela 403) e na API (HTTP 403).
