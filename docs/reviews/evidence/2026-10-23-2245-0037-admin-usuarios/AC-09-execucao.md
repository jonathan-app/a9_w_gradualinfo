# Evidência de Execução e Conformidade: usuarios/AC-9

- **Critério:** Tratamento adequado de erros 400, 401, 403, 404, 409, 500 e 503 com mensagens claras
- **Comprovação E2E (Worker Local):** e2e/0037-admin-usuarios.spec.ts (cenário 5: 409 root_admin_immutable na API) e recusa 403 para editor/revisor
- **Comprovação Unitária / Componente (Vitest):**
  - **400:** `__tests__/unit/app/api/admin/usuarios/papeis-list.test.ts` (parâmetros/limites), `papeis.test.ts` (body/UUID/papel inválidos) e `papeis-delete.test.ts` (UUID inválido)
  - **401:** `__tests__/unit/lib/admin/auth.test.ts` (caso: `assertAdminApiAuth > retorna 401 quando nao autenticado` para `/api/admin/usuarios/papeis`)
  - **403:** `__tests__/unit/lib/admin/auth.test.ts` (papel insuficiente), `papeis-list.test.ts` e `papeis.test.ts` (guarda negada)
  - **404:** `__tests__/unit/app/api/admin/usuarios/papeis.test.ts` (`retorna 404 quando usuário não existe`) e `papeis-delete.test.ts` (`retorna 404 quando papel não existe`)
  - **409:** `__tests__/unit/app/api/admin/usuarios/papeis.test.ts` e `papeis-delete.test.ts` (tentativa contra conta raiz `root_admin_immutable`)
  - **500:** `__tests__/unit/app/api/admin/usuarios/papeis.test.ts` (caso: `retorna 500 quando a atribuição falha com erro inesperado` -> `role_assignment_failed`) e `__tests__/unit/lib/admin/auth.test.ts` (caso: `retorna 500 quando configuracao administrativa esta ausente`)
  - **503:** `__tests__/unit/app/api/admin/usuarios/papeis-list.test.ts` (`retorna 503 sanitizado quando a RPC de listagem falha`) e `__tests__/unit/lib/admin/auth.test.ts` (`retorna 503 quando servico de papel indisponivel`)
  - **UI / Página:** `__tests__/unit/app/admin-dashboard/(protegido)/usuarios/page.test.tsx` (caso: `usuarios/AC-9: falha da leitura lança erro com mensagem clara`)
- **Log Sanitizado Vinculado:** `docs/reviews/evidence/2026-10-23-2245-0037-admin-usuarios/logs/e2e-0037-admin-usuarios.log`
- **Hash SHA-256 do Log:** `2ac448dc7152fc40216ea3f5c40e38e72dca1505721e1d1a37b3aa5db0afae6d`
- **Nota Técnica:** Comprovado conjuntamente: a matriz completa de status HTTP (400, 401, 403, 404, 409, 500 e 503) e tratamento amigável de erro na UI são sustentados por casos de testes unitários existentes e aprovados; E2E comprova 403 e 409 em tempo de execução real no Worker.

