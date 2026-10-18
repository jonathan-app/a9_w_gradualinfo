# Evidência AC-02: Armazenamento local de evidências com FilesystemEvidenceStorageAdapter e linkSync

**Data**: 2026-10-16  
**Critério**: `ofertas-pipeline/AC-02`  
**Status**: PASS  

## Descrição e comprovação empírica

O armazenamento local de evidências probatórias utiliza o `FilesystemEvidenceStorageAdapter` em `lib/offers/storage/filesystem-adapter.ts`, com garantias rigorosas de atomicidade, concorrência e expurgo seguro:

1. **Gravação atômica via linkagem física POSIX (`fs.linkSync`)**:
   - Escrita inicial em arquivo temporário com PID e timestamp (`.tmp.<pid>.<ts>.data`), seguida de `fs.linkSync` atômico para o caminho definitivo.
   - Caso o destino já exista, o `linkSync` falha com `EEXIST` sem sobrescrever ou truncar o arquivo preexistente.
   - Arquivo persistido em modo restrito de leitura (`0o444`).

2. **Concorrência entre processos independentes do sistema operacional**:
   - Comprovada pelo teste automatizado `trata dois processos independentes sincronizados por barreira disputando a mesma chave com payload idêntico` em `__tests__/unit/lib/offers/spec-0021-worm-pipeline.test.ts`.
   - Dois processos Node.js separados disputam a gravação da mesma chave através de uma barreira de largada sincronizada no filesystem (`.ready-*` + `.gate-start`).
   - Com payload idêntico, ambos concluem com sucesso com reuso não destrutivo (`reused_existing: true`).
   - Com payload divergente, o segundo processo recebe `EvidenceCollisionConflictError` (HTTP 409).

3. **Expurgo seguro de temporários com preservação de processos ativos**:
   - Rotina de recuperação e expurgo (`sweepStaleTemporaryFiles`) verifica a vivacidade do processo dono via `process.kill(pid, 0)`.
   - Preserva rigorosamente processos vivos e estados de permissão incertos (`EPERM`), removendo exclusivamente arquivos órfãos de processos comprovadamente mortos (`ESRCH`) após janela de tolerância de 15 minutos.
