# Rate limiting administrativo persistente

**Date**: 2026-10-09 08:52, America/Sao_Paulo.
**Status**: Superseded by [0009](2026-10-09-1632-0009-admissao-admin-access.md)
**Decision source**: O proprietário aprovou “Durable Object dedicado” e selecionou a prioridade 1 nesta sessão. DO dedicado, separação login/MFA e falha 503 já autorizados. Contrato integral aceito nesta sessão em 2026-10-09: “Aceitar e implementar”, incluindo quotas globais, janela fixa, risco de bloqueio, 429 e 503. Merge e deploy não autorizados.

## Summary

Substituir os dois contadores locais por um Durable Object dedicado com persistência e consumo atômico. Recomenda-se manter cinco tentativas em sessenta segundos para cada operação, agora compartilhadas entre todas as instâncias. Login e MFA usam quotas independentes. O bloqueio retorna HTTP 429, inclusive para formulários. Contador indisponível retorna 503 sem executar autenticação ou desafio.

## Context

O diagnóstico `../../check/admin-hardening/2026-10-09-0842/DEBUG.md` reproduziu reinicialização de quota ao recarregar o módulo e alteração da chave ao mudar x-forwarded-for. Os handlers atuais têm limite de cinco tentativas em sessenta segundos, sem armazenamento compartilhado ou limite de entradas no Map.

Há somente uma identidade administrativa autorizada. Este contrato limita as operações desse painel como um todo, sem armazenar IP, e-mail, senha, código, cookie ou token. A leitura pública e o armazenamento de sessões de preview pertencem a fluxos separados.

## Requirements

- **admin-rate/AC-01**: Login e verificação MFA usam o mesmo namespace persistente; alterar instância, IP, e-mail submetido ou headers de encaminhamento não reinicia a quota. Não há Map nem fallback volátil em produção.
- **admin-rate/AC-02**: Cada operação aceita no máximo cinco tentativas em sua janela de sessenta segundos. A sexta e seguintes recebem 429. Login e MFA não consomem a quota uma da outra. Uma nova janela permite a próxima tentativa quando o prazo anterior termina.
- **admin-rate/AC-03**: Consumo concorrente é atômico e persistido antes de liberar chamada ao Supabase. Reinício do objeto preserva quota. Tentativas recusadas não prolongam a janela nem aumentam contadores sem limite.
- **admin-rate/AC-04**: JSON e formulário recebem 429 real, Retry-After em segundos inteiros positivos e Cache-Control private, no-store. Formulários exibem mensagem genérica sem redirecionar a resposta de bloqueio para HTTP 303.
- **admin-rate/AC-05**: Binding ausente, timeout, resposta inválida ou erro de armazenamento produzem 503, Retry-After: 5 e private, no-store. Nenhuma autenticação por senha nem desafio MFA ocorre depois dessa decisão. Não há liberação por fallback local.
- **admin-rate/AC-06**: Há no máximo duas linhas de quota e um alarme programado por objeto. Registros vencidos são removidos por alarme e ignorados pelo consumo mesmo se o alarme atrasar. Nenhuma chave fornecida pelo cliente cria objetos ou linhas adicionais.
- **admin-rate/AC-07**: A verificação de origem continua anterior ao consumo. Requisição CSRF rejeitada não consome quota. No MFA, a identidade administrativa é validada antes do consumo; usuário divergente ou anônimo não pode esgotar a quota de desafio. Login com origem válida consome quota antes de signIn, inclusive se credenciais ou corpo forem inválidos.
- **admin-rate/AC-08**: O novo binding e migration são aditivos. PREVIEW_SESSION_DO e sua migration v1 permanecem intactos. Leitura pública, preview, logout e cookies não passam pelo contador. Publicação remota requer autorização independente.

## Options considered

### Manter Map e limpar entradas

Corrige crescimento de memória, mas não resolve quota entre instâncias ou persistência. Rejeitada como controle de produção.

### Proteção apenas na borda

