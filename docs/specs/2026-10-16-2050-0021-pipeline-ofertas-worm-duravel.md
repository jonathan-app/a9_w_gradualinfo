# 0021. Pipeline de ofertas com permissao de servico e persistencia probatoria

**Date**: 2026-10-16
**Status**: Accepted
**Decision source**: Aceite formal do proprietário em 2026-10-16 para a Fase 4 do escopo de backend (docs/scope/2026-10-14-2135-backend-auth-operacoes.md), após refinamento dos contratos via /architect

## Summary

Esta decisao formaliza os contratos arquiteturais da Fase 4 do escopo de backend para o modulo comercial de ofertas. Estabelecemos a execucao da funcao de banco de avaliacao de selo exclusivamente atraves de cliente privilegiado de servico no servidor, logo apos autorizacao formal por sessao administrativa de segundo fator para operadores humanos ou atraves de rota de ingestao dedicada para coletores automatizados.

Com o aceite formal de 2026-10-16, esta spec passa ao status Accepted. O codigo ja existente permanece sujeito a verificacao de entrega contra este contrato refinado, incluindo os passos do Build plan ainda pendentes (rota de ingestao de coletores e rejeicao 409 na RPC).

O adaptador local em sistema de arquivos e classificado explicitamente como implementacao de teste e desenvolvimento. Ele opera com criacao atomica sem substituicao de destino via linkagem fisica POSIX (`fs.linkSync`), prevencao de colisao concorrente testada entre processos independentes do sistema operacional, e recuperacao de escritas interrompidas com filtro estrito de liveness que preserva processos ativos e estados incertos (como `EPERM`). A retencao duravel do provedor externo de nuvem (Cloudflare R2 Bucket Locks) permanece pendente de validacao especifica em infraestrutura real, sem declarar conformidade aprovada por testes locais de sistema de arquivos.

A politica de retencao probatoria e formalizada como proposta operacional em camadas (tiered storage) com marco inicial na data de coleta (`created_at`): camada quente por 730 dias (dois anos) com acesso operacional imediato, transicao automatica para camada fria/arquivamento ate o quinto ano (1825 dias) para gestao de risco e custo, e expurgo definitivo programado condicionado a ausencia de excecoes de preservacao (legal hold para contestações ativas ou processos judiciais). Nao ha equivalencia automatica com a prescricao do Artigo 27 do Codigo de Defesa do Consumidor, cuja contagem se inicia apenas com a ciencia do dano e da autoria pelo consumidor.

A admissao de coletores automatizados e fechada em rota de ingestao dedicada (`/api/ingest/ofertas`), separada do Cloudflare Access para navegadores. A autenticacao e baseada em assinatura HMAC-SHA256 vinculando metodo, caminho, identificador do coletor, timestamp, nonce e hash do corpo da requisicao, sendo a assinatura validada antes do consumo do nonce compartilhado para mitigar esgotamento de recursos. A identidade validada do coletor e propagada para a transacao do banco.

A idempotencia transacional no PostgreSQL exige tratamento de tres cenarios: reenvio identico retorna o resultado anterior sem novo efeito no banco; reenvios concorrentes simultaneos produzem um unico efeito transacional; e submissao com a mesma chave mas com payload divergente retorna conflito HTTP 409 imediato.

## Context

O portal editorial publica ofertas comerciais verificadas que dependem de conformidade com o historico de precos e com a legislacao consumerista. A avaliacao de selo gera registros probatorios que devem ser preservados para auditoria e prestacao de contas.

Na revisao dos contratos da Spec 0021, identificamos pontos criticos de desenho que exigem especificacao fechada antes de qualquer aceite formal:

Primeiro, persistencia duravel em sistema de arquivos local nao comprova imutabilidade regulatoria. O uso de `renameSync` no padrao POSIX substitui atomicamente o destino caso ele ja exista, o que nao garante protecao contra colisao concorrente. O adaptador local utiliza criacao atomica que falha sob existencia do destino (`fs.linkSync`), protegendo o arquivo original e permitindo detectar colisoes se o conteudo recebido divergir. A protecao contra corridas deve ser demonstrada por testes disparando processos independentes do sistema operacional disputando a mesma chave. Alem disso, a rotina de limpeza de arquivos temporarios orfaos nao pode utilizar a idade como criterio isolado de abandono: processos ativos e estados de processo incertos (incluindo `EPERM`) sao estritamente preservados; apenas a confirmacao de processo inexistente (`ESRCH`) decorrido o periodo de tolerancia autoriza a exclusao.

Segundo, o Artigo 27 do Codigo de Defesa do Consumidor estabelece prescricao de cinco anos contada a partir do conhecimento do dano e de sua autoria pelo consumidor, nao estipulando exclusao automatica de provas apos 1825 dias da coleta. Desfazemos essa equivalencia: o prazo de cinco anos e registrado como politica operacional proposta de retencao em camada fria por governanca de risco e custo, com marco inicial na coleta (`created_at`) e excecoes mandatorias de preservacao (legal hold) para suspensao do expurgo em caso de disputas ativas, auditorias ou demandas judiciais.

Terceiro, a admissao de maquinas e coletores automatizados nao pode depender de alternativas em aberto nem presumir que o guard administrativo de navegadores (`assertAdminApiAuth`) aceite identidades de servico sem sessao humana. A solucao arquitetural eleita e a segregacao de rotas: a rota administrativa `/api/admin/ofertas/[id]/avaliar-selo` atende operadores humanos sob sessao AAL2 no painel, enquanto a rota dedicada `/api/ingest/ofertas` atende coletores externos via HMAC-SHA256 vinculando metodo, caminho, coletor, timestamp, nonce e payload. A validacao da assinatura deve preceder o consumo do nonce para impedir ataques de esgotamento de recursos compartilhados.

Quarto, o reenvio de avaliacoes com a mesma chave mas dados divergentes constitui violacao de integridade. A idempotencia transacional no banco deve rejeitar categoricamente qualquer tentativa de reaproveitar uma chave com payload diferente (HTTP 409), enquanto reenvios com dados identicos recuperam o resultado previo sem criar novas linhas na tabela `price_audit_logs`.

Quinto, o codigo previamente alterado no repositorio para o adaptador e a fabrica era trabalho preliminar experimental que aguardava a aprovacao formal desta especificacao, concedida pelo proprietario em 2026-10-16.

## Requirements

**User stories**:

- Como operador administrativo autenticado com segundo fator (AAL2), quero avaliar ofertas comerciais acionando a rotina de precos via credencial de servico isolada no servidor, recebendo confirmacao transacional idempotente mesmo sob reenvio de requisicoes.
- Como coletor externo automatizado, quero submeter dados de precos atraves de rota de ingestao dedicada protegida por assinatura HMAC vinculando todos os parametros da mensagem com protecao anti replay atomica e compartilhada, garantindo que minha identidade seja registrada na auditoria e que mensagens repetidas nao gerem duplicidades.
- Como auditor do sistema, quero que os arquivos de prova locais sejam criados atomicamente sem risco de substituicao acidental por processos concorrentes, que temporarios de processos ativos ou incertos nao sejam expurgados, e que a politica de retencao em nuvem preveja camadas, marco inicial e bloqueio de expurgo para contestações ativas.
- Como visitante do portal, quero consultar ofertas publicas atraves de rota que valide parametros estritamente e oculte falhas internas de banco sob mensagens sanitizadas opacas.

**Acceptance criteria**:

- **ofertas-pipeline/AC-01**: A invocacao da funcao de banco `evaluate_and_set_verified_price` na rota administrativa ocorre exclusivamente atraves de um cliente Supabase com chave de servico (`service_role`), executado no servidor (`server-only`), apos autorizacao comprovada por sessao AAL2 de operador humano.
- **ofertas-pipeline/AC-02**: O armazenamento local de desenvolvimento e teste utiliza o adaptador de sistema de arquivos (`FilesystemEvidenceStorageAdapter`), operando com gravacao atomica que impede substituicao de destino via linkagem fisica POSIX (`fs.linkSync`), comprovada por testes com processos independentes do sistema operacional, e rotina de recuperacao que preserva processos ativos e estados incertos (`EPERM`), expurgando exclusivamente temporarios de processos confirmadamente mortos (`ESRCH`) apos tolerancia minima.
- **ofertas-pipeline/AC-03**: O build de producao do Cloudflare Worker e desacoplado de modulos de disco (`node:fs`). Na ausencia de configuracao valida de armazenamento remoto em producao, a aplicacao falha fechada com HTTP 503 antes de acionar a funcao transacional no banco de dados, sendo expressamente proibido qualquer fallback para memoria volatil.
- **ofertas-pipeline/AC-04**: A idempotencia transacional e garantida no PostgreSQL atraves de chave de operacao unica:
  - Reenvios com payload identico retornam deterministicamente o resultado previo (`reused_existing: true`) sem gerar novas linhas em `price_audit_logs`.
  - Reenvios concorrentes simultaneos com payload identico produzem exatamente um unico efeito transacional no banco.
  - Submissoes com a mesma chave de operacao mas payload divergente sao rejeitadas com erro de conflito HTTP 409.
- **ofertas-pipeline/AC-05**: A rota publica `/api/ofertas` sanitiza todas as falhas de consulta, gravando detalhes tecnicos no log interno e retornando ao consumidor externo um payload JSON opaco acompanhado de status HTTP 503.
- **ofertas-pipeline/AC-06**: A rota publica `/api/ofertas` valida defensivamente os parametros de consulta (`product_id` e `merchant_id` com validacao de formato UUIDv4 estrito, e `limit` como inteiro entre 1 e 100), rejeitando valores invalidos com HTTP 400 antes de acessar o banco.
- **ofertas-pipeline/AC-07**: O cliente privilegiado com chave de servico e isolado em modulo proprio (`lib/offers/service-client.ts`) com a diretiva `import 'server-only'`, sem persistencia de cookies ou sessao, impedindo exposicao da credencial para clientes HTTP ou componentes de interface.
- **ofertas-pipeline/AC-08**: A admissao de coletores automatizados e realizada atraves de rota de ingestao dedicada (`/api/ingest/ofertas`), protegida por assinatura criptografica HMAC-SHA256 vinculando metodo, caminho, coletor, timestamp, nonce e hash do corpo. A assinatura e validada antes de consumir o nonce compartilhado em banco de dados ou Durable Object, e a identidade autenticada (`origin_actor_id = 'collector:' || collector_id`) e propagada para a chamada de banco.
- **ofertas-pipeline/AC-09**: A politica de retencao probatoria no Cloudflare R2 e formalizada em modelo em camadas: 730 dias na camada quente para acesso operacional, transicao para camada fria/arquivamento ate 1825 dias (cinco anos), marco inicial na data de coleta (`created_at`) e expurgo condicionado a ausencia de excecoes de preservacao (legal hold); a homologacao desse ciclo de vida em producao permanece pendente de validacao dedicada na nuvem.

## Options considered

### Option 1: Rota dedicada para coletores, criacao atomica com link POSIX e ciclo de vida em camadas (Recomendado)

Segregar a rota administrativa (humana AAL2) da rota de ingestao de coletores (`/api/ingest/ofertas`), fechando a admissao em HMAC-SHA256 com anti replay compartilhado. Utilizar `linkSync` no adaptador de disco local para garantir atomicidade real sem substituicao de arquivo preexistente. Explicitar a retencao em camadas (730 dias quente, cinco anos arquivado e expurgo programado).

