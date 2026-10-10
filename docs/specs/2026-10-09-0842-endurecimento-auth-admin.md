# Complemento corretivo da spec 0007

Data: 2026-10-09 08:42, America/Sao_Paulo.

**Status**: Accepted

**Decision source**: Recuperação manual aprovada pelo proprietário em 2026-10-09 nesta conversa: “Sim, procedimento manual pelo proprietário”. Identidade, origem e cookies seguem a spec 0007 Accepted; rate limiting segue o contrato Accepted de 08:52. O novo contrato de matrícula abaixo é uma recomendação para aceite, não foi aprovado por essa resposta sobre recuperação.

O proprietário autorizou revisão independente por outro modelo e aprovou “Aplicar correções recomendadas” nesta conversa, em 2026-10-09. Ajustes incorporados conforme `check/admin-hardening/2026-10-09-1508/DESIGN-REVIEW.md`, incluindo deadline total de 10000 ms. O proprietário aceitou o contrato completo corrigido nesta conversa em 2026-10-09: “Aceitar e implementar localmente”. Autoriza implementação local, não merge, deploy nem recuperação da conta real.

## Summary

A conta administrativa continuará usando Supabase Auth e TOTP. A recuperação será manual pelo proprietário, sem endpoint público. A proposta de matrícula elimina efeitos colaterais em GET, preserva o segredo apenas na resposta inicial e trata repetição sem criar outro fator. O aceite integral e a prova de concorrência no Supabase continuam pendentes.

## Context

O diagnóstico de 14:43 reproduziu duas chamadas enroll em duas renderizações GET com lista vazia e erro sintético. Já existe endpoint POST para matrícula, mas a página ainda cria fatores diretamente. Não há prova de duplicação de fatores reais. O objetivo é corrigir o fluxo existente sem novo provedor, contador ou armazenamento de segredos.

## Requirements

- **admin-mfa/AC-01**: GET de setup consulta identidade/fatores e apresenta estado, sem enroll, unenroll ou criação de desafio, inclusive em refresh, prefetch e renderização repetida.
- **admin-mfa/AC-02**: POST de matrícula valida Origin quando presente; somente se Origin faltar admite Referer canônico. Origin inválido não pode ser compensado por Referer válido, e ausência de ambos é rejeitada. UUID ausente, inválido ou divergente bloqueia antes de enroll. Uma sessão AAL1 autorizada pode matricular seu primeiro TOTP, mas não acessar operações administrativas.
- **admin-mfa/AC-03**: Havendo fator TOTP pendente ou verificado, repetir POST não chama enroll nem remove fatores. Requisições concorrentes com o mesmo nome fixo deixam no máximo um novo fator e nunca disparam retry automático após timeout.
- **admin-mfa/AC-04**: Secret, URI e QR são exibidos somente na resposta inicial de matrícula autorizada, nunca em URL, cookies, logs, telemetria, armazenamento do browser ou cache compartilhado. Todas as respostas do fluxo levam private, no-store e noindex, nofollow.
- **admin-mfa/AC-05**: Fator pendente pode ser confirmado com o código do autenticador. Se o proprietário perdeu o segredo antes de cadastrá-lo, o fluxo informa recuperação manual, sem rematrícula automática. Acesso administrativo exige UUID validado e data.currentLevel === 'aal2' da mesma sessão em getAuthenticatorAssuranceLevel. nextLevel, metadados e presença/status de fator não autorizam. Falha ou nível ausente bloqueia. Após confirmação, comprovar currentLevel AAL2 e aplicar cookies atualizados antes de declarar sucesso.
- **admin-mfa/AC-06**: Procedimento manual verifica projeto/UUID, remove o fator escolhido, revoga sessões, considera a validade residual dos JWTs e comprova nova matrícula/AAL2. Nenhum endpoint público de recuperação é criado.
- **admin-mfa/AC-07**: A implementação preserva cookies SSR, rate limiting aceito, leitura pública, preview e configurações do Worker. Cadastro público desativado e recuperação conectada são provas separadas, não inferidas por mocks.

Fonte: pedido do proprietário com os cinco P0 e aprovação explícita nesta sessão, “Aprovar Durable Object dedicado”. A spec `0007-painel-administrativo-tailadmin.md` continua sendo o contrato base.

## Correções já cobertas pelo contrato

