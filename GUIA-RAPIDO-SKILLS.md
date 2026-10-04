# Guia Rápido: quando usar cada skill do fluxo SDD

> Referência rápida para não adivinhar qual skill invocar. O ciclo canônico:
> `/scope → /architect → /develop → /check → /test → /document → /sync`, com
> `/debug` fora da sequência quando algo quebra.

## Fluxo normal (feature nova)

```
1. /scope     → "Quero adicionar X. Planeje o escopo e a ordem."
2. /architect → "Especifique X com Critérios de Aceite (docs/specs/)."
3. /develop   → "Implemente X seguindo a spec NNNN. Não saia da spec."
4. /check     → "Valide X (verify) e revise o diff (review) antes do merge."
5. /test      → "Crie testes unitários e E2E para X."
6. /document  → "Gere a descrição do PR e changelog."
7. /sync      → "Atualize AGENTS.md, specs e workflow/STATE.md após o merge."
```

## Quando invocar cada uma (prompt de exemplo)

| Skill        | Quando                  | Exemplo de prompt                                                       |
| ------------ | ----------------------- | ----------------------------------------------------------------------- |
| `/scope`     | Nova feature/produto    | "Use /scope: quero um sistema de perfis. Defina MVP e o que fica fora." |
| `/audit`     | Mapear o projeto        | "Use /audit: mapeie o repo e atualize o AGENTS.md."                     |
| `/architect` | Decidir arquitetura     | "Use /architect: crie a spec 0001 para login com MFA."                  |
| `/develop`   | Escrever código         | "Use /develop: implemente seguindo a spec 0001."                        |
| `/check`     | Validar antes do merge  | "Use /check: valide a spec 0001. Modo verify + review."                 |
| `/test`      | Criar testes            | "Use /test: cubra a spec 0001 com unit + E2E."                          |
| `/document`  | PR/changelog            | "Use /document: gere a descrição do PR a partir dos commits."           |
| `/sync`      | Pós-merge               | "Use /sync: atualize AGENTS.md e o status da spec 0001."                |
| `/debug`     | Bug (fora da sequência) | "Use /debug: o build na Cloudflare quebra com erro X. Causa raiz."      |

## Skills de domínio (sob demanda, **não instaladas por padrão**)

> As 9 do fluxo acima são o que o repo garante (`skills-lock.json`). As de
> domínio vêm do catálogo do upstream e precisam ser instaladas antes do uso
> (`npx skills@latest`, ver AGENTS.md). Confira em `.agents/skills/` antes de
> prometer uma delas no prompt.

| Cenário                     | Skills do catálogo                                               |
| --------------------------- | ---------------------------------------------------------------- |
| Página nova / SEO           | `nextjs-seo-indexing` + `frontend-design` + `ui-a11y`            |
| API/endpoint                | `api-security-best-practices` + `security` + `typescript-expert` |
| Login/auth                  | `auth-implementation-patterns` + `security-and-hardening`        |
| Banco / RLS                 | `supabase` + `supabase-postgres-best-practices`                  |
| Performance                 | `performance-optimization` + `react-component-performance`       |
| Componente complexo         | `composition-patterns` + `react-patterns` + `ui-a11y`            |
| CI/CD                       | `github-actions` + `github-pr` + `github-governance`             |
| Decisão de arquitetura      | `architecture-decision-records` + `typescript-expert`            |
| Lógica pura (busca/cálculo) | `tdd` + `clean-code` + `typescript-expert`                       |

## O que NUNCA fazer

- ❌ `/develop` sem spec aceita (ele trava no Decision Check).
- ❌ Merge sem `/check` aprovado com hash casando (verify + review).
- ❌ Esquecer do `/sync` pós-merge (AGENTS.md desatualizado = agente erra).
- ❌ Carregar todas as skills de uma vez — economize contexto (ver `skills-load-config.md`).
- ❌ Usar `/debug` para implementar feature — use `/develop`.
