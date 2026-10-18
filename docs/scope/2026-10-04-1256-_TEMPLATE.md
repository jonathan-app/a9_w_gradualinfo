# Scope: {produto/feature}

> Template usado por `/scope`. Responde "o que construir e em que ordem".
> Não decide COMO — isso é spec (`/architect`).

## Premissas

{O que já sabemos. O que o produto É e NÃO é.}

## Épicos / fatias (ordenados por valor)

| #   | Fatia   | Entrega (observável)     | Depende de | Risco              |
| --- | ------- | ------------------------ | ---------- | ------------------ |
| 1   | {fatia} | {o que o usuário vê/faz} | —          | {baixo/médio/alto} |

## Fora do escopo (explícito)

{O que não vai ser feito agora, e por quê. Evita retrabalho.}

## Critérios de pronto (Definition of Ready para /architect)

- [ ] Cada fatia tem entrega observável (não "refatorar X").
- [ ] Ordem de dependências declarada.
- [ ] Riscos técnicos identificados.
- [ ] Nenhuma fatia depende de decisão humana não tomada. (Se depender, marque `decisão do usuário`.)

## Próxima etapa

`/architect` → cria `docs/specs/{NNNN-slug}.md` a partir da fatia #1.