Após autenticação por senha, conferir UUID administrativo válido e encerrar sessão divergente antes de MFA. Resposta genérica igual a credenciais inválidas. Configuração inválida bloqueia operação.

Mutações exigem Origin canônico, ou Referer canônico quando Origin estiver ausente. Origin inválido não recupera acesso via Referer. URL ou Host da requisição não são fonte de confiança. Exceção de origem local é exclusiva de desenvolvimento, com host local, protocolo e porta correspondentes.

A sincronização SSR de cookies permanece no cliente Supabase por requisição. Respostas devem preservar as opções fornecidas por setAll, incluindo expiração e remoção, em login, MFA e logout. Não copiar cookies recebidos como se fossem cookies novos de sessão.

## Decisão do contador

Durable Object dedicado, separado do preview. Contador compartilhado e atômico. Login e MFA têm buckets distintos. Indisponibilidade responde 503, sem autenticar ou submeter desafio.

Os parâmetros e o aceite integral constam de [rate limiting administrativo](2026-10-09-0852-rate-limiting-admin.md). Este complemento não redefine quotas nem amplia o contador para matrícula.

## Options considered

Manter enroll no GET perpetua o efeito colateral reproduzido. Corrigir o POST existente é a recomendação, pois preserva SSR e reduz a superfície de mudança. Persistir e reapresentar o segredo permitiria retomar a matrícula depois de refresh, mas acrescentaria armazenamento sensível e não é proposto. Recuperação automática pública não corresponde à decisão do proprietário.

## Decision

Recuperação manual pelo proprietário está aprovada. Recomenda-se corrigir a matrícula no endpoint POST existente, sem guardar nem reapresentar o segredo. Repetição converge para estado pendente ou verificado, sem repetir o payload sensível da primeira resposta. O contrato completo foi aceito explicitamente para implementação local.

## Rationale

A perda da resposta inicial poderá exigir intervenção manual. Esse custo evita um novo repositório de segredos TOTP. A unicidade do nome fixo no Supabase é a proteção proposta contra corrida de matrícula, além da consulta prévia de fatores. Consulta prévia sozinha não é atômica.

## Feature design

### Estado e fontes de valores

| Valor                     | Fonte                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade autorizada     | auth.getUser e env.adminUserId com UUID_PATTERN                                                                                                                             |
| Origem permitida          | validateAdminRequestOrigin e SITE_ORIGIN                                                                                                                                    |
| AAL e fatores             | data.currentLevel de getAuthenticatorAssuranceLevel na mesma sessão e listFactors, incluindo all para pendentes                                                             |
| Nome/issuer               | Constantes existentes Admin Authenticator e GradualInfo, nunca dados do cliente                                                                                             |
| factorId, secret, URI, QR | Resposta inicial de supabase.auth.mfa.enroll, sem cópia persistente                                                                                                         |
| Código de confirmação     | Entrada do formulário existente, seis dígitos, nunca logada                                                                                                                 |
| Destino após verificação  | sanitizeAdminRedirect, conforme contrato existente                                                                                                                          |
| Prazo de JWT residual     | Limite superior comprovado para tokens emitidos antes da revogação global, incluindo histórico de expiração e tolerância do validador, contado desde a revogação confirmada |
| Deadline da matrícula     | Constante aprovada de 10000 ms, abrangendo consulta, enroll e releitura                                                                                                     |

Sem tabela nova ou alteração de auth.mfa_factors pela aplicação. Sem Map ou lock em memória para concorrência. O schema oficial do Supabase tem índice único para nome não vazio por usuário, mas a prova de comportamento precisa ocorrer na versão do Auth usada pelo projeto. Não presumir que a consulta prévia elimina corrida, nem que o conflito do SDK sempre tem o mesmo código.

Registrar versão do Auth e referência imutável do schema efetivamente exercitado, não apenas link para master. Testar duas sessões concorrentes com lista inicialmente vazia: exatamente um fator final, no máximo uma resposta contendo segredo, nenhuma exclusão ou substituição do vencedor. Após resposta perdida, repetir sem novo enroll quando o fator já existir. Falha dessa garantia exige interromper a implementação do requisito e revisar a decisão, sem substituir por lock volátil.

A fonte de AAL acima prevalece sobre qualquer alternativa de user.app_metadata.aal descrita na spec base 0007. Não usar nextLevel como nível atual. A comprovação após challengeAndVerify ocorre com o mesmo cliente SSR da sessão elevada, seguida da aplicação dos cookies emitidos pelo SDK.

