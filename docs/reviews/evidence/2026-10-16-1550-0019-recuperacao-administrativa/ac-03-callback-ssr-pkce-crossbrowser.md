# Evidencia AC-03: Callback SSR, troca PKCE, protecao cross-browser e uso unico

## Criterio de Aceite
A rota de callback SSR `/api/admin/auth/recovery/callback` (GET) opera sem sessao Supabase previa e sem exigir cabecalho `Origin`, validando a admissao Access na borda. Recebe o codigo temporario via query string, le o cookie do verificador PKCE gerado na solicitacao e executa a troca por sessao SSR (`exchangeCodeForSession`), gravando os cookies de sessao de recuperacao e redirecionando com status 303. Na ausencia do cookie verificador (abertura em outro navegador ou janela anonima) ou sob codigo invalido, expirado ou reutilizado, a rota rejeita a troca e redireciona de forma limpa para a tela de login (`/admin-dashboard/login?error=recovery_verifier_missing` ou `recovery_link_invalid`).

## Verificacao Empirica
O teste automatizado `e2e/recovery.spec.ts` validou em navegador real:
1. Navegacao no callback dentro do mesmo navegador: troca do codigo de autorizacao por cookies de sessao SSR (`sb-*-auth-token`) com redirecionamento HTTP 303 para o desafio TOTP ou atualizacao de senha.
2. Navegacao no link de callback a partir de outro contexto de navegador isolado (sem cookies PKCE): identificacao graciosa da ausencia do `code_verifier` e redirecionamento para `/admin-dashboard/login?error=recovery_verifier_missing` com alerta claro na tela.
3. Tentativa de reutilizacao do mesmo link de callback ja consumido: rejeicao imediata pelo GoTrue e redirecionamento para a tela de login com indicativo de link invalido ou expirado.

Status: PASS