**Pros**:

- Elimina ambiguidades arquiteturais entre acesso humano e acesso de coletores.
- Garante atomicidade comprovavel no filesystem sem risco de sobrescrever arquivos sob concorrência.
- Trata processos ativos na limpeza de arquivos temporarios, evitando corromper escritas em curso.
- Harmoniza o requisito operacional de 730 dias com o prazo prescricional de cinco anos do Codigo de Defesa do Consumidor com controle de custo.
- Trata explicitamente o conflito de mesma chave com payload divergente.

**Cons**:

- Exige criacao da rota `/api/ingest/ofertas` e tabela/estrutura de nonces compartilhada para a ingestao automatizada.

### Option 2: Misturar operadores humanos e coletores na mesma rota administrativa

Manter coletores chamando `/api/admin/ofertas/[id]/avaliar-selo`, criando regras especiais no guard para aceitar chaves de maquina alongside sessoes de usuario.

**Pros**:

- Mantem um unico endpoint de avaliacao.

**Cons**:

- Cria brechas de complexidade no guard de autenticacao de navegadores.
- Exige contornar politicas de Cloudflare Access ou configurar tokens de servico complexos para trafego automatizado.

## Decision

**Chosen option**: Option 1: Rota dedicada para coletores, criacao atomica com link POSIX e ciclo de vida em camadas.

A Spec 0021 foi aceita formalmente pelo proprietario em 2026-10-16 (status Accepted). O codigo previamente escrito deixa o rotulo de preliminar e segue para completude e verificacao formal contra este contrato. As quatro decisoes levantadas estao fechadas: criacao atomica via `linkSync` sem substituicao de destino; limpeza de temporarios que respeita processos ativos; ciclo de vida probatorio em camadas (730 dias quente, transicao fria ate cinco anos, expurgo final); admissao de coletores em rota dedicada com propagacao de identidade; e conflito 409 sob payload divergente com a mesma chave de operacao.

**Implementation skills**: `clean-code` (`.agents/skills/clean-code/`), `ponytail` (`.gemini/config/plugins/ponytail/skills/ponytail/`)

## Feature design

**Idempotencia e conflito de payload no banco de dados**:

Uma avaliacao e identificada por sua chave deterministica de operacao: `operation_key = offer_id || ':' || evidence_hash`.

1. Reenvio identico: se ja existir avaliacao confirmada com a mesma `operation_key` e o payload canônico recebido for identico ao registrado, a funcao nao altera dados, nao renova vigencia e retorna os dados originais acompanhados de `reused_existing: true`.
2. Concorrencia simultanea identica: duas transacoes concorrentes com a mesma `operation_key` e mesmo payload sao sincronizadas via bloqueio de linha (`SELECT FOR UPDATE` na oferta ou insercao condicional `ON CONFLICT DO NOTHING`), garantindo que apenas uma aplique mutacoes no banco.
3. Conflito por payload divergente: se uma submissao utilizar uma chave de operacao preexistente mas fornecer payload divergente daquele originalmente registrado para o mesmo identificador, a operacao e categoricamente recusada com status HTTP 409 Conflict.

**Criacao atomica e expurgo seguro no adaptador local**:

O adaptador `FilesystemEvidenceStorageAdapter` deve:

1. Gravar dados em arquivo temporario unico contendo o PID do processo: `.tmp.<sha256>.<uuid>.<pid>.tmp`.
2. Aplicar modo restritivo de leitura local (`0o444`).
3. Executar linkagem fisica atomica POSIX `fs.linkSync(tmpPath, finalPath)`:
   - Se o destino nao existir, a linkagem fisica e criada atomicamente e o arquivo temporario e desvinculado (`fs.unlinkSync`), garantindo gravacao atomica sem risco de substituicao destrutiva do destino sob nenhuma circunstancia.
   - Se o destino ja existir, `fs.linkSync` lanca deterministicamente a excecao `EEXIST`. O adaptador captura a excecao, le o arquivo existente no destino e compara o conteudo binario: se identico, retorna reuso (`reused_existing: true`); se divergente, lanca `EvidenceCollisionConflictError` (HTTP 409).
   - A garantia contra condicoes de corrida e comprovada por testes com processos independentes do sistema operacional (`child_process.spawn`) disputando a mesma chave com conteudo identico e divergente.
