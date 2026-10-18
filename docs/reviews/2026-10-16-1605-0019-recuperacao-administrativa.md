# /check verify & review: Procedimento Controlado de Recuperação Administrativa (Spec 0019)

**Data**: 2026-10-16 16:05 (America/Sao_Paulo)
**Spec**: `docs/specs/2026-10-16-1115-0019-recuperacao-administrativa.md`
**Veredito**: **APROVADO** (exit 0, autoridade `scripts/check-decision.mjs`)

## Resumo

| Métrica      | Valor |
| ------------ | ----- |
| ACs totais   | 9     |
| PASS         | 9     |
| FAIL         | 0     |
| UNVERIFIABLE | 0     |
| BLOCKER      | 0     |
| WARNING      | 0     |

## Metadados de Avaliação

- **Commit avaliado**: `b14dd5191590f0df3b9bd3835ca13f646d09d14f`
- **Árvore avaliada**: `ee6669d1fd859e281be1c6f09050d5295caa9e8a`
- **Hash SHA-256 da Spec**: `4257b82632f155a2ba3b39d97d38fcb5e0fc7fccb1029739d137d59f9982367d`
- **Ambiente de teste**: Instância local isolada do Supabase (`127.0.0.1:54321`), Mailpit (`127.0.0.1:54324`) e Cloudflare Worker local via Miniflare/Wrangler (`scripts/cloudflare-worker.ts` na porta 3101 e proxy de teste na porta 3100).
- **Ressalva de produção**: Produção não foi alterada; configuração e implantação remotas não foram validadas.

## Manifesto SHA-256 dos Arquivos Finais Testados

| Arquivo                                                 | Hash SHA-256                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `scripts/cloudflare-worker.ts`                          | `9f82b7ecc28b7b1cb2384838ff7bb620e38da9a374540b259cc8ce26f5bf2ff9` |
| `lib/admin/access.ts`                                   | `e4c0aea2cad92e40441529610ae2d61405ae12bbc01f863000761de5ec8b6a9d` |
| `lib/admin/access-worker.ts`                            | `96d7139df84803bf41d360f1755e001a1d2ea19d9561f2b6159084d41dd1371a` |
| `lib/admin/auth.ts`                                     | `1a933c7a121fd7f6095d4cdf6040cc5442753f0ee4ce11d7a10314e6017a8679` |
| `app/admin-dashboard/recovery/request/page.tsx`         | `cd90ec92df940f3bce568f91d315eb9cfd22b6f3fa44bbb67bcf7c71b2ed5b3c` |
| `app/admin-dashboard/recovery/update-password/page.tsx` | `ebe5e942259b85773635cba62e66ce96f017b93528eda0e4fc90f83460669a60` |
| `app/api/admin/auth/recovery/route.ts`                  | `bde1e932b5151319efb8eb9fea2c2fc782f3244906e03d38dcd419c9e56a676b` |
| `app/api/admin/auth/recovery/callback/route.ts`         | `10a93558929f953e05c0eabcd34b5a308cfcdf0554fd224f0192095656888ae5` |
| `app/api/admin/auth/recovery/update-password/route.ts`  | `6b5121299136d3549b14c82e656e976b1a2e62c5f09342091923114f8f7a2874` |
| `app/api/admin/auth/login/route.ts`                     | `7e51a6fb5a2a75d185fe0085dd69cc70eaa34e05359903e627a3d1f5a8e6096a` |
| `app/api/admin/auth/logout/route.ts`                    | `3ed6713ed17e781a501f320166d1a5a1c9927e6cc12543a51ac62d25454e1b62` |
| `app/api/admin/auth/mfa/verify/route.ts`                | `18099d9e2ea7374b0c1ee0a1c4a1fa5ed2b0793a5367c0ed4968ae843a60a0c6` |
| `app/api/admin/auth/mfa/enroll/route.ts`                | `15e7dd6c685c6a8e3724c2312676cf7fb2341cadb36ff8da6f7c1c2903bb9124` |
| `scripts/admin-reset-mfa.mjs`                           | `b30e1c1736791b82dde86f05ed7cc9e23aae69bf8fbf6c71a94450859c310f32` |
| `supabase/config.toml`                                  | `1512503fa46138e9a0dc0ea6d8f4d03ec4e914ed080ff048e7de4f34c5778fa2` |
| `e2e/recovery.spec.ts`                                  | `c3cc3aad044b85ef26e3d1f77f9b06bc9374f32f40dc4ec32992d3c32cbe1fe8` |
| `e2e/admin-dashboard.spec.ts`                           | `a982c76a59f8c15ade41ce57ebd2499c5e60f768deb9585b78a8f8a52378fc26` |
| `__tests__/integration/spec-0019-recovery.test.ts`      | `d253347f1a18e3f271568462b92ee08dc7e56de15859df7f1825ab412fcbce63` |
| `__tests__/integration/spec-0018-real-auth.test.ts`     | `476d6fd6179ebc8fac73ff3001794de8376fdf856d57fc4cc8f98a9751b6bd7d` |

