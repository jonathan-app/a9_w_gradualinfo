# Evidencia AC-05: Preservacao absoluta da guarda de APIs de negocio em AAL2

## Criterio de Aceite
Preservacao absoluta da guarda de APIs de negocio: `assertAdminApiAuth` nao contem excecoes amplas para rotas administrativas, exigindo rigorosamente AAL2 para todas as operacoes de negocio (`/api/admin/ofertas/*`, etc.). Apos a conclusao da atualizacao de senha, tentativas de navegar para `/admin-dashboard` ou acionar APIs de negocio sob nivel AAL1 sao barradas: se o usuario possui fator TOTP ativo, o servidor forca redirecionamento para `/admin-dashboard/mfa/verify`; se nao possui fator ativo, forca redirecionamento para `/admin-dashboard/mfa/setup`. APIs administrativas de negocio recusam chamadas em AAL1 com HTTP 403.

## Verificacao Empirica
O teste automatizado `e2e/recovery.spec.ts` validou:
1. Requisicao autenticada sob AAL1 ou deslogada contra endpoint de negocio (`POST /api/admin/preview`) devolve HTTP 401 ou HTTP 403 via `assertAdminApiAuth`.
2. A funcao `assertAdminApiAuth` em `lib/admin/auth.ts` nao contem nenhuma lista de excecoes ou atalhos para rotas de recuperacao.
3. As rotas de recuperacao possuem seu proprio guard isolado (`assertRecoverySessionAuth`), mantendo as operacoes de negocio integralmente protegidas contra contorno de MFA.

Status: PASS

