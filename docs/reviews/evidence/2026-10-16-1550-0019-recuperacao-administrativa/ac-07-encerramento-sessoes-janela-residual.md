# Evidencia AC-07: Encerramento de sessoes ativas, janela residual e nova matricula

## Criterio de Aceite
O procedimento de contingencia registra que a exclusao administrativa do fator verificado encerra as sessoes ativas no Supabase Auth, formaliza a janela de validade residual dos tokens JWT de acesso ja emitidos (ate `jwt_expiry`) como horizonte temporal de contencao, e comprova que a proxima autenticacao bem sucedida por senha identifica ausencia de fator e direciona o administrador para `/admin-dashboard/mfa/setup` para nova matricula.

## Verificacao Empirica
O teste `e2e/recovery.spec.ts` comprovou:
1. Ao executar `node scripts/admin-reset-mfa.mjs`, o GoTrue encerra automaticamente as sessoes ativas vinculadas ao fator removido.
2. O script emite relatorio de auditoria no terminal registrando o timestamp da operacao, o ID do fator e a janela residual de tolerancia para tokens JWT de acesso preexistentes.
3. No proximo login com senha valida, o servidor identifica a ausencia de segundo fator cadastrado e redireciona obrigatoriamente para `/admin-dashboard/mfa/setup`, forcando nova matricula limpa antes de liberar o painel.

Status: PASS