## Critérios de Aceite

### admin-recovery/AC-01: Solicitação com resposta uniforme e propagação PKCE

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-01-solicitacao-resposta-uniforme.md`
**Hash SHA-256**: `ac34a2554cd3bb315f45669077053cff69fcce3913da170763306d78576e6104`

**Nota**: A solicitação em `/api/admin/auth/recovery` opera sem sessão prévia sob a proteção de borda do Cloudflare Access. Aplica rate limit dedicado e validação de origem via `validateAdminRequestOrigin`. Emite chamada nativa para `supabase.auth.resetPasswordForEmail` direcionando para `/api/admin/auth/recovery/callback`. Os cabeçalhos de resposta repassam os cookies gerados pelo SDK SSR contendo o `code_verifier` PKCE para o navegador e devolvem status HTTP 200 com mensagem uniforme tanto para e-mails conhecidos quanto para e-mails não cadastrados.

### admin-recovery/AC-02: Expiração de 15 minutos configurada no GoTrue

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-02-expiracao-otp-15-minutos.md`
**Hash SHA-256**: `bdf7e2496464a5578a0fef381954661a1d517782ab2506782d48aa6c536cf916`

**Nota**: Configuração formalizada em `supabase/config.toml` sob `[auth.email]` com `otp_expiry = 900` segundos. Comprovada a rejeição pelo GoTrue de tokens expirados ou forjados com redirecionamento de erro sanitizado.

### admin-recovery/AC-03: Callback SSR, troca PKCE, proteção cross-browser e uso único

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-03-callback-ssr-pkce-crossbrowser.md`
**Hash SHA-256**: `0ccce5ac3791c37f4cac7f52e7601aa2c1bd8c34cbe9f827850f80a908efde57`

**Nota**: Rota GET em `/api/admin/auth/recovery/callback` opera sem sessão prévia e sem exigência de cabeçalho Origin. Efetua a troca do código temporário por sessão SSR via `exchangeCodeForSession`. Ao abrir o link em navegador distinto sem o cookie do verificador PKCE, redireciona para login com o erro `recovery_verifier_missing`. Tentativa de reutilizar link já consumido falha com erro de link inválido ou expirado.

### admin-recovery/AC-04: Atualização de senha e ramificação com TOTP ativo

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-04-atualizacao-senha-totp-ativo.md`
**Hash SHA-256**: `de2448d03f57fd1332e7d95a7609a5c9e1d8b8ac7023c551a9b1397e134c6f0c`

**Nota**: O endpoint `/api/admin/auth/recovery/update-password` valida a origem da requisição, rate limit e verifica a identidade do administrador único sob o guard dedicado `assertRecoverySessionAuth`. Confirmado contra o GoTrue local v2.197.0 que a existência de fator TOTP ativo exige cumprimento prévio do desafio de segundo fator antes da troca da credencial. Após a atualização, login com a senha antiga é rejeitado e login com a nova senha tem sucesso.

