---
name: privacy-lgpd
description: Inventário LGPD, bases legais, cookies/analytics, retenção vs audit WORM e textos mínimos de privacidade para o portal GradualInfo (Brasil).
license: MIT
compatibility: opencode
metadata:
  project: gradualinfo
  phase: agency-10
  jurisdiction: BR
---

## Quando usar

Preparar conformidade mínima de produto público no Brasil: inventário de dados, cookies (GA/GTM), papéis admin, logs de auditoria e conflito retenção vs exclusão. Não é aconselhamento jurídico vinculante — entregar artefatos para revisão humana.

## Dados típicos a inventariar

| Área | Exemplos | Onde no repo |
|------|----------|--------------|
| Conta admin | e-mail, user id, MFA, papéis | Supabase auth, `admin_user_roles` |
| Auditoria | `admin_audit_log` WORM | migrations admin RBAC |
| Preview | tokens, e-mail/user de preview | env + Durable Object |
| Analytics | GA/GTM IDs públicos | `NEXT_PUBLIC_GA_*`, `NEXT_PUBLIC_GTM_*` |
| Editorial | conteúdo Sanity (em geral não pessoal) | `lib/sanity` |
| Ofertas/evidências | hashes, metadados de prova | `lib/offers`, storage |

## Entregáveis

1. Tabela de inventário (dado, finalidade, base legal sugerida, retenção, subprocessador).
2. Decisão de cookies: estritamente necessários vs analytics; se analytics não essenciais, banner/consentimento real.
3. Nota sobre WORM de audit log vs direitos do titular (minimização, acesso, política de retenção).
4. Esboço de textos: Política de Privacidade e, se couber, Termos — em pt-BR, para revisão jurídica.
5. Lista de subprocessadores: Supabase, Cloudflare, Sanity, Sentry, Google (se GA/GTM).

## Passos

1. Grep por `NEXT_PUBLIC_GA`, `GTM`, Sentry, cookies, `admin_audit`.
2. Ler migrations de RBAC/audit e fluxos de recovery/MFA.
3. Não implementar banner de cookies sem alinhamento de produto; propor design mínimo.
4. Documentar em `docs/operations/` ou path que o usuário indicar.
5. Destacar decisões que exigem advogado (base legal final, DPA).

## Restrições

- Não afirmar "estamos conformes com a LGPD".
- Não apagar audit WORM sem decisão explícita de produto/jurídico.
- Não coletar dado novo "por precaução".

## Critério de pronto

- Inventário preenchido e subprocessadores listados.
- Lacunas e riscos explícitos.
- Próximos passos acionáveis (engenharia vs jurídico) separados.