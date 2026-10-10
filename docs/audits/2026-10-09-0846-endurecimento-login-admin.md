# Auditoria corretiva do login administrativo

Fonte canônica desta rodada: [diagnóstico e evidências locais](../../check/admin-hardening/2026-10-09-0842/DEBUG.md).

Os cinco P0 foram reproduzidos em um harness em processo. Identidade, origem e propagação dos cookies foram corrigidas localmente. 103 testes direcionados passaram, incluindo 10 regressões novas e testes de leitura pública e preview; typecheck e lint passaram.

Rate limiting distribuído e matrícula inicial continuam abertos. O proprietário aprovou Durable Object dedicado, mas seus parâmetros e o fluxo de matrícula/recuperação precisam de contrato completo. O [rascunho complementar](../specs/2026-10-09-0842-endurecimento-auth-admin.md) registra a decisão parcial e as lacunas; permanece Proposed.

A execução local com mocks não prova Supabase Cloud, Worker, HTTP recebido pela rede nem ausência de exposição em telemetria. Sem nova execução de E2E, RLS, Semgrep, gitleaks, build OpenNext, dry-run ou deploy. PR #24 em rascunho; merge e publicação não autorizados.