### API e interface propostas

GET `/admin-dashboard/mfa/setup` mantém guardas e apresenta botão explícito para iniciar matrícula. Uma folha client faz POST JSON `{}` a `/api/admin/auth/mfa/enroll`, com credenciais da sessão, sem tokens no corpo. JSON inválido recebe 400, tipo diferente de application/json recebe 415; o corpo lido tem limite proposto de 1024 bytes, excedente 413. Origin e identidade são verificados antes de ler o corpo. Respostas de erro também são privadas.

O schema permitido é objeto JSON vazio, sem campos adicionais; null, array e valores escalares recebem 400. O limite usa bytes UTF-8 efetivamente lidos, inclusive em transferência sem Content-Length. Nenhum campo do cliente escolhe issuer, nome ou usuário do fator.

Sucesso novo: 200 com `{ ok: true, factorId, qrCode, secret, uri }`, preservando nomes atuais. A folha guarda o resultado somente em estado React, limpa ao sair/desmontar e envia factorId e código ao endpoint existente de verificação. Não usar localStorage, sessionStorage, query string ou cookies para o segredo. Desabilitar observabilidade de payload e replay na superfície que mostra QR/segredo. Não incluir dados sensíveis em mensagens de erro.

Fator pendente ou verificado: 409 com `{ ok: false, error: 'factor_exists', next: '/admin-dashboard/mfa/verify' }`, sem secret. Mostrar orientação de desafio e alternativa de recuperação manual se o autenticador não tiver sido configurado. Sessão já AAL2 não cria fator, devolve 409 com error 'already_verified' e next fixo '/admin-dashboard'. Origem/identidade recusadas: 403; configuração administrativa inválida: 503; erro de SDK/consulta ou resultado incerto: 503 com error 'mfa_unavailable'. Não devolver detalhe de provedor.

Antes de enroll, consultar todos os TOTP. Havendo qualquer um, não criar outro. Sem fator, usar o nome fixo existente. Se enroll falhar, reler fatores: nome fixo agora presente resulta em 409 sem segredo, caso contrário 503. Não desfazer matrícula vencedora nem repetir enroll automaticamente. Após timeout ou resposta perdida, a tentativa seguinte consulta fatores e informa pendência. Múltiplos fatores preexistentes exigem orientação manual, nunca exclusão automática.

O prazo total de 10000 ms começa antes da primeira consulta MFA e abrange consulta, enroll e releitura. Ao vencer, encerrar a espera com 503 genérico sem retry automático nem nova chamada. Usar cancelamento do transporte quando disponível, sem presumir que cancelamento desfaz uma escrita do provedor. Uma chamada que terminar depois do prazo não pode disparar releitura, rematrícula ou compensação automática; uma tentativa posterior consulta o estado. Essa é convergência para um fator, não repetição do payload sensível: POST repetido recebe 409 sem reapresentar segredo.

GET de setup e desafio leva private, no-store e noindex, nofollow pela fronteira HTTP apropriada. Não confiar somente no metadado do componente para controlar headers. Verificação confere que factorId pertence aos TOTP do usuário autorizado antes de challengeAndVerify e aplica a quota MFA já aceita. Nenhuma credencial de administração Supabase entra no bundle ou nas rotas da aplicação.

A prova de proteção inspeciona logs, traces, replay, erros e artefatos de teste para ausência de segredo/URI/QR. Não salvar screenshots ou dumps sensíveis como evidência. Usar QR retornado pelo SDK sem serviço externo. Limpar estado de matrícula após confirmação, logout e navegação, incluindo retorno pelo histórico do navegador; testar cada evento. Capturas de falhas não podem incluir payload ou DOM do segredo.

### Recuperação manual aprovada