Pode reduzir tráfego hostil antes da aplicação. Depende de configuração remota e não atende sozinho ao contrato escolhido de contador compartilhado. Pode ser complemento futuro, sem ser pré-requisito desta entrega.

### DO dedicado com duas quotas globais

É a escolha de provedor já aprovada. Evita dependência de identidade de IP e mantém estado limitado. Traz um ponto comum de autorização e possibilidade de esgotamento da quota por tráfego malicioso.

## Decision

Propor `AdminRateLimitDO`, binding `ADMIN_RATE_LIMIT_DO`, armazenamento SQLite e um objeto identificado por `admin-auth-rate-limit:v1`. Não reutilizar o namespace de preview. As únicas operações aceitas são `login` e `mfa`.

Cada operação tem quota de cinco tentativas e janela fixa de 60000 ms iniciada no primeiro consumo permitido. O relógio é Date.now() no DO, nunca um timestamp do cliente. Alterar o IP não participa da identidade da quota. Os números preservam os limites do código atual, mas a mudança para quota global é uma recomendação nova que exige aceite.

Atomicidade por transação síncrona SQLite: ler a linha da operação, criar janela quando ausente ou vencida, recusar se count >= 5, ou incrementar e persistir antes de retornar allowed. Não intercalar chamadas de rede nessa transação. Agendar o alarme para a menor expiração ativa; erro ao persistir ou agendar falha fechado. A atomicidade é baseada na API oficial de [armazenamento SQLite do DO](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).

## Rationale

Dois contadores globais são suficientes para uma conta administrativa e impedem que um atacante ganhe cinco tentativas adicionais ao escolher outro e-mail, IP ou Worker. Preservar os limites atuais reduz mudanças simultâneas de parâmetros e arquitetura. Não usar IP também elimina a necessidade de confiar em headers de origem diferentes entre next start e Worker.

A documentação da Cloudflare recomenda SQLite para novos namespaces de DO. Esse armazenamento e sua transação síncrona sustentam a persistência do contador; mocks não comprovam o runtime real. O limite de cinco por minuto não substitui proteção contra negação de serviço na borda.

## Feature design

### Dados e fontes de valores

Tabela `quotas`: operation TEXT PRIMARY KEY, count INTEGER, expires_at INTEGER (milissegundos UTC). CHECK restringe operation a login/mfa e count a 1..5. Sem tabela por usuário ou IP.

| Valor                      | Fonte e regra                                         |
| -------------------------- | ----------------------------------------------------- |
| Namespace e nome do objeto | Constantes do contrato, não dados de entrada          |
| operation                  | Handler escolhe login ou mfa; DO valida enum          |
| limit                      | Constante 5 para cada operação                        |
| windowMs                   | Constante 60000                                       |
| now                        | Date.now() no DO                                      |
| expires_at                 | now + windowMs ao iniciar janela                      |
| count                      | Linha persistente, incrementada só se abaixo de limit |
| retryAfter em 429          | max(1, ceil((expires_at - now) / 1000))               |
| retryAfter em 503          | Constante 5                                           |
| prazo da chamada ao DO     | 2000 ms, contado no adaptador do Worker               |
| allowed                    | Decisão retornada pela transação persistida           |
| configuração do binding    | Contexto OpenNext do Worker, validado pelo adaptador  |

### API interna

POST `http://admin-rate-limit/consume`, JSON `{ operation: 'login' | 'mfa' }`. Entrada estrita, máximo 128 bytes. Outros métodos retornam 405, caminho desconhecido 404, operação inválida 400 sem escrita. A classe é acessada apenas pelo binding interno, sem criar rota pública para o DO.

Resposta permitida: HTTP 200 e `{ allowed: true }`. Quota esgotada: HTTP 429 e `{ allowed: false, retryAfter: number }`. Falha interna: HTTP 503 e erro genérico. O adaptador valida status, schema e Retry-After entre 1 e 60; resposta inesperada é falha 503. Não registrar o corpo das requisições.

