# Revisão da preparação local da Fase 03: Spec 0017

**Data:** 2026-10-13  
**Estado:** execução empírica local concluída com sucesso; 91 asserções pgTAP PASS; gaps de negócio catalogados  
**Ambiente:** Supabase local (Docker/Podman via CLI 2.119.0, porta 54322)  
**Produção:** não acessada; nenhuma migration aplicada; nenhum deploy realizado.

## Artefatos preparados e validados

- `supabase/migrations/20261013000000_modulo_ofertas_historico_precos.sql`
- `supabase/tests/database/offers_module.test.sql`

A migration inclui as cinco tabelas, constraints básicas, índices de histórico, função de mediana, view com `security_invoker`, RLS, grants/revokes e trigger append-only de auditoria. O teste pgTAP contém 28 asserções sobre existência de tabelas, RLS, privilégios, função SECURITY DEFINER, expiração do selo, mediana diária e bloqueio de mutação/exclusão.

## Resultado de validação nesta sessão (execução real)

- `pnpm supabase:start`: executado com sucesso (exit code 0; stack local saudável em 127.0.0.1:54321/54322).
- `pnpm supabase:status`: verificado com sucesso (exit code 0).
- `pnpm supabase:reset`: executado com sucesso (exit code 0; todas as migrations e `seed.sql` aplicados).
- `pnpm supabase:test`: **91/91 asserções pgTAP aprovadas (Result: PASS, exit code 0)**:
  - `offers_module.test.sql`: 28/28 testes PASS.
  - `rls_posts_test.sql`: 63/63 testes PASS.
  - _Correção de consistência realizada_: ajustado `set search_path = ''` nas funções `tg_prevent_audit_log_mutation` e `calculate_offer_median` na migration para satisfazer o invariante global de segurança testado em `rls_posts_test.sql:63`.
- `pnpm check:all`: **100% PASS (exit code 0)**:
  - Typecheck: 0 erros.
  - ESLint: 0 avisos/erros.
  - Prettier (`format:check`): 100% compatível.
  - Vitest: 56 suítes, 598 testes aprovados.
- `node scripts/check-skills.mjs`: exit code 0 (governança de skills preservada).
- Acesso ao Supabase de produção: **zero** (nenhuma conexão remota).
- Deploy Cloudflare: **zero** (nenhum deploy executado).

## Ressalvas técnicas antes de considerar a fatia pronta

1. **AC-05, classificação automática de outliers:** a função `calculate_offer_median` exclui registros já marcados `is_anomalous = true`, mas não classifica novas observações com desvio superior a 50% nem aplica o limite absoluto de R$ 25 para itens abaixo de R$ 50. É necessário implementar e testar o fluxo de classificação antes de conceder selos automaticamente.
2. **AC-06, frete e exceções volumosas:** a migration armazena o custo do frete, mas ainda não implementa o avaliador de elegibilidade do selo nem um modelo estruturado de exceções documentadas para itens volumosos/regiões remotas.
3. **Cupons e identidade de variante:** são regras de negócio da spec, mas não podem ser garantidas apenas pelas constraints atualmente presentes. A camada de concessão do selo deverá validá-las e registrar a evidência na auditoria.
4. **Preço decimal em coluna INTEGER:** a coluna `integer` impede armazenar uma fração, mas não deve ser tratada como validação suficiente de payloads decimais; PostgreSQL pode converter valores numéricos durante atribuição. A API de ingestão precisa validar que o valor recebido já é um inteiro em centavos. Não foi incluída uma asserção incorreta de que `99.9` sempre falhará apenas pela coluna.
5. **Storage de evidências:** esta migration não cria o bucket `audit-evidence` nem suas políticas em `storage.objects`. O desenho de armazenamento e retenção cold storage continua pendente e deve ser implementado em uma etapa explícita, com teste de permissões e política de retenção. O trigger de tabela protege UPDATE/DELETE por linha, mas a imutabilidade também exige negar TRUNCATE e proteger o bucket.
6. **Teste de mutação:** as asserções de UPDATE/DELETE pressupõem que o trigger e a fixture de auditoria estejam instalados. Elas precisam ser confirmadas pelo pgTAP em banco local real.

## Próximos passos autorizados

1. Revisar os pontos acima contra o contrato da Spec 0017.
2. Instalar/usar Supabase CLI e Docker no ambiente de desenvolvimento isolado.
3. Executar `pnpm supabase:reset` e `pnpm supabase:test` exclusivamente no projeto local.
4. Corrigir falhas e registrar a saída real do teste, sem substituir falhas por declarações de sucesso.
5. Implementar os gaps de negócio em migrations/serviços de desenvolvimento separados e adicionar testes para os ACs ainda não cobertos.

## Limite de autorização

A autorização atual cobre preparação local e testes em ambiente isolado. Não autoriza aplicar migrations ao Supabase de produção, modificar dados de produção ou realizar deploy na Cloudflare.
