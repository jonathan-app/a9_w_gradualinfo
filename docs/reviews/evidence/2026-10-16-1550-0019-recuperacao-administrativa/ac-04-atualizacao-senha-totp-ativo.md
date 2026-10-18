# Evidencia AC-04: Atualizacao de senha e ramificacao com TOTP ativo

## Criterio de Aceite
O endpoint `/api/admin/auth/recovery/update-password` valida a origem da requisicao (POST), o rate limit e confere que a sessao ativa pertence estritamente ao administrador unico (`user.id === env.adminUserId`) atraves de guard dedicado de rota (`assertRecoverySessionAuth`), preservando `assertAdminApiAuth` restrito a AAL2 para operacoes de negocio. O endpoint testa a exigencia do GoTrue: se o usuario possui fator TOTP ativo e o GoTrue exigir AAL2 para atualizar a senha, o fluxo conduz primeiro ao desafio TOTP `/admin-dashboard/mfa/verify` antes de invocar `supabase.auth.updateUser({ password })`.

## Verificacao Empirica
O teste `e2e/recovery.spec.ts` comprovou contra o GoTrue local v2.197.0:
1. Quando o usuario possui fator TOTP verificado ativo, a atualizacao de senha requer elevacao previa da sessao para o segundo fator.
2. O callback SSR direciona o operador primeiramente ao desafio em `/admin-dashboard/mfa/verify?redirectTo=/admin-dashboard/recovery/update-password`.
3. Apos a digitacao do codigo de 6 digitos do autenticador, o operador alcanca a tela `/admin-dashboard/recovery/update-password` sob nivel AAL2.
4. A nova senha e gravada com sucesso via `updateUser({ password })` e o login subsequente aceita a nova senha enquanto rejeita terminantemente a antiga credencial.

Status: PASS

