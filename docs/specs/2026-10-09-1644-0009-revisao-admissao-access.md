# Revisão independente da proposta de admissão Access

**Data**: 2026-10-09, America/Sao_Paulo.
**Modelo revisor**: gpt-6-astra, esforço high, independente do autor.
**Objeto**: `2026-10-09-1632-0009-admissao-admin-access.md`, Proposed.
**Método**: leitura da spec e do contrato anterior. Sem escrita pelo revisor, sem consulta web, sem execução conectada. Revisão de desenho, não aprovação de entrega.

## Resultado

Manter Proposed. A direção é coerente e as quotas existentes podem ser preservadas, mas faltam duas decisões que bloqueiam a completude do contrato. Há seis ajustes adicionais. A revisão não concede aceite nem autorização de implementação.

## Achados e recomendações

| ID  | Severidade | Lacuna                                                                     | Resolução recomendada para decisão do proprietário                                                                                                                                                                                                                                                                                           |
| --- | ---------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | BLOCKER    | Host confiável não tem fonte definida antes e depois da adaptação OpenNext | Extrair hostname e porta da URL recebida no fetch do Worker, antes do OpenNext. Transportar host e resultado de admissão por contexto interno exclusivo da requisição, nunca header externo. Normalizar host e portas, rejeitar conflitos, provar o transporte no bundle. Host não cadastrado falha mesmo com JWT válido da mesma aplicação. |
| R2  | BLOCKER    | Proxy e guardas não determinam a cobertura de todos os despachos           | Tornar o wrapper fetch do Worker a primeira barreira para todos os métodos e caminhos administrativos, antes do OpenNext e Supabase. Manter guardas internas, cobrir login/layout/setup/verify, HEAD/OPTIONS/405, RSC/actions, normalizações, extensões e headers forjados.                                                                  |
| R3  | WARNING    | Capacidade e semântica MFA Access dependem de prova operacional            | Registrar que biometrics/security_key são métodos do Access; não prometer biometria física obrigatória sem PIN local. Provar configuração, ausência de dispensa Google e nova exigência após uma hora com sessão Google ainda válida. Sem mudar o método automaticamente se o recurso não estiver disponível.                                |
| R4  | WARNING    | Estados JWKS durante cooldown, falha e concorrência não estão completos    | Um refresh compartilhado por issuer, cooldown global sem mapa por kid, manter cache válido até TTL, timeout de um consumidor não cancela outro, definir 403/503 e rejeitar múltiplas chaves elegíveis com mesmo kid. Testar rotação sob tráfego de kids aleatórios.                                                                          |
| R5  | WARNING    | Deadline total não define as revalidações internas                         | Um orçamento de admissão de 2000 ms por requisição, iniciado no Worker, com resultado e prazo no contexto interno. Guardas verificam procedência desse contexto e o vinculam à requisição. Deadline DO separado. Não aceitar marcador enviado pelo cliente.                                                                                  |
| R6  | WARNING    | Proibição de logs/respostas mistura aplicação e plataforma                 | Proibir persistência e eco pela aplicação, DO, Sentry e artefatos. Separar cookies e telemetria geridos pelo Access, com política de retenção própria e evidências sanitizadas.                                                                                                                                                              |
| R7  | WARNING    | Ordem operacional da transição e isolamento do teste ficam em aberto       | Inventariar todos os hosts/rotas, fechar ou proteger entradas antigas, configurar ambiente isolado sem herdar vars/namespaces de produção, publicar somente após autorização e verificar cada entrada antes de concluir. Rollback exige isolamento de todos os hosts.                                                                        |
| R8  | NIT        | Tipos dos claims e precedência precisam ser explícitos                     | Exigir kid, iat e exp com tipos e limites definidos; type app isolado não comprova pessoa. Validar conjunto contra emissão real. Nova admissão prevalece sobre consumo baseado apenas em origem declarada.                                                                                                                                   |

Manter explícita a limitação herdada: o contador e o Access na aplicação não impedem chamadas diretas ao Supabase Auth nem comprovam proteção integral da conta.

## Próxima decisão

O proprietário deve escolher aplicar as recomendações, responder cada lacuna ou deixá-las pendentes. Aplicar correções não é aceite integral da spec. Depois dos ajustes, apresentar novamente o contrato completo para aceite separado. Descoberta de skills/MCP adiada por escolha explícita do proprietário.

## Conferência após incorporação autorizada

Em 2026-10-09 16:47, o mesmo revisor conferiu somente por leitura a spec corrigida. R1 a R8 estão expressos, mas a integração deixou dois detalhes materiais ainda pendentes de decisão.

| ID  | Severidade | Lacuna residual                                                                           | Resolução recomendada                                                                                                                                                                                                                                                                  |
| --- | ---------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R9  | BLOCKER    | Assets da plataforma podem ser despachados antes do wrapper Worker                        | Configurar assets.run_worker_first: true no Wrangler para garantir passagem pelo Worker, incluindo variantes codificadas. Isso também encaminha assets públicos ao Worker; eles continuam públicos. A alternativa seletiva exige demonstrar cobertura equivalente.                     |
| R10 | BLOCKER    | O wrapper precede a inicialização OpenNext, enquanto lib/env.ts usa process.env capturado | Criar leitor tipado em lib/env.ts que recebe env original do fetch; configuração Access não depende do snapshot global nem de requisição pública anterior. Guardas conferem configuração a partir do env request scoped. Provar instância fria com primeira requisição administrativa. |

A aplicação permanece sem mudança nesta rodada. Resolver esses detalhes antes de aceitar o contrato completo; manter as provas reais pendentes.

## Resolução autorizada de R9 e R10

O proprietário escolheu “Aplicar os dois ajustes recomendados”. A spec principal agora exige assets.run_worker_first true e leitor tipado de configuração Access a partir do env original do fetch, com prova em instância fria. São ajustes de contrato, não mudanças já executadas na aplicação ou na Cloudflare. Todos os achados R1 a R10 foram incorporados; provas de runtime, política e MFA continuam pendentes. O aceite integral permanece separado.