4. Rotina de expurgo seguro (`recoverInterruptedWrites`):
   - Varre a pasta de evidencias buscando arquivos temporarios `.tmp.*`.
   - Extrai o PID do nome do arquivo. Se o PID nao puder ser determinado ou for invalido, o estado e incerto e o arquivo e preservado.
   - Verifica a vivacidade do processo via `process.kill(pid, 0)`: se o processo estiver ativo, ou se retornar erro de permissao `EPERM` (indicando processo existente sob outro contexto de usuario), o arquivo e preservado integralmente, pois idade isolada nao autoriza exclusao de processo vivo.
   - Apenas se for confirmada a ausencia do processo (`ESRCH`) e decorrido o periodo minimo de tolerancia (quinze minutos), o arquivo temporario orfao e removido (`unlinkSync`).

**Ciclo de vida e retencao probatoria**:

1. Marco inicial: data e hora da coleta e persistencia da evidencia (`created_at`).
2. Camada quente (Hot tier): primeiros 730 dias (dois anos). Acesso operacional imediato no storage para consultas frequentes e auditoria em tempo real.
3. Camada fria / arquivamento (Cold tier): do 731º dia ate 1825 dias (cinco anos). Politica de ciclo de vida de nuvem transfere objetos para modalidade de menor custo por governanca de risco.
4. Excecoes de preservacao obrigatoria (Legal Hold): qualquer evidencia associada a contestacao comercial ativa, processo administrativo, auditoria formal ou litigio judicial tem seu expurgo suspenso indefinidamente, mantendo a custodia ate conclusao transitada em julgado.
5. Expurgo definitivo: ao completar 1825 dias (cinco anos) contados do marco inicial, o objeto probatorio e elegivel para expurgo programado pelo ciclo de vida do bucket, condicionado estritamente a inexistencia de flag de legal hold. Fica desfeita qualquer equiparacao desse prazo a exclusao obrigatoria pelo Artigo 27 do CDC, cuja prescricao possui marco legal proprio (ciencia do dano e da autoria).

**Admissao de coletores em rota de ingestao dedicada**:

1. Rota `/api/ingest/ofertas` (POST):
   - Exposta fora das barreiras de login de navegador do Cloudflare Access.
   - Requer cabecalhos obrigatorios: `X-Collector-Id`, `X-Timestamp`, `X-Nonce` e `X-Signature-SHA256`.
   - Rejeita requisicoes com desvio temporal superior a 300 segundos em relacao ao relogio do servidor (`abs(now - timestamp) > 300`).
   - String canônica para calculo da assinatura HMAC-SHA256:
     `StringToSign = HTTP_METHOD + '\n' + PATH + '\n' + COLLECTOR_ID + '\n' + TIMESTAMP + '\n' + NONCE + '\n' + SHA256(RAW_BODY)`
   - Ordem estrita de validacao defensiva:
     1. Valida a presenca de todos os cabecalhos e o formato dos campos.
     2. Computa a assinatura HMAC-SHA256 utilizando `OFFERS_INGEST_SECRET` e valida contra `X-Signature-SHA256` em tempo constante (`crypto.timingSafeEqual`).
     3. Apenas se a assinatura for matematicamente valida, consulta e consome atomicamente o nonce no storage compartilhado (PostgreSQL ou Durable Object). Requisicoes com assinatura invalida sao rejeitadas com HTTP 401 imediatamente, sem tocar ou esgotar a base de nonces.
     4. Se o nonce ja tiver sido registrado anteriormente, rejeita com HTTP 409 Conflict (tentativa de replay).
   - Apos admissao confirmada, propaga a identidade auditavel do coletor para a camada de persistencia: `p_origin_actor_id = 'collector:' || collector_id`.

