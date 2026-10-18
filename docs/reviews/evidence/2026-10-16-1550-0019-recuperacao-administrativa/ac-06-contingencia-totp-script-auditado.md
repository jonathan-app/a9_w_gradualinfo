# Evidencia AC-06: Contingencia operacional para perda de TOTP via script auditado

## Criterio de Aceite
O incidente de perda de autenticador TOTP nao possui endpoint publico ou botao na interface web comum, sendo atendido exclusivamente por script operacional auditado (`scripts/admin-reset-mfa.mjs`) que utiliza a API administrativa suportada `supabase.auth.admin.mfa.deleteFactor({ id: factorId, userId: env.adminUserId })` com confirmacao do UUID fixo do administrador antes da exclusao.

## Verificacao Empirica
O teste `e2e/recovery.spec.ts` invocou diretamente `scripts/admin-reset-mfa.mjs`:
1. O script exige como argumento o UUID do administrador e rejeita qualquer valor divergente de `env.adminUserId` com erro fatal.
2. Consulta a lista de fatores via `supabase.auth.admin.mfa.listFactors` com credencial oficial restrita ao processo local.
3. Remove o fator cadastrado utilizando `supabase.auth.admin.mfa.deleteFactor` de forma suportada e documentada.
4. Nao existe nenhum botao ou formulario na interface web para redefinir segundo fator sem intervencao privilegiada.

Status: PASS

