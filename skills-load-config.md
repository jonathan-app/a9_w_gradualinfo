# Configuração de carregamento de Skills (economia de contexto)

> Objetivo: carregar só as skills necessárias em cada momento. O que está
> instalado está fixado por hash em `skills-lock.json` (fonte:
> `JavaScript-Mastery-Pro/skills`) e mora em `.agents/skills/`.
>
> Instalar/atualizar: `npx skills@latest update` (ver AGENTS.md). As skills NÃO
> são versionadas no repo — são grandes e mudam com frequência; o lock fixa a
> origem e o hash.

## NÍVEL 1 —instaladas (as 9 do lock, o ciclo do fluxo SDD)

`/scope`, `/architect`, `/develop`, `/check`, `/debug`, `/test`, `/document`,
`/sync`, `/audit`.

Essas são o suficiente para qualquer task de produto: use `/architect` para
decidir, `/develop` para escrever, `/check` para validar. Carregue a skill
**implícita** na sua chamada — nenhuma delas precisa ser nomeada no prompt.

## NÍVEL 2 — catálogo do upstream, NÃO instalado neste repo

`security`, `security-and-hardening`, `api-security-best-practices`,
`auth-implementation-patterns`, `performance-optimization`, `frontend-design`,
`ui-a11y`, `architecture-decision-records`, `clean-code`, `code-documenter`,
`nextjs-best-practices`, `nextjs-app-router-patterns`, `nextjs-seo-indexing`,
`react-patterns`, `typescript-expert`.

Não estão em `.agents/skills/` nem no lock. Se o projeto precisar de uma,
instale pelo mesmo CLI (`npx skills@latest`, seção "Skills" do AGENTS.md): o
lock passa a fixá-la por hash e ela passa a existir de fato. **Não prometa no
prompt uma skill que não está instalada** — o agente procura, não acha, e a
task trava sem erro visível.

## NÍVEL 3 — catálogo do upstream, NÃO instalado (só no cenário exato)

`composition-patterns`, `react-component-performance`, `tdd`, `testing-qa`,
`web-design-guidelines`, `supabase`, `supabase-postgres-best-practices`,
`github-actions`, `github-governance`, `github-pr`, `systematic-debugging`,
`verification-before-completion`.

Mesma regra do NÍVEL 2: instalar antes de usar.

## Regra prática de economia

- Nomeie a skill **quando ela não for óbvia pelo prompt**: `Use a skill
"ui-a11y" para...`. Quando for óbvia (`"implemente a spec 0001"`), dispare
  `/develop` e economize a menção.
- Uma task que precisa de 5 skills é task mal escopada — corte o escopo em
  `/scope` antes.
- Não instale skill "por garantia": cada uma é contexto que entra em toda
  conversa.

## Exemplo de prompt otimizado

**Ruim** (carrega tudo): "Adicione uma página de login."
**Bom** (especifica): "Use as skills: architect (spec 0002), develop. Tarefa:
página de login com Supabase, validada por AC. Não carregue performance/SEO
agora."
