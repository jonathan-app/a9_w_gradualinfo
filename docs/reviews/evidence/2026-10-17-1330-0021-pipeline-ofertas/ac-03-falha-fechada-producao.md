# Evidência AC-03: Falha fechada em produção sem fallback para memória

**AC**: ofertas-pipeline/AC-03  
**Status**: PASS  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4  

## O que foi verificado

1. **`lib/offers/storage/storage-factory.ts:39-63`**: em produção (`NODE_ENV === 'production'` ou variáveis Cloudflare), a fábrica exige credenciais válidas do Cloudflare R2 (`R2_EVIDENCE_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`). Ausentes ou inacessíveis → lança `EvidenceStorageUnavailableError` imediatamente.
2. Mesmo com credenciais de R2 presentes, a fábrica lança `EvidenceStorageUnavailableError` informando que o adaptador R2 com Bucket Locks está **pendente de validação em infraestrutura real de produção** (linha 60-62). Nenhum fallback para memória volátil ou filesystem local é executado em produção.
3. **`app/api/ingest/ofertas/route.ts:112-122`**: a rota de ingestão retorna HTTP 503 (`secret_missing`) quando `OFFERS_INGEST_SECRET` não está configurado — o segredo sozinho não ativa o pipeline.
4. Teste: `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts` "falha fechada em ambiente de produção sem R2 configurado" confirma que `getOffersEvidenceStorage()` lança `EvidenceStorageUnavailableError` com `NODE_ENV=production` e sem `R2_EVIDENCE_BUCKET`.

## Conclusão

A ausência de armazenamento durável com retenção validada mantém a concessão de selo **falhando fechada (503)** em produção. Definir `OFFERS_INGEST_SECRET` não basta para ativar o pipeline.

## Código relevante

- `lib/offers/storage/storage-factory.ts`
- `app/api/ingest/ofertas/route.ts:112-122`