Prazo de 2000 ms com cancelamento de espera. Cancelamento ou timeout pode ocorrer após consumo persistido; não devolver quota nem repetir automaticamente. O cliente aguarda antes de tentar novamente. Falha 503 não promete que a quota ficou intacta.

### Respostas dos handlers

JSON para Accept application/json, ou Content-Type application/json. Demais requisições recebem HTML mínimo com título genérico, mensagem de bloqueio e link fixo de retorno a login ou verificação MFA. Não incluir parâmetros recebidos, detalhes internos, dados de conta ou fatores.

Bloqueio: status 429, Retry-After calculado, private, no-store e noindex, nofollow. Falha do contador: mesmo formato, status 503 e Retry-After 5. Origem inválida permanece 403. Configuração administrativa inválida permanece erro de configuração antes de autenticação.

### Ambiente e segurança

Sem binding, inclusive em next start local, retorna 503 para operações protegidas pelo contador. Testes unitários podem injetar um stub; integração local precisa executar o Worker com binding real. Não habilitar um bypass por variável de ambiente ou cookie.

MFA confirma getUser e UUID autorizado antes de consumir sua quota; getUser é validação de identidade, não submissão do desafio TOTP. Erros de parsing posteriores ao consumo continuam contados. Uma sessão AAL1 autorizada continua apta a submeter o desafio dentro da quota.

### Casos críticos

Cinco consumos concorrentes permitidos e o sexto recusado; dois adaptadores com o mesmo namespace compartilham quota; recriar a classe com o mesmo armazenamento não zera count; login não bloqueia MFA; alarme atrasado não bloqueia a nova janela; rejeição não estende janela; relógio falso do request ignorado; ausência do binding e resposta malformada falham 503; nenhuma chamada signIn/challenge após 429/503; formulário mantém 429; headers forjados não alteram objeto; CSRF e usuário divergente não consomem a quota correspondente.

## Consequences

### Correções da revisão independente autorizadas em 2026-10-09

As regras abaixo tornam explícita a semântica dos trechos anteriores e governam sua implementação. O proprietário escolheu “Aplicar as correções recomendadas”. O contrato completo foi aceito explicitamente pelo proprietário nesta sessão.

1. A janela é fixa e inicia no primeiro consumo. A expiração ocorre em `now >= expires_at`. Não é janela móvel; até dez tentativas podem ocorrer próximas da fronteira de duas janelas. Esse burst e o esgotamento global por um atacante fazem parte do custo a aceitar.
2. O contador protege somente os handlers administrativos definidos. A API pública do Supabase Auth exige seus próprios controles nativos, com verificação separada. `getUser()` anterior à quota MFA não é limitado por esse bucket. Não afirmar proteção integral da conta ou do tráfego ao Supabase a partir do DO.
3. Inicializar o schema SQLite sincronamente no construtor. Usar `ctx.blockConcurrencyWhile` para coordenar consumo, commit, leitura atual da menor expiração e agendamento do alarme, sem chamadas externas de rede. O callback de alarme usa a mesma coordenação, remove linhas vencidas idempotentemente e reage ao estado atual: agenda a menor expiração remanescente ou remove o alarme se não restar linha. Não agendar com base em leitura antiga. Erro de gravação ou agendamento falha fechado, inclusive depois de quota consumida. Erro no callback de alarme é propagado para retry da plataforma. Toda execução relê o estado persistido. Correção da quota nunca depende de o alarme chegar no horário.
4. Timeout de 2000 ms, Retry-After de 5 segundos em falha, entrada máxima de 128 bytes e resposta interna máxima de 256 bytes são valores propostos de projeto, não medidas empíricas. Limitam espera, repetição imediata e tamanho do protocolo compacto. A entrada e resposta são limitadas por bytes UTF-8 efetivamente lidos, sem confiar apenas em Content-Length. Entrada excedente não altera quota. Medir latência real; ajustes exigem atualizar o contrato.
5. O deadline inclui chamada, leitura limitada e validação completa da resposta. A resposta interna exige Content-Type application/json e schema estrito: 200 com allowed true; 429 com allowed false e retryAfter inteiro entre 1 e 60, idêntico ao header Retry-After. Qualquer divergência falha 503. JSON externo 429: `{ ok: false, error: "rate_limited", retryAfter: número }`; JSON externo 503: `{ ok: false, error: "rate_limit_unavailable", retryAfter: 5 }`. Usar Content-Type application/json; HTML usa text/html; charset=utf-8. Ambos levam Cache-Control private, no-store, X-Robots-Tag noindex, nofollow e Retry-After correspondente ao campo JSON.
6. A prova da integração inclui export da classe no bundle real, binding tipado, migration SQLite e caminho OpenNext efetivamente executado. Testar Worker local com armazenamento persistente: concorrência pelo binding real, encerramento/reabertura do processo preservando quota, fronteira exata da janela, alarme atrasado, erro de gravação/agendamento e timeout após commit. Nos handlers, medir JSON e formulário 429/503, cookies renovados por getUser e ausência de signIn/challenge após recusa. Recriar classe sobre um mock não é evidência de persistência real.

