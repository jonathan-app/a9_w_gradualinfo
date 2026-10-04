# Spec: {feature}

> Template usado por `/architect`. Toda feature nova nasce aqui antes de código.
> Substitua {placeholders} e delete este cabeçalho.

## Governança

- ID: `{NNNN-slug}`
- Status: Proposed | Accepted | Superseded
- Revisão: {n}; data: {data}; responsável: {dono}
- Escopo: `docs/scope/` → fatia `{fatia}`
- Substitui: {spec anterior ou N/A com motivo}

## Problema, público e limites

{Qual problema resolve. Para quem. O que explicitamente NÃO está no escopo.}

## Decisões técnicas

{Stack, módulos afetados, alternativas consideradas e por quê rejeitadas.}

- **Dados**: campos, tipos, nulabilidade, chaves, relações, índices.
- **Migração e rollback**: estratégia (forward-only? revertível?) ou N/A justificado.
- **API**: método, caminho, autenticação, schemas de request/response.
- **Erros**: status HTTP, códigos estáveis, comportamento do cliente.
- **Regras**: fórmulas, unidades, arredondamento, fonte verificável.
- **Integrações**: provedor, timeout, retries, idempotência, comportamento indisponível.
- **Ambiente**: nomes de variáveis, obrigatoriedade, lado servidor/cliente (sem segredos).

## UI e acessibilidade

{Estados: sucesso, vazio, carregamento, erro e recuperação. Teclado, foco, nomes acessíveis, responsividade. N/A justificado.}

## Segurança e limites

{Matriz de permissões (qual papel faz o quê). Validação SEMPRE no servidor. Paginação: ordenação, cursor/offset, tamanho máximo. Rate limit: chave, janela, cota, resposta 429.}

## Critérios de aceite (ACs)

- [ ] AC-01: Dado {estado}, quando {ação}, então {resultado observável}.
- [ ] AC-02: Dado {limite/inválido}, quando {ação}, então {resultado}.
- [ ] AC-03: Dado {falha}, quando {ação}, então {recuperação verificável}.

## Plano de validação

| AC    | Como reproduzir (comando/passos) | Resultado esperado | Evidência (arquivo) | Teste (caminho) |
| ----- | -------------------------------- | ------------------ | ------------------- | --------------- |
| AC-01 | {passos}                         | {resultado}        | {arquivo}           | {caso}          |

## Decision Check (antes de passar para /develop)

- [ ] Todas as decisões têm fonte verificável.
- [ ] Dados, contratos, autorização, erros e estados de UI estão decididos ou N/A justificado.
- [ ] ACs são observáveis e têm método de validação.
- [ ] Não restam placeholders relevantes. Com lacuna, `/develop` fica bloqueado.