**API surface**:

| Endpoint                               | Method | Key inputs                                                                   | Key outputs                                                                             | Auth                                    | Key errors                                           |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `/api/admin/ofertas/[id]/avaliar-selo` | POST   | `advertised_sku`, `advertised_specs`, `raw_proof`, `region_code`             | `approved`, `badge_status`, `evidence_hash`, `effective_price_cents`, `reused_existing` | Admin AAL2 (operador humano)            | 400, 401, 403, 404, 409, 422, 503                    |
| `/api/ingest/ofertas`                  | POST   | `offer_id`, `advertised_sku`, `advertised_specs`, `raw_proof`, `region_code` | `approved`, `badge_status`, `evidence_hash`, `effective_price_cents`, `reused_existing` | Assinatura HMAC com nonce compartilhado | 400, 401, 403, 409, 422, 503                         |
| `/api/ofertas`                         | GET    | `product_id` (UUIDv4), `merchant_id` (UUIDv4), `limit` (1 a 100)             | `offers` (lista sanitizada de ofertas ativas)                                           | Publica                                 | 400 (parametro invalido), 503 (servico indisponivel) |

**Key invariants**:

- Persistencia de prova confirmada antes de qualquer mutacao transacional no banco.
- Proibicao de substituicao de arquivos probatorios locais via `linkSync`.
- Expurgo seguro de temporarios preservando processos de gravacao ativos.
- Idempotencia no banco: reenvios identicos devolvem resultado previo; payload divergente lanca conflito HTTP 409.
- Isolamento de runtime: o bundle de producao do Cloudflare Worker nao importa modulos de disco nem recorre a memoria contabilizada.
- Retencao probatoria com modelo em camadas e expurgo programado aos cinco anos.

## Build plan

1. Ratificar a Spec 0021 como Accepted (concluido em 2026-10-16 com o aceite formal do proprietario).
2. Completar o Build plan (itens 5 e 6) e submeter a entrega a nova verificacao contra os AC-01 a AC-09 aceitos antes de fechar o ciclo.
3. Ajustar o adaptador local de testes (`lib/offers/storage/filesystem-adapter.ts`) para adotar `fs.linkSync` e protecao de PID ativo no expurgo de temporarios (implementado em 2026-10-16).
4. Adicionar teste automatizado de processos concorrentes gravando a mesma chave (implementado em 2026-10-16).
5. Implementar a rota dedicada de ingestao de coletores (`/api/ingest/ofertas`) com assinatura HMAC, anti replay compartilhado e propagacao de identidade.
6. Ajustar a RPC de banco `evaluate_and_set_verified_price` para suportar rejeicao de payload divergente sob a mesma chave com HTTP 409.
7. Homologacao do ciclo de vida e Bucket Locks no Cloudflare R2 como marco futuro de infraestrutura independente.

## Consequences

**Positive**:

- Seguranca concorrente comprovavel no sistema de arquivos local sem risco de sobrescrita acidental.
- Preservacao de escritas ativas contra expurgo precipitado de arquivos temporarios.
- Clareza economica e tecnica no ciclo de vida probatorio (camada quente por dois anos, arquivamento ate cinco anos e expurgo final).
- Segregacao limpa entre acesso humano administrativo (AAL2) e coleta automatizada de maquinas (HMAC em rota dedicada).
- Tratamento estrito de conflitos de dados sob a mesma chave de operacao.

**Negative / tradeoffs**:

- Exige criacao e manutencao de rota dedicada para ingestao de coletores e mecanismo de persistencia compartilhada de nonces.
