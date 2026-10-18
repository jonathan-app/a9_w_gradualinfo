# Evidência AC-02: Armazenamento local com criação atômica linkSync e expurgo seguro

**AC**: ofertas-pipeline/AC-02  
**Status**: PASS (escopo local/development — não comprova produção)  
**Data**: 2026-10-17  
**Ambiente**: Node 22, Vitest 5.0.4, sistema de arquivos local  

## O que foi verificado

1. **`lib/offers/storage/filesystem-adapter.ts:229-237`** usa `fs.linkSync(tmpDataPath, dataPath)` para criação atômica POSIX sem substituição de destino. `EEXIST` é capturado; destino existente com bytes iguais → `reused_existing: true`; destino com bytes divergentes → `EvidenceCollisionConflictError` (AC-02, AC-04).
2. **`lib/offers/storage/filesystem-adapter.ts:220-224`** aplica modo restritivo `0o444` antes da linkagem.
3. **`lib/offers/storage/filesystem-adapter.ts:68-120`** rotina `recoverInterruptedWrites` preserva processos ativos (`process.kill(pid, 0)` sem erro) e estados incertos (`EPERM`), expurga apenas temporários de processos confirmadamente mortos (`ESRCH`) após 15 minutos de tolerância.
4. **Teste empírico com processos independentes**: `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts` dispara dois subprocessos Node (`child_process.spawn`) sincronizados por barreira disputando a mesma chave com payload idêntico. Um grava atomicamente; o outro detecta destino existente e reutiliza (`reused_existing: true`), sem sobrescrita destrutiva.
5. Teste de sobrevivência a reinício do processo: nova instância do adaptador sobre o mesmo diretório reconhece a evidência persistida (`reused_existing: true`).
6. **121 testes Vitest do módulo de ofertas** aprovados (14 arquivos), incluindo o adaptador filesystem.

## Escopo e limitação

Esta evidência comprova o adaptador de **sistema de arquivos local**, classificado na spec como implementação de teste e desenvolvimento. Ela **não** comprova imutabilidade regulatória de nuvem (R2 Bucket Locks), que permanece pendente (AC-09). Não confundir aprovação local com aprovação de produção.

## Código relevante

- `lib/offers/storage/filesystem-adapter.ts`
- `lib/offers/storage/storage-factory.ts`
- `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts`
