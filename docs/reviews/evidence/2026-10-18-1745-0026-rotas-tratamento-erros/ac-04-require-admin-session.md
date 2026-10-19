# Evidência de verificação route-clean/AC-04

- Critério: Reutilização centralizada de requireAdminSession() de lib/admin/auth.ts nos endpoints de app/api/admin/ que realizam checagem manual de autenticação e MFA AAL2, eliminando duplicações de lógica de sessão e garantindo resposta 401/403 uniforme.
- Spec de referência: docs/specs/2026-10-18-1725-0026-rotas-tratamento-erros.md
- Commit avaliado: bcdccfbb7914f6ced419397fdef216d580493f15
- Execução: 2026-10-18

## 1. Implementação e centralização da guarda de sessão

No módulo lib/admin/auth.ts:
- Disponibilizada a exportação requireAdminSession como alias de assertAdminApiAuth.
- Ambas as funções avaliam cumulativamente a barreira de admissão Cloudflare Access, a validação de origem CSRF, a identidade do administrador único pelo UUID fixo (env.adminUserId) e o nível de segurança MFA AAL2.
- Respostas padronizadas com 401 para não autenticado e 403 para não autorizado ou MFA pendente.

## 2. Adoção nas rotas administrativas

Todas as rotas sob app/api/admin/ utilizam a guarda centralizada:
- app/api/admin/preview/route.ts
- app/api/admin/evidencias/[hash]/route.ts
- app/api/admin/dashboard/rotinas/refresh-health/route.ts
- app/api/admin/dashboard/health/route.ts
- app/api/admin/ofertas/[id]/avaliar-selo/route.ts

## 3. Comprovação na suíte de testes

Testes unitários em __tests__/unit/admin-auth.test.ts e __tests__/unit/admin-session-response.test.ts validam o comportamento da barreira de autenticação com 100% de aprovação.

Veredito: PASS
