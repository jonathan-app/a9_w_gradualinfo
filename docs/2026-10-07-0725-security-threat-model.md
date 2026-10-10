# Segurança — baseline e threat model

> Este arquivo registra a linha de base de segurança do projeto e o threat
> model inicial. Ele é vivo: mudanças de arquitetura ou produto devem
> atualizá-lo.

## Documentos relacionados

- `docs/2026-10-07-0725-security-authorization-matrix.md` — papéis, claims e permissões.
- `docs/2026-10-07-0725-security-secrets-policy.md` — política de segredos.
- `docs/2026-10-07-0725-security-backup-restore.md` — política de backup e restore.

## Baseline atual

- **Autenticação/autorização**: Supabase Auth + RLS em `posts` e `profiles`.
- **Sessão**: cookie `HttpOnly` + `SameSite=Lax` + `Secure` em produção.
- **Headers**: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`, `Content-Security-Policy`, `Strict-Transport-Security`
  (produção).
- **Secrets**: `gitleaks` no histórico + `pnpm audit` + OSV.
- **Dados**: RLS como autoridade de leitura/escrita; `service_role` isolado ao servidor.
- **Preview**: token próprio (`SUPABASE_PREVIEW_TOKEN`), identidade dedicada, falha fechada.
- **Rate limiting**: 20 req/min por IP na rota de preview.
- **Auditoria**: eventos de login/logout de preview registrados via `lib/audit.ts`.

## Threat model (inicial)

| Ameaça                                | Mitigação                                                           | Status |
| ------------------------------------- | ------------------------------------------------------------------- | ------ |
| Vazamento de segredo em repositório   | `gitleaks` + `.gitignore` + política de segredo                     | ✅     |
| Acesso indevido a rascunho            | RLS + preview token + identidade dedicada                           | ✅     |
| Clickjacking                          | `X-Frame-Options: DENY`                                             | ✅     |
| MIME sniffing                         | `X-Content-Type-Options: nosniff`                                   | ✅     |
| Exposição de dados sensíveis em cache | `no-store` em preview + headers                                     | ✅     |
| Força bruta em preview                | token de alta entropia + comparação em tempo constante + rate limit | ✅     |
| SSRF via fetch/agente                 | `fetch` restrito a URLs públicas; MCPs de engenharia only           | ⚠️     |
| Injeção via markdown                  | ReactMarkdown (sem `dangerouslySetInnerHTML`)                       | ✅     |
| Dependências vulneráveis              | `pnpm audit` + OSV na CI                                            | ✅     |
| Acesso não autorizado a API/admin     | Sem painel admin no MVP; RLS cobre leitura/escrita                  | ✅     |
| Transporte não seguro                 | HSTS em produção                                                    | ✅     |
| CSP ausente                           | CSP adicionada em `next.config.ts`                                  | ✅     |

## Itens pendentes

- Threat model revisado com produto (cenários de abuso, dados sensíveis).
- Matriz de autorização validada por time de produto.
- Runbook de logging/auditoria (onde armazenar, retenção, alertas).
- Testes de backup/restore trimestrais.

## Referências

- OWASP ASVS (checklist de verificação).
- `docs/reviews/2026-10-05-1905-2026-10-05-check-verify-md-0001.md`
- `docs/reviews/2026-10-06-1748-2026-10-06-check-verify-md0002-tarefa5.md`
