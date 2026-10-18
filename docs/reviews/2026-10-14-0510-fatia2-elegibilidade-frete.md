# Revisão técnica · Spec 0017, Fatia 2: elegibilidade de frete

**Data:** 2026-10-14  
**Estado:** integrado na árvore canônica; validação empírica local 100% PASS (136 pgTAP / 623 Vitest).  
**Escopo:** somente ambiente local isolado; nenhuma conexão com Supabase remoto e nenhum deploy Cloudflare.

## Artefatos integrados

- `supabase/migrations/20261013020000_modulo_ofertas_elegibilidade_frete.sql`
- `supabase/tests/database/shipping_eligibility.test.sql`
- `lib/offers/shipping-validation.ts`
- `__tests__/unit/lib/offers/shipping-validation.test.ts`
- `docs/specs/2026-10-14-0510-0017-fatia2-elegibilidade-frete-adendo.md`

## Decisões técnicas

- Comparação de 15% inclusiva com centavos inteiros. A função SQL usa `bigint`; TypeScript usa `BigInt` para evitar perda de precisão no produto cruzado.
- Exceções tipadas como `bulky_product` ou `remote_region`, com escopo mutuamente exclusivo, validade, descrição, origem da prova e SHA-256.
- Exceções não liberam automaticamente o selo: a função SQL exige log de auditoria da oferta com `admin_aal2`, `rule_applied` vinculado ao ID da exceção e hash exato da evidência.
- A função SQL usa `SECURITY DEFINER`, `search_path = ''`, owner `postgres` e execução apenas para `service_role`.
- O catálogo é operacional e não pode ser lido por `anon` ou `authenticated`.
- O validador TypeScript é puro e não concede selo nem substitui validação autoritativa no banco.

## Verificação empírica local

Testes executados com sucesso no ambiente local (Supabase sob Podman/Docker):

1. `pnpm supabase:reset`: exit code 0. Migrations aplicadas até `20261013020000_modulo_ofertas_elegibilidade_frete.sql` e seed carregado.
2. `pnpm supabase:test`: exit code 0. 136/136 asserções aprovadas em 4 suítes (28 módulo de ofertas, 22 classificador de outliers, 23 elegibilidade de frete e 63 RLS posts).
3. `pnpm test:run __tests__/unit/lib/offers/shipping-validation.test.ts`: exit code 0 (12/12 testes Vitest PASS).
4. `pnpm check:all`: exit code 0 (typecheck 0 erros, ESLint 0 erros, Prettier format:check 100% PASS, 623/623 testes Vitest em 58 arquivos PASS).

## Riscos e limites restantes

- Esta fatia fornece avaliador e catálogo, mas não integra automaticamente a função a uma rota de concessão de selo existente, cuja implementação não estava disponível no snapshot usado para preparar os arquivos. A integração é condição de aceite funcional ponta a ponta.
- A camada TypeScript recebe IDs de exceções auditadas como input confiável para facilitar teste unitário; a validação do hash e da origem administrativa deve ocorrer na função SQL antes de conceder selo.
- O caminho `evidence_storage_path` e o hash são registrados, mas o bucket WORM, imutabilidade de objetos e retenção hot/cold pertencem à Fatia 4 e continuam pendentes.
- Nenhum arquivo foi aplicado a produção e nenhum deploy foi realizado.
