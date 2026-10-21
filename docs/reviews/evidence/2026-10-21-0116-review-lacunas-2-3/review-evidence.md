# Evidência do `/check review` — lacunas 2 e 3

Revisão independente executada por modelo diferente do autor sobre o diff local, com leitura das Specs 0017, 0021 e 0025.

## Evidência observada

- HMAC é validado antes do `INSERT` de nonce nas rotas de ingestão e webhook legado.
- A chave primária `(collector_id, nonce)` da tabela `offers_ingest_nonces` torna a disputa pelo mesmo nonce atômica no PostgreSQL.
- Conflito `23505` resulta em HTTP 409 e erro de persistência em HTTP 503.
- Produção sem cliente compartilhado falha fechada, sem recorrer a `MemoryNonceCache`.
- O canonicalizer preserva pares UTF-16 válidos, rejeita surrogates isolados e passa pelos exemplos oficiais e pelos 24 números finitos do Apêndice B da RFC 8785.

## Execuções desta revisão

- Vitest focado em quatro arquivos: 70 testes PASS, exit 0.
- `tsc --noEmit`: exit 0.
- ESLint focado: exit 1 por `@typescript-eslint/no-explicit-any` em `app/api/admin/ofertas/[id]/avaliar-selo/route.ts:118`.

## Achados

1. **BLOCKER — gate estático quebrado:** o diff introduz `serviceClient as any` na rota administrativa. O ESLint obrigatório reprova. Correção: tornar `SupabaseLikeClient` estruturalmente compatível com `SupabaseClientForWebhookNonce` ou usar uma variável tipada, removendo o cast `any`.
2. **BLOCKER — array esparso produz JSON inválido:** `Array.prototype.map` ignora lacunas. `canonicalizeJson([, 1])` forma `[,1]`, embora a função declare canonização RFC 8785 e a tarefa exija arrays e rejeição de valores fora do domínio JSON. Correção: detectar índices ausentes e rejeitar com `InvalidEvidenceFormatError`, com regressão focada; alternativamente, adaptar explicitamente ao valor JSON `null` se o contrato arquitetural assim decidir.
3. **WARNING — concorrência real não foi exercitada nesta revisão:** mocks comprovam mapeamento de respostas, mas não duas conexões simultâneas disputando o mesmo nonce. A PK fornece a garantia estrutural, porém a homologação pedida para produção ainda requer Supabase real.
4. **WARNING — webhook legado não propaga identidade autenticada de coletor:** usa `collector_id = webhook_collector` e `actorId` derivado do prefixo do nonce. Isso é anterior à correção, mas impede considerar concluída a unificação com o contrato da Spec 0021, que vincula e propaga `collector_id`.

## Limite dos ACs

Somente `ofertas-pipeline/AC-08` foi inspecionado neste recorte. AC-01 a AC-07 e AC-09 não foram reverificados nesta árvore e permanecem `UNVERIFIABLE` para esta execução da autoridade.
