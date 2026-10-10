# Regra: comentários e documentação de código

> Filosofia deste boilerplate (ver `AGENTS.md`): **comentário explica o PORQUÊ e
> a ESTRATÉGIA, não o O QUÊ.** Documentar contrato importante, sim; JSDoc em
> cada getter, não. Comentário do óbvio é pior que nenhum comentário.
> Comentário mentiroso é bug — se mudar o código, atualize ou apague o comentário.

## O que é OBRIGATÓRIO (contratos)

1. **Arquivo novo não-óbvio**: bloco no topo explicando o que controla e as
   armadilhas conhecidas (ex.: "por que buildCommand fica fora de defineCloudflareConfig").
2. **Função/tipo/componente exportado com contrato não-trivial**: JSDoc com
   `@param`, `@returns`, `@example` quando o uso não é óbvio.
3. **Decisão de arquitetura / workaround**: comentário inline com o motivo e a
   referência (issue/docs). Quem lê depois precisa saber POR QUE aquele código
   existe daquela forma.
4. **Regra de negócio / fórmula**: de onde vem o número, qual a unidade, como
   arredonda.

## O que é PROIBIDO

- Comentar o óbvio: `// soma 1`, `// importa o react`.
- JSDoc em cada função trivial (getter, setter, wrapper de uma linha).
- Comentários que descrevem a sintaxe ("este é um array.map").
- Comentários mentirosos/desatualizados — apague ou reescreva.

## Níveis (na prática)

| Nível              | Onde                            | Exemplo                                                  |
| ------------------ | ------------------------------- | -------------------------------------------------------- |
| Cabeçalho          | Arquivo de config/lib não-óbvio | "Por que este arquivo existe; o que quebra se mexer"     |
| JSDoc              | Função exportada com contrato   | `@param`, `@returns`, `@example` (só se agregar)         |
| Inline estratégico | Lógica complexa                 | "Usa reduce+Map em O(n) em vez de filter aninhado O(n²)" |
| Inline decisão     | Workaround / hack               | "Next 16 depreciou middleware; ver proxy.ts"             |

## Automação

- `eslint-plugin-jsdoc` roda em **warn** (não bloqueia commit, lembra). Regras:
  `require-jsdoc` só em exports nomeados, `check-param-names` em error, o resto
  em warn. (Ver `eslint.config.mjs`.)
- Snippet do editor: `/**` + Tab gera o template.

## Checklist antes de commitar arquivo novo/modificado

- [ ] Contratos significativos documentados (não cada função).
- [ ] Comentários de estratégia/decisão presentes onde o porquê não é óbvio.
- [ ] Nenhum comentário mentiroso/desatualizado.
- [ ] Nenhum comentário do óbvio.

## Exemplos

- `exemplos/exemplo-lib.ts` — funções puras com JSDoc de contrato.
- `exemplos/exemplo-componente.tsx` — componente com props/variantes e a11y documentados.