1. O proprietário acessa sua conta da plataforma Supabase por canal já confiável e confirma o projeto e o UUID cadastrado em ADMIN_USER_ID. Não aceitar solicitação de recuperação apenas porque alguém conhece o e-mail do administrador.
2. Inspeciona os fatores do usuário e remove apenas o TOTP identificado como perdido, pela administração oficial do Supabase. Se o painel não oferecer a operação, usar Admin API em estação confiável; credencial administrativa permanece fora da aplicação, repositório e comandos/logs compartilhados.
3. Revoga as sessões do usuário e verifica o resultado. Remover fator verificado encerra sessões segundo a documentação; fator pendente não implica essa revogação, portanto ela deve ser executada/verificada separadamente. Apagar cookie de um navegador não é prova de revogação global. Antes de executar, o runbook deve nomear a operação oficial de revogação disponível no ambiente, seu escopo global, pré-requisitos e entradas, sem registrar credenciais. Não declarar o procedimento operacionalmente validado enquanto esse caminho não for comprovado em conta controlada. Demonstrar que sessões anteriores não renovam e que uma nova sessão posterior à revogação consegue seguir o fluxo permitido.
4. Registra o horário de confirmação da revogação global e um limite superior comprovado para validade dos tokens anteriores, considerando configurações antigas e tolerância do validador. A expiração atual reduzida não é evidência suficiente. O prazo é contado desde a revogação global confirmada, não desde a remoção do fator ou do cookie local. Tokens de acesso já emitidos podem continuar válidos até expirar. Não prometer invalidação imediata. Sem limite comprovado ou sem prova de rejeição das sessões antigas após esse prazo, manter contenção pendente. Caso haja suspeita de comprometimento que exija bloqueio imediato, parar e decidir contenção explícita com o proprietário, sem presumir deploy ou mudança remota autorizada.
5. Em nova sessão, o proprietário entra com senha, inicia POST de matrícula, configura autenticador e confirma TOTP. Testa bloqueio AAL1 e acesso AAL2. Não alterar ADMIN_USER_ID nem desabilitar a exigência MFA para recuperar acesso.
6. Evidência contém horário, projeto identificado sem credenciais, resultado de revogação e testes, nunca senha, token, QR ou segredo. Validar primeiro em ambiente controlado com conta de teste própria, sem remover o fator real do proprietário por este aceite documental.

Com múltiplos fatores, usar um TOTP válido remanescente para desafio, se disponível. Se outro fator permanecer e nenhum for utilizável, o proprietário precisa decidir manualmente qual remover no canal confiável; não excluir todos automaticamente. Nova matrícula só é oferecida quando não restar TOTP, portanto o procedimento não promete nova matrícula após toda remoção parcial.

## Consequences

Perder a resposta inicial pode exigir intervenção manual. O nome fixo restringe este fluxo a um fator e não permite expansão silenciosa para múltiplos autenticadores. A unicidade precisa de prova de integração com chamadas simultâneas. Recuperação não garante invalidação imediata de JWT. Estas limitações devem estar claras no aceite.

## Build plan

1. Remover enroll do GET e introduzir botão/folha de matrícula com dados sensíveis apenas em memória, satisfaz AC-01, AC-04 e AC-05.
2. Endurecer POST existente, parsing limitado, guardas, leitura de fatores, conflitos e preservação SSR, satisfaz AC-02, AC-03, AC-04 e AC-07.
3. Validar propriedade do fator no desafio, preservar quota e confirmar AAL2, satisfaz AC-05 e AC-07.
4. Documentar o procedimento manual e exercitá-lo em ambiente controlado, satisfaz AC-06.
5. Executar regressões, prova HTTP de cache/cookies, matrícula concorrente no Auth real e checks do Worker, satisfaz AC-01 a AC-07. Relatar cada prova conectada ausente como UNVERIFIABLE.

## Follow-up

Solicitar revisão independente e aceite do contrato completo de matrícula. Provar configuração remota de cadastro público diretamente no Supabase e validar controles no Worker sem presumir autorização de deploy. Esta atualização é documental, não execução do procedimento de recuperação nem aprovação de produção.

Revisão independente concluída, correções recomendadas aplicadas por autorização explícita do proprietário. Aceite integral da matrícula registrado em 2026-10-09. Provas de concorrência no Auth e runbook de revogação com operação real permanecem UNVERIFIABLE até execução, não são resolvidas pela correção textual.

## References

- [Diagnóstico atual](../../check/admin-hardening/2026-10-09-1443/DEBUG.md).
- [Contrato base](2026-10-08-2228-0007-painel-administrativo-tailadmin.md).
- [Supabase: encerramento de sessões e validade de JWT](https://supabase.com/docs/guides/auth/signout).
- [Supabase: remoção administrativa de fator](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor).
- [Supabase Auth: índice único de nome por usuário](https://github.com/supabase/auth/blob/master/migrations/20221003041349_add_mfa_schema.up.sql).
