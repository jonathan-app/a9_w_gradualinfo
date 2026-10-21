## /test ofertas · all 968 passed

**Wrote 11 new tests across 3 files (happy path / edges / errors / a11y). 968 passed via `pnpm test:run`.**

Next: all pass → `/check review` se ainda houver revisão pendente, else `/sync` ou a próxima feature.

Heads up: 11 testes de regressão novos cobrem gaps reais:

- `lib/offers/evidence-canonicalizer.test.ts`: objeto vazio `{}`, array vazio `[]`, arrays aninhados com ordem preservada, valores booleanos, null explícito misto com booleanos
- `lib/offers/webhook-auth.test.ts`: assinatura sem prefixo `v1=` (apenas hex direto), nonce exatamente no limite de expiração (exp <= now)
- `app/api/admin/ofertas/[id]/avaliar-selo.test.ts`: ação `renovacao`, `service_client_unavailable` → 503 quando `SUPABASE_SERVICE_ROLE_KEY` ausente, `advertised_ean` nulo, `captured_at` vazio/ausente

**Mock de `@/lib/supabase/server` adicionado** ao teste de rota para evitar `cookies()` fora do escopo Next; `createClient` sobrescrito com `mockImplementationOnce` no teste do 503.

**Not covered** (consider adding):

- Concorrência real de nonces no PostgreSQL (duas conexões independentes) — pendente para `/check verify` em ambiente de teste com banco real
- Integração E2E completa da rota `/api/admin/ofertas/[id]/avaliar-selo` com Playwright
