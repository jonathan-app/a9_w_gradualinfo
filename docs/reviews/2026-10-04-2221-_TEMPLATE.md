# Check: {spec-slug} — relatório de /check

> Template de saída da skill `/check` (modo verify + modo review).
> Sem este relatório aprovado e com hash casando, o PR não mergeia
> (é a rede do gate; o portão real é a branch protection + CI).

## Identidade

- Spec: `docs/specs/{NNNN-slug}.md` (status Accepted)
- Branch/PR: `{branch}` → PR #{n}
- SHA verificado: `{commit-sha completo}` (o relatório só vale para ESTE hash)
- Data: {data}; Verificador: {agente/pessoa}

## Modo VERIFY — cada AC, provado

| AC    | Prova (comando/saída/evidência)                       | Resultado  | Status |
| ----- | ----------------------------------------------------- | ---------- | ------ |
| AC-01 | `pnpm test:run` → passou, ou passo manual reproduzido | {esperado} | ✅     |
| AC-02 | {evidência}                                           | {esperado} | ✅/❌  |

Cobertura de AC: {x}/{y}. Reprovações: {lista ou nenhuma}.

## Modo REVIEW — auditoria do diff

- [ ] TypeScript estrito, sem `any` implícito.
- [ ] Server Component por padrão; `'use client'` só em folha interativa.
- [ ] `auth.getUser()` para autorização; `getSession()` só para exibir.
- [ ] Toda `className` condicional passa por `cn()`.
- [ ] Nenhum `process.env` espalhado — tudo por `lib/env.ts`.
- [ ] Tabela nova tem RLS + policy por operação.
- [ ] Função SECURITY DEFINER tem `SET search_path = ''` + grant explícito.
- [ ] Nenhum segredo commitado (`pnpm security:secrets` + `pnpm security:sast` passaram).
- [ ] Comentários explicam o porquê, atualizados (não mentem).
- [ ] Sem código morto / debug (`console.log` de debug) sobrando.

Observações de review: {lista ou nenhuma}.

## Regressão

- `pnpm check:all`: {passou/falhou — qual passo}.
- `pnpm build:next`: {passou/falhou}.
- `pnpm test:e2e` (se mudou UI/rota): {passou/N/A}.
- `pnpm supabase:test` (se mudou migration/RLS): {passou/N/A}.

## Veredito

- [ ] **Aprovado** — ACs cobertos, review limpo, regressão verde. Merge liberado.
- [ ] **Reprovado** — motivo: {}. Itens a corrigir antes de novo /check: {lista}.

## Artefato do gate (copiar e preencher)

O gate `scripts/check-gate.mjs` consome **JSON estruturado**, não a frase em
Markdown acima. Grave o resultado de `scripts/check-decision.mjs` em
`docs/reviews/<slug>.resultado.json` e passe o commit com `--commit`.

Por que estruturado: o gate já exigia a string `Veredito: APROVADO`, que este
template nunca produz — ele escreve `- [ ] **Aprovado**`. Os dois discordavam e
um relatório copiado daqui era reprovado por motivo de texto. Um campo é
parseável; uma frase em prosa não é.

```bash
# 1. decidir (o /check produz isto; não escreva à mão)
node scripts/check-decision.mjs docs/reviews/<slug>.resultado.json

# 2. vincular ao commit e à árvore
node scripts/check-gate.mjs \
  docs/reviews/<slug>.resultado.json \
  --commit "$(git rev-parse HEAD)" \
  --repo "$(git rev-parse --show-toplevel)"
```

Saída esperada do passo 2:

```text
Árvore verificada: /caminho/absoluto/do/repo
HEAD: <sha>
Gate aprovado. Commit <sha> coberto por decisão aprovada em <repo>.
```

O relatório Markdown acima continua valendo como registro humano, e o caminho
`.md` do gate segue aceito para **não invalidar relatórios já emitidos** —
com aviso de depreciação em stderr. As duas coisas precisam coexistir até o
dono decidir remover o legado.

## Hash binding

Este relatório vale apenas para o SHA declarado. Qualquer commit novo no PR
invalida a aprovação (a branch protection também exige "dismiss stale reviews").