Um atacante com origem declarada válida pode consumir a quota de login e impedir temporariamente o administrador de entrar. Origin é defesa CSRF de navegador, não prova de identidade de quem usa um cliente HTTP. O atacante também pode manter esse bloqueio repetindo tentativas em janelas sucessivas. Este contrato prioriza limitar força bruta distribuída; não garante disponibilidade sob ataque. WAF ou desafio na borda será uma decisão separada se esse custo for inaceitável.

O limite de estado é duas linhas. Não há dados pessoais persistidos pelo contador. O DO cria dependência de disponibilidade para login e desafio, com falha fechada prevista. A entrega não altera matrícula/recuperação MFA, ainda pendentes.

## Build plan

1. Implementar classe DO, schema, transação, expiração e alarme com testes de fronteira, concorrência e reinício (AC-01, AC-02, AC-03, AC-06).
2. Implementar adaptador OpenNext com binding fixo, prazo, validação e respostas 429/503 (AC-04, AC-05).
3. Substituir os Maps dos handlers, posicionar consumo conforme identidade/origem e testar ausência de chamadas proibidas (AC-01, AC-04, AC-05, AC-07).
4. Adicionar export do Worker, binding e migration v2-admin-rate-limit com new_sqlite_classes [AdminRateLimitDO]; preservar namespace de preview (AC-08).
5. Verificar testes unitários, tipos, lint, formatação, build OpenNext, dry-run e Worker local; registrar separadamente prova conectada entre instâncias, HTTP e persistência (todos os ACs). Não presumir PASS remoto a partir de mocks.

## Migration plan

Estratégia: substituição direta de dois controles pequenos após validação local, sem migrar contadores efêmeros. A primeira publicação autorizada inicia quotas persistentes vazias.

Adicionar classe e migration sem remover preview. Validar empacotamento antes de substituir a versão remota. Nenhuma migration ou publicação remota é executada pelo aceite deste documento.

Rollback: reverter a versão da aplicação somente por autorização do proprietário, preservando namespace e migration já criados. Não apagar armazenamento do preview. Reintroduzir Map não restabelece segurança distribuída e deve ser tratado como regressão, não como conclusão do P0. Falha de binding mantém login/MFA fechados até correção ou rollback autorizado.

## References

- [Contrato administrativo existente](2026-10-08-2228-0007-painel-administrativo-tailadmin.md).
- [Registro parcial de endurecimento](2026-10-09-0842-endurecimento-auth-admin.md).
- [Diagnóstico reproduzido](../../check/admin-hardening/2026-10-09-0842/DEBUG.md).
- [Cloudflare: armazenamento SQLite, transações e alarmes](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).

O aceite integral autoriza implementação local e testes. Não autoriza merge ou deploy.
