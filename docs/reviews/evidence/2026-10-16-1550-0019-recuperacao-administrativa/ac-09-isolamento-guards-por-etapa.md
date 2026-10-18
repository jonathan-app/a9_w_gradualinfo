# Evidencia AC-09: Isolamento de guards e permissionamento por etapa

## Criterio de Aceite
O fluxo de recuperação opera sob uma permissão de escada separada da sessão de trabalho diário: a solicitação (`POST /api/admin/auth/recovery`) e o callback (`GET /api/admin/auth/recovery/callback`) não exigem sessão Supabase prévia e não dependem de `assertAdminApiAuth`, que permanece restrito a AAL2 para operações de negócio. A atualização de senha (`POST /api/admin/auth/recovery/update-password`) utiliza o guard dedicado `assertRecoverySessionAuth` — nunca `assertAdminApiAuth` — de modo que o ato de redefinir a credencial primária não seja barrado pela exigência de AAL2 das APIs de negócio, preservando o princípio de que cada etapa do fluxo de recuperação possui seu próprio permissionamento e que nenhuma etapa contorna o segundo fator para acessar o painel.

## Verificacao Empirica
1. `app/api/admin/auth/recovery/route.ts` protege a mutacao atraves de `guardAdminAccess`, `validateAdminRequestOrigin` e `consumeAdminRateLimit`, sem chamar `assertAdminApiAuth`.
2. `app/api/admin/auth/recovery/callback/route.ts` opera como rota publica protegida por `guardAdminAccess` na borda, consumindo o cookie PKCE sem exigir sessao previa.
3. `app/api/admin/auth/recovery/update-password/route.ts` emprega exclusivamente o guard dedicado `assertRecoverySessionAuth`, garantindo que o operador consiga trocar a senha apos superar o desafio exigido pelo GoTrue sem colidir com a guarda AAL2 de negocio.
4. As rotas de negocio continuam governadas por `assertAdminApiAuth` sem alteracao de seus requisitos de seguranca.

Status: PASS

