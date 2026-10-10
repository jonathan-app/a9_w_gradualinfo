# /check verify — requisição e trace do runtime publicado

**Data do registro:** 2026-10-10 17:12 America/Sao_Paulo  
**Alvo:** Worker `gradualinfo`, `https://gradualinfo.com.br/`  
**Escopo:** correlação de uma requisição pública com um trace e com a versão que a atendeu.

## Evidência recebida

Os dados abaixo foram fornecidos pelo usuário. Não houve acesso direto deste agente ao painel autenticado da Cloudflare.

| Dado                                            | Valor                                             |
| ----------------------------------------------- | ------------------------------------------------- |
| Método e rota                                   | `GET /`                                           |
| Início e fim                                    | `2026-10-10T20:00:41Z` a `2026-10-10T20:00:42Z`   |
| Resposta HTTP                                   | `200` (`curl` exit `0`)                           |
| `CF-Ray` da resposta                            | `a4883670fe19cb03-GIG`                            |
| `cloudflare.ray_id` transcrito do trace         | `a4883670fe19cb03-GIG`                            |
| Horário do span                                 | Não fornecido                                     |
| `cloudflare.script_version.id`                  | Não fornecido; `<COPIAR_O_VALOR>` era placeholder |
| `cloudflare.script_name` e `cloudflare.outcome` | Nomes fornecidos sem valores                      |

## Resultado

| Verificação                      | Estado                                     | Limite da prova                                                                                                     |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Requisição pública               | PASS                                       | `GET /` respondeu 200 no intervalo informado.                                                                       |
| Ingestão e correlação por Ray ID | PASS com evidência transcrita pelo usuário | O identificador informado para o trace coincide com o cabeçalho da resposta. Não há captura independente do painel. |
| Versão que atendeu à requisição  | UNVERIFIABLE                               | Falta o valor de `cloudflare.script_version.id` no span. O histórico de implantações não substitui esse atributo.   |
| Demais ACs de runtime            | Sem mudança                                | Esta requisição não prova health, robots, Access, MFA, Sanity nem Durable Objects.                                  |

O gate da spec 0006 em `docs/reviews/2026-10-10-1920-verify-0853696.md` permanece **REPROVADO** com 5 ACs UNVERIFIABLE. Nenhum AC dessa spec foi reclassificado por esta evidência; a autoridade do gate não foi reexecutada. Não houve configuração remota, push, merge ou deploy nesta verificação.

**Próxima prova necessária:** no trace filtrado por `cloudflare.ray_id = "a4883670fe19cb03-GIG"`, registrar apenas o horário UTC do span e o valor de `cloudflare.script_version.id`. Se o atributo não estiver disponível, manter a versão como UNVERIFIABLE.
