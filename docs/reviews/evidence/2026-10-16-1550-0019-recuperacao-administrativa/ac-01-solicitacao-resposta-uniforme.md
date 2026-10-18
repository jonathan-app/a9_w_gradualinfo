# Evidencia AC-01: Solicitacao de recuperacao com resposta uniforme e propagacao PKCE

## Criterio de Aceite
A solicitacao de redefinicao de senha em `/api/admin/auth/recovery` opera sem sessao Supabase previa sob admissao de borda Cloudflare Access, aplica rate limit dedicado e validacao estrita de origem (`validateAdminRequestOrigin`), emitindo chamada nativa `supabase.auth.resetPasswordForEmail(email, { redirectTo })` com `redirectTo` apontando estritamente para o callback autorizado `/api/admin/auth/recovery/callback`. A resposta repassa os headers de cookie do cliente Supabase (`setAll`) contendo o verificador PKCE (`code_verifier`) para o navegador e devolve status HTTP 200 com mensagem uniforme de sucesso para e-mails autorizados ou nao autorizados, prevenindo enumeracao de contas.

## Verificacao Empirica
O teste no navegador real Chromium via Playwright (`e2e/recovery.spec.ts`) acessou `/admin-dashboard/recovery/request` e enviou a solicitacao para o email administrativo oficial sob o Cloudflare Worker local.

Comprovou se:
1. Resposta HTTP 200 uniforme exibindo a confirmacao de instrucoes enviadas sem revelar se o email existe na base.
2. Gravacao imediata do cookie `sb-*-code-verifier` pelo adaptador SSR no navegador do operador.
3. Disparo da mensagem pelo GoTrue para a caixa de correio local no Mailpit (`127.0.0.1:54324`) contendo a URL de verificacao com token temporario.
4. Bloqueio com HTTP 403 quando o cabecalho `Origin` for divergente ou malicioso.

Status: PASS

