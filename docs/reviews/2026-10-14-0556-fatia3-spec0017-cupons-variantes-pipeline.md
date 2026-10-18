# Revisão local: Spec 0017 / Fatia 3

**Status:** integrado na árvore canônica com as Fatias 1 e 2; validação empírica local 100% PASS (152 pgTAP / 632 Vitest).  
**Escopo:** cupons, identidade SKU/variante, preço efetivo, pipeline transacional do selo e regressão completa.  
**Ambiente:** Supabase local sob Podman/Docker; sem produção, sem Cloudflare, sem push.

## Alterações integradas

- `supabase/migrations/20261013030000_modulo_ofertas_pipeline_selo_cupons.sql`
  - catálogo de cupons `universal` ou `restricted`, com descontos fixos em centavos ou percentuais em basis points;
  - validação de vigência, escopo por loja/produto/variante e unicidade case-insensitive do código;
  - SKU e chave de variante no catálogo canônico;
  - colunas para preço efetivo auditado e cupom usado;
  - função `evaluate_and_set_verified_price` `SECURITY DEFINER`, `search_path = ''`, proprietária `postgres`, execução limitada a `service_role`;
  - valida SKU, EAN quando presente, JSONB da variante, cupom universal, mediana histórica, frete e auditoria append-only; concede/renova por no máximo 24 horas;
  - exceção de frete exige igualdade exata entre o hash da evidência submetida e o hash cadastrado na exceção. O log de aprovação é inserido na mesma transação antes de chamar o avaliador de frete, para satisfazer o contrato de auditoria existente. Se a avaliação final divergir, a função levanta exceção e a transação reverte.
- `lib/offers/coupon-validation.ts`: cálculo em centavos inteiros/BigInt para percentual, rejeição fail-closed de cupons restritivos e escopos incompatíveis.
- `lib/offers/variant-validation.ts`: comparação exata de SKU, EAN e parâmetros de variante, independente da ordem das chaves JSON.
- `lib/offers/verified-price-pipeline.ts`: avaliador de integração com decisão fail-closed e expiração de 24 horas.
- Testes Vitest adicionados para cupons, variantes e caminho integrado.
- `supabase/tests/database/offers_pipeline.test.sql`: contratos de schema, RLS, privilégios e restrições de cupons.

## Regras formalizadas

1. Somente cupons públicos universais podem ser usados no selo geral. Cupons restritos a novos clientes, cartões ou fidelidade são recusados.
2. `percent_bps = 10000` representa 100%; o desconto percentual arredonda para baixo em centavos inteiros. Desconto igual/superior ao preço-base é inválido.
3. SKU é obrigatório e deve coincidir exatamente. Se o catálogo tiver EAN, o EAN anunciado é obrigatório e precisa coincidir. A variante anunciada precisa ser idêntica a `products.specs_json`.
4. O preço efetivo após cupom universal deve ser estritamente inferior à mediana histórica disponível.
5. O frete é avaliado contra o preço efetivo auditado. Exceções exigem evidência com hash exato e log AAL2 correspondente.
6. Falhas de identidade ou cupom bloqueiam o selo; histórico insuficiente mantém `unverified`; aprovação expira em 24 horas.

## Verificação empírica local

Testes executados com sucesso no ambiente local (Supabase sob Podman/Docker):

1. `pnpm supabase:reset`: exit code 0. 9 migrations aplicadas em ordem sequencial (incluindo `20261013010000` Fatia 1, `20261013020000` Fatia 2 e `20261013030000` Fatia 3) e seed carregado.
2. `pnpm supabase:test`: exit code 0. 152/152 asserções aprovadas em 5 suítes (28 módulo de ofertas, 22 classificador de outliers, 16 pipeline do selo/cupons, 23 elegibilidade de frete e 63 RLS posts).
3. `pnpm test:run`: exit code 0 para as suítes unitárias da Fatia 3 (15/15 testes PASS: 4 variant, 6 coupon, 5 pipeline).
4. `pnpm check:all`: exit code 0 (typecheck 0 erros, ESLint 0 erros, Prettier format:check 100% PASS, 632/632 testes Vitest em 60 arquivos PASS).

## Limitações e gaps que permanecem

- **Classificador de outliers (Fatia 1):** Resolvido na árvore canônica com `20261013010000_modulo_ofertas_classificador_outliers.sql` integrado entre a base e as Fatias 2/3.
- A comparação da variante usa igualdade JSONB integral de `products.specs_json`. Confirmar que os produtores enviam o objeto completo e canônico, sem campos voláteis de anúncio.
- O código de banco mantém auditoria append-only, mas **não implementa nem prova sozinho armazenamento WORM físico**, Object Lock, lifecycle policy ou CDC com 730 dias hot + 5 anos cold. Isso pertence à Fatia 4 e depende de infraestrutura.
- A API de produção/coletores ainda precisa chamar a função RPC com o contrato correto; rota de concessão/renovação de API ainda não foi construída.
- A função SQL exige que o hash enviado no pipeline seja o mesmo hash da exceção de frete. Se a evidência geral e a evidência da exceção forem objetos distintos, o contrato precisará ser expandido para receber e auditar hashes separados, sem afrouxar a igualdade.

## Próximas verificações necessárias

1. Integrar o classificador de outliers original e executar todas as migrations em Supabase local limpo.
2. Rodar `pnpm supabase:reset`, `pnpm supabase:test`, `pnpm check:all` e adicionar uma prova pgTAP transacional de concessão e renovação aprovada/reprovada, incluindo rollback e exceção de frete com hash exato.
3. Confirmar se `offers.price_cents` representa preço-base e se `verified_effective_price_cents` é o campo consumido pelo frontend para a oferta com cupom.
4. Conectar a chamada RPC à API/worker local e testar um fluxo ponta a ponta sem credenciais ou serviços de produção.
5. Configurar e comprovar storage WORM/retention policy separadamente antes de declarar AC de retenção como concluído.
