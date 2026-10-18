# Evidência AC-03: Falha fechada em produção sem fallback para memória

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-03`  
**Status**: PASS  

## Descrição e comprovação empírica

A resolução de adaptadores no módulo `lib/offers/storage/storage-factory.ts` impõe política fail-closed incondicional para o ambiente de produção.

1. **Blindagem contra memória volátil**:
   * Quando `NODE_ENV === 'production'` ou flags do runtime Cloudflare (`CF_PAGES`, `WORKERS_ENV`) estão ativas, a fábrica verifica rigorosamente a configuração das variáveis de nuvem para Cloudflare R2 com retenção imutável.
   * Na ausência ou falha de credenciais do R2, a fábrica lança imediatamente `EvidenceStorageUnavailableError`, impedindo a concessão de selos sem garantia probatória permanente.
   * É terminantemente proibido qualquer fallback silencioso para adaptadores em memória volátil em ambiente de produção.
2. **Validação automatizada**:
   * Teste unitário `falha fechada em ambiente de produção sem R2 configurado (proibindo fallback para memória)` em `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts` comprova que a execução lança `EvidenceStorageUnavailableError` quando executada sob `NODE_ENV = 'production'`.
