# lib/offers/AGENTS.md — contexto do módulo de ofertas e selo verificado

> Contexto durável do módulo de ofertas da Fase 03 (Spec 0017, Fatias 1 a 4).
> Mantido cirurgicamente pelo fluxo agêntico.

## O que este módulo é

Conjunto de serviços e utilitários puros para o pipeline de auditoria comercial,
concessão do Selo de Preço Verificado, cálculo de histórico, validação de frete e
cupons, canonização de evidências e retenção imutável WORM.

## Componentes do módulo

- `coupon-validation.ts`: validação de cupons universais e restritos; cálculo em centavos e basis points (`percent_bps = 10000` para 100%); rejeição fail-closed de cupons com restrições a novos usuários ou meios de pagamento.
- `variant-validation.ts`: comparação determinística de SKU, EAN e variantes técnicas (`specs_json`), independente da ordenação de chaves.
- `shipping-validation.ts`: validação de elegibilidade de frete e catálogo de exceções volumosas amarradas a evidência e log AAL2.
- `outlier-classifier.ts`: classificador de preços anômalos (> 50% relativo com salvaguarda cumulativa de R$ 25 para itens < R$ 50) blindando a mediana.
- `verified-price-pipeline.ts`: integrador do pipeline transacional com expiração máxima de 24 horas.
- `evidence-canonicalizer.ts`: serialização canônica pura compatível com RFC 8785 (JCS) e digest SHA-256.
- `webhook-auth.ts`: verificação de assinatura HMAC-SHA256 com janela de 300s e `MemoryNonceCache` anti-replay (auto-sweep a cada 60s e teto FIFO de 5000 entradas).
- `service-client.ts`: cliente isolado com `server-only` consumindo `service_role` com cookies e sessões desativadas para execução segura de RPCs com privilégio elevado (`evaluate_and_set_verified_price`).
- `storage/evidence-storage-adapter.ts`: contratos tipados e classes de erro do storage probatório.
- `storage/filesystem-adapter.ts`: adaptador de teste e desenvolvimento em disco (`FilesystemEvidenceStorageAdapter`) com escrita atômica via linkagem física POSIX (`fs.linkSync`), proteção contra substituição de destino testada entre processos independentes do sistema operacional, expurgo de temporários com verificação estrita de vivacidade (`process.kill(pid, 0)` preservando processos ativos e `EPERM`), e permissão restritiva de leitura (`0o444`), restrito ao ambiente local e sujeito a revisão durante o status Proposed da Spec 0021.
- `storage/storage-factory.ts`: fábrica de storage (`getOffersEvidenceStorage`) com falha fechada (`EvidenceStorageUnavailableError`) em produção se R2 não configurado, e adaptador de filesystem em desenvolvimento e testes.
- `storage/memory-adapter.ts`: adaptador de storage em memória para testes unitários isolados, proibido em produção.

## Convenções estabelecidas

1. **Valores monetários sempre em centavos inteiros:** Nenhum cálculo de preço utiliza ponto flutuante (`float`/`double`). Cupons percentuais usam basis points inteiros.
2. **Fail-Closed obrigatório:** Em caso de indisponibilidade de storage, timeout ou inconsistência de metadados, a concessão do selo aborta sem alterar o banco de dados.
3. **Persistência de prova antes do banco:** A evidência física é gravada e confirmada no storage antes da execução da RPC transacional no Supabase.
4. **Idempotência transacional no banco:** Reenvios idênticos recuperam o resultado anterior sem novas linhas; reenvios concorrentes simultâneos com nonces distintos e mesma `operation_key` produzem um único efeito através de duplo bloqueio (`FOR SHARE` após `FOR UPDATE`); mesma chave com payload divergente (ação, specs, sku, região ou dados comerciais) altera o hash canônico e retorna conflito HTTP 409.
5. **Trava de Produção do Webhook/Ingestão:** A rota dedicada de ingestão de coletores requer validação de assinatura HMAC antes do consumo do nonce em storage compartilhado, com propagação auditável de identidade.
6. **Retenção probatória em camadas:** 730 dias na camada quente para acesso operacional, até cinco anos em camada fria por governança de risco, e expurgo condicionado à ausência de legal hold (sem equiparação automática à prescrição do art. 27 do CDC).
7. **Integração HTTP pelo Worker vs Handler:** Os testes de integração cobrem a execução direta do handler com objetos padrão `Request` e conexões reais ao PostgreSQL local; integração pelo entrypoint HTTP de rede ativo do Worker requer processo servidor em execução.
8. **Pipeline local validado vs Retenção remota pendente:** O pipeline local está validado com escrita física atômica via `linkSync` no filesystem; a retenção no provedor remoto (Cloudflare R2 Bucket Locks) permanece pendente de homologação na nuvem. Provisionar credenciais e bucket, sozinho, não equivale à homologação do WORM.
