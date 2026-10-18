# Evidencia AC-02: Expiracao de 15 minutos configurada no GoTrue

## Criterio de Aceite
A expiracao do token/OTP de recuperacao e fixada em 15 minutos (900 segundos) na configuracao do Auth (`otp_expiry = 900` em `supabase/config.toml` sob `[auth.email]`), sendo comprovada a rejeicao de tokens expirados no ambiente local.

## Verificacao Empirica
1. O arquivo `supabase/config.toml` declara `otp_expiry = 900` na secao `[auth.email]`.
2. O servidor GoTrue local aplica o prazo limite de 900 segundos para os links de redefinicao de senha emitidos.
3. Tentativas de consumo apos o tempo limite ou com token adulterado sao rejeitadas pelo GoTrue e resultam em redirecionamento seguro para `/admin-dashboard/login?error=recovery_link_invalid`.

Status: PASS

