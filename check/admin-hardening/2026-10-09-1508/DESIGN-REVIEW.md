# Revisão independente da matrícula e recuperação MFA

Data: 2026-10-09, America/Sao_Paulo. Autorização: proprietário escolheu “Revisão por outro modelo (recomendado)” nesta conversa. Revisor: gpt-6-astra, esforço high, agente somente leitura. Não houve consulta web, recuperação executada ou alteração pelo revisor.

Objeto: `docs/specs/2026-10-09-0842-endurecimento-auth-admin.md`, SHA-256 `b5b4143720f6a2e3c6cfde8548fb73762bf9eb6d848e20a9202a6f58ae22857e`. Contrato relacionado: `docs/specs/2026-10-09-0852-rate-limiting-admin.md`, SHA-256 `2ce0ea3b69f3302a81f18ae06d184c89a5f76d6d817d019633641a2197075e92`. HEAD `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`, árvore com alterações locais. Esta revisão arquitetural não é `/check review`, aprovação do gate ou autorização de produção.

## Lacunas bloqueantes de contrato

1. **Origem contraditória (linhas 20 e 33).** AC-02 rejeita origem ausente, mas o texto admite Referer quando Origin faltar. Um POST sem Origin e com Referer canônico pode ser aceito ou recusado por interpretações diferentes. Recomenda-se declarar a precedência no AC: validar Origin quando presente, Referer canônico somente na ausência de Origin, rejeitar quando ambos faltarem. Isso alinha o complemento ao contrato já existente.
2. **Fonte de AAL incompleta (linhas 23, 63 e 101).** O complemento usa getAuthenticatorAssuranceLevel, sem nomear data.currentLevel nem substituir explicitamente a alternativa de metadados da spec base. Usuário AAL1 com fator verificado pode ter nextLevel aal2, sem ter concluído o desafio. Recomenda-se autorização somente com UUID validado e currentLevel === aal2 da mesma sessão. nextLevel, fatores e metadados não autorizam; falha ou nível ausente bloqueiam. Após confirmação, comprovar AAL2 e aplicar os novos cookies antes de declarar sucesso.
3. **Prazo residual insuficiente (linhas 68 e 89).** A expiração configurada hoje pode ser menor que a de tokens emitidos antes de uma redução. Recomenda-se contar desde a revogação global confirmada, usando limite superior comprovado para tokens anteriores e tolerância do validador. Sem limite seguro e prova de rejeição da sessão antiga, manter contenção pendente.

## Pendências de prova

4. **Concorrência depende da versão real do Auth (linhas 70, 80 e 95).** O índice em master não prova o ambiente executado. Recomenda-se registrar versão/referência imutável e testar duas sessões concorrentes: exatamente um fator final, no máximo uma resposta sensível, nenhuma exclusão/substituição e repetição após resposta perdida sem novo enroll quando houver fator. Se a garantia falhar, interromper e rever o desenho. Não houve duplicação real demonstrada nesta revisão.
5. **Revogação manual ainda precisa de operação verificável (linhas 87–91).** Recomenda-se nomear no runbook a operação oficial disponível, escopo global, entradas e pré-requisitos sem registrar credenciais. Demonstrar em conta controlada que sessões antigas não renovam e, depois do prazo residual, não acessam rotas protegidas. Remover fator pendente não basta para provar revogação.

## Precisão recomendada

6. Nomear prazo das chamadas e da releitura, medir o limite de 1024 bytes efetivamente lidos e explicitar schema estrito de objeto vazio no POST. Os valores precisam de fonte no contrato.
7. Acrescentar provas de ausência do segredo em traces, replay, erros, logs e artefatos de teste; limpeza após confirmação, logout e navegação; QR sem recurso externo.
8. Explicitar recuperação com múltiplos fatores: usar fator válido remanescente ou decisão manual específica. Se outro TOTP permanecer, o endpoint não deve prometer nova matrícula.
9. Descrever convergência para um único fator: repetição recebe 409 e não reproduz payload sensível. Não prometer recuperação do segredo pela idempotência.

Rate limiting separado, proibição de retry automático e preservação do fator vencedor são consistentes. Não há recomendação de ampliar o contador para matrícula nesta revisão.

## Decisão requerida

Recomenda-se aplicar os ajustes de contrato e manter provas reais como pendentes até execução. Para o novo prazo, recomenda-se deadline total de 10000 ms por operação de matrícula, incluindo consulta, enroll e releitura, com encerramento sem retry automático; é proposta, não medição de latência. Se uma chamada ao provedor terminar depois do deadline, a operação seguinte deve consultar o estado sem desfazer fator. Uma duração diferente pode ser definida pelo proprietário.

O proprietário deve escolher aplicar as correções recomendadas, responder cada lacuna ou deixar as decisões para depois. Nenhuma lacuna arquitetural foi corrigida automaticamente. A recuperação manual já aprovada é preservada. Mesmo depois da correção, o aceite integral da matrícula é uma decisão separada.
