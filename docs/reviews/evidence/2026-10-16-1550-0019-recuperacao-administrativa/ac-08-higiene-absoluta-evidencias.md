# Evidencia AC-08: Higiene absoluta de evidencias e respostas fail-closed

## Criterio de Aceite
A suite de testes e o script operacional executam o ciclo completo em ambiente local isolado e registram evidencias auditaveis sem jamais incluir senhas em texto plano, tokens de sessao, links de recuperacao com hash/code ou segredos TOTP nos logs de teste, relatorios ou artefatos de review. Sob indisponibilidade do Auth, respostas de erro respondem fail closed com HTTP 503 sanitizado.

## Verificacao Empirica
1. Verificacao de segredos: nenhum log do Worker, saida do Playwright ou arquivo de evidencia contem senhas em texto plano, chaves TOTP em base32, tokens JWT de autorizacao ou URLs de callback completas com codigos de recuperacao.
2. Comportamento fail closed: sob falha de conexao com o Supabase ou erro interno do servidor, o endpoint responde com status 503 e corpo sanitizado "Serviço de autenticação temporariamente indisponível.", impedindo exposicao de stack trace ou dados de infraestrutura.
3. A ferramenta Gitleaks (`pnpm security:secrets`) executa sobre o repositorio sem identificar credenciais ou segredos expostos.

Status: PASS

