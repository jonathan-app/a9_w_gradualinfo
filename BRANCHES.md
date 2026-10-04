# Branches do boilerplate (organizadas por assunto)

Todas derivam de `main` (base v2.0.0). Cada branch é um Pull Request separado,
com escopo único — na ordem sugerida de merge:

| #   | Branch                                          | O que entrega                                                                                                                                                                                                                 |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `fix/ci/bugs-criticos`                          | Corrige `preinstall` (movido para `scripts`) e remove `vitest.config.ts` quebrado. **Mergear primeiro.**                                                                                                                      |
| 2   | `chore/ci/testes-completos`                     | CI com 4 jobs: quality (typecheck/lint/format/unit+JUnit), build (Next+OpenNext), security (env-leak/audit/gitleaks/semgrep), integration (Supabase local + pgTAP RLS + Playwright E2E + artefatos). Actions pinadas por SHA. |
| 3   | `chore/governance/branch-protection-codeowners` | `.github/CODEOWNERS` (você aprova tudo), template de PR, `scripts/setup-branch-protection.sh` (`pnpm protect:main`) e `docs/BRANCH_PROTECTION.md`. **Aplicar no GitHub assim que o repo existir.**                            |
| 4   | `feat/security/headers-csp-hsts`                | Headers completos no `next.config.ts`: CSP, HSTS preload, Permissions-Policy (20+ sensores off), cache por tipo de asset, `removeConsole` em prod.                                                                            |
| 5   | `feat/db/rls-funcao-segura-pgtap`               | Migration com `is_admin()` no padrão seguro (SECURITY DEFINER + `search_path=''` + REVOKE/GRANT explícito) + `supabase/tests/rls_profiles_test.sql` (pgTAP, 10 asserções).                                                    |
| 6   | `feat/seo/robots-sitemap-siteconfig`            | `app/robots.ts`, `app/sitemap.ts`, `lib/site-config.ts`.                                                                                                                                                                      |
| 7   | `feat/templates/shadcn-ui-input-skeleton`       | `components.json` (shadcn funciona) + `input`, `skeleton`, `badge`.                                                                                                                                                           |
| 8   | `chore/templates/export-template-manifest`      | `export-template.mjs` completo, `template-manifest.json`, `check-portability.mjs`.                                                                                                                                            |
| 9   | `test/qa/playwright-eslint-lighthouse`          | Playwright com reporters json+junit e timeouts; Lighthouse com `startServerCommand` (padrão Next 16); ESLint com `jsdoc` (warn) e `react/jsx-key`.                                                                            |

## Regra de merge

- `main` é protegida (ver `docs/BRANCH_PROTECTION.md`): só entra por PR, com
  sua aprovação (Code Owner) e os 4 checks da CI verdes.
- Merge na ordem da tabela (1 → 9); cada PR é atômico.
- Conflitos esperados: `package.json` (várias branches adicionam scripts) e
  `.github/workflows/ci.yml` (a branch 2 reescreve). Resolva favorecendo a
  versão mais completa.

| 10 | `audit/mcp-sdd-skills-comentarios-check` | Artefatos das 5 lentes de governança: `.agents/mcp.json` + `docs/MCP.md`, templates de `docs/{scope,specs,reviews}/_TEMPLATE.md`, `GUIA-RAPIDO-SKILLS.md` + `skills-load-config.md`, `exemplos/` + `docs/workflow/comentarios-codigo.md`. **Mergear por último** (adiciona docs que as outras branches consomem). |