### admin-recovery/AC-05: Preservação absoluta da guarda de APIs de negócio em AAL2

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-05-preservacao-guarda-negocio-aal2.md`
**Hash SHA-256**: `3b0f7557b30ebd28dc2ab730829170730701a5b7360e25cb56e724673eb4e6e1`

**Nota**: A guarda `assertAdminApiAuth` permanece dedicada exclusivamente a exigir o nível AAL2 nas APIs de negócio, sem exceções amplas. Chamadas em AAL1 ou sem autenticação recebem HTTP 401 ou HTTP 403. Tentativas de acessar o painel administrativo sob sessão AAL1 forçam redirecionamento para o desafio TOTP.

### admin-recovery/AC-06: Contingência operacional para perda de TOTP via script auditado

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-06-contingencia-totp-script-auditado.md`
**Hash SHA-256**: `146498e3a7c56e0c351a3461ffdcc5f297444c82d7a97832646020bd173153bb`

**Nota**: O script `scripts/admin-reset-mfa.mjs` utiliza a API administrativa suportada `supabase.auth.admin.mfa.deleteFactor`, exigindo obrigatoriamente a conferência do UUID fixo do administrador alvo antes de remover o fator. Inexistência de botões ou rotas públicas na interface web para bypass de segundo fator.

### admin-recovery/AC-07: Encerramento de sessões ativas, janela residual e nova matrícula

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-07-encerramento-sessoes-janela-residual.md`
**Hash SHA-256**: `b4723ec5633b6284db87f2fab446df1a18e61db284575bb37caf544048710fb0`

**Nota**: A exclusão do fator verificado via API administrativa encerra imediatamente as sessões ativas no GoTrue. O procedimento formaliza o horizonte temporal de contenção baseado na validade residual dos tokens JWT previamente emitidos. O próximo login por senha detecta ausência de segundo fator e redireciona compulsoriamente para nova matrícula em `/admin-dashboard/mfa/setup`.

### admin-recovery/AC-08: Higiene absoluta de evidências e respostas fail-closed

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-08-higiene-absoluta-evidencias.md`
**Hash SHA-256**: `a8fff427cd1871d15c12ddbcdfabe123b19344c0f55434ed8bc554b4134dd09f`

**Nota**: Nenhum segredo TOTP, senha em texto plano, token JWT de acesso ou link com código temporário foi gravado em logs, artefatos ou histórico. Respostas de indisponibilidade respondem fail closed com HTTP 503 sanitizado. Ferramenta Gitleaks executa com status limpo.

### admin-recovery/AC-09: Isolamento de guards e permissionamento por etapa

**Status**: PASS

**Evidência**: `docs/reviews/evidence/2026-10-16-1550-0019-recuperacao-administrativa/ac-09-isolamento-guards-por-etapa.md`
**Hash SHA-256**: `0ae53819d038fe2546460702c23b280645bc417ad3f9561f6867c2972447bbf5`

**Nota**: O fluxo de recuperação opera sob escada granular própria. A solicitação e o callback não exigem sessão e não chamam `assertAdminApiAuth`. A atualização de senha emprega o guard dedicado `assertRecoverySessionAuth`, garantindo que o ato de redefinir a senha não seja bloqueado indevidamente pela exigência de segundo fator das APIs de negócio, preservando o isolamento de cada estágio.

## Conclusão do Gate

A suíte Playwright executou com sucesso (4/4 testes na suíte `e2e/recovery.spec.ts` e 3/3 testes na regressão `e2e/admin-dashboard.spec.ts`), a suíte unitária e de integração no Vitest registrou 753 testes aprovados em 71 arquivos, a tipagem e o linter passaram com zero erros e a ferramenta `scripts/check-decision.mjs` emitiu o veredito oficial **APROVADO** com 9 de 9 critérios satisfeitos.
