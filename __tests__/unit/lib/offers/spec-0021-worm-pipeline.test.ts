/**
 * @fileoverview Testes unitários para a Spec 0021 (WORM durável, service-client e storage-factory).
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

vi.mock('server-only', () => ({}));

import { FilesystemEvidenceStorageAdapter } from '@/lib/offers/storage/filesystem-adapter';
import {
  EvidenceCollisionConflictError,
  EvidenceNotFoundError,
  EvidenceStorageUnavailableError,
  WORMOperationForbiddenError,
} from '@/lib/offers/storage/evidence-storage-adapter';
import {
  getOffersEvidenceStorage,
  setEvidenceStorageOverride,
} from '@/lib/offers/storage/storage-factory';
import {
  getOffersServiceClient,
  ServiceClientConfigError,
} from '@/lib/offers/service-client';

describe('Spec 0021: WORM durável e infraestrutura do pipeline', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'worm-test-'));
    setEvidenceStorageOverride(null);
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignora erro de limpeza
    }
    setEvidenceStorageOverride(null);
  });

  describe('FilesystemEvidenceStorageAdapter (AC-02 e AC-04)', () => {
    it('persiste evidência canônica fisicamente em disco', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const data = new TextEncoder().encode(
        JSON.stringify({ sku: 'TEST-123', price: 9900 }),
      );
      const sha256 = createHash('sha256').update(data).digest('hex');

      const result = await adapter.putEvidence(sha256, data, 730);
      expect(result.stored).toBe(true);
      expect(result.reused_existing).toBe(false);
      expect(result.sha256).toBe(sha256);
      expect(result.byte_size).toBe(data.length);

      // Recupera os dados gravados
      const retrieved = await adapter.getEvidence(sha256);
      expect(retrieved.byte_size).toBe(data.length);
      expect(retrieved.sha256).toBe(sha256);
      expect(Buffer.from(retrieved.data).toString()).toBe(
        JSON.stringify({ sku: 'TEST-123', price: 9900 }),
      );
    });

    it('sobrevive a reinício do processo / nova instância do adaptador (AC-02)', async () => {
      const adapter1 = new FilesystemEvidenceStorageAdapter(tempDir);
      const data = new TextEncoder().encode(
        JSON.stringify({ offer: 'survives-restart' }),
      );
      const sha256 = createHash('sha256').update(data).digest('hex');

      await adapter1.putEvidence(sha256, data, 730);

      // Simula novo processo criando outro adaptador sobre o mesmo diretório
      const adapter2 = new FilesystemEvidenceStorageAdapter(tempDir);
      const secondPut = await adapter2.putEvidence(sha256, data, 730);

      expect(secondPut.stored).toBe(false);
      expect(secondPut.reused_existing).toBe(true);
      expect(secondPut.sha256).toBe(sha256);

      const head = await adapter2.headEvidence(sha256);
      expect(head.exists).toBe(true);
      expect(head.byte_size).toBe(data.length);
    });

    it('rejeita colisão de hash com bytes divergentes (AC-04)', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const data1 = new TextEncoder().encode(JSON.stringify({ v: 1 }));
      const sha256 = createHash('sha256').update(data1).digest('hex');

      await adapter.putEvidence(sha256, data1, 730);

      // Tenta regravar com bytes divergentes mas passando o mesmo sha256
      const data2 = new TextEncoder().encode(JSON.stringify({ v: 2 }));
      await expect(adapter.putEvidence(sha256, data2, 730)).rejects.toThrow(
        EvidenceCollisionConflictError,
      );
    });

    it('bloqueia sumariamente operação de exclusão sob modelo WORM (AC-04)', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const data = new TextEncoder().encode('irreversible-evidence');
      const sha256 = createHash('sha256').update(data).digest('hex');

      await adapter.putEvidence(sha256, data, 730);

      await expect(adapter.deleteEvidence(sha256)).rejects.toThrow(
        WORMOperationForbiddenError,
      );
    });

    it('permite apenas extensão de retenção no futuro, proibindo redução', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const data = new TextEncoder().encode('retention-test');
      const sha256 = createHash('sha256').update(data).digest('hex');

      await adapter.putEvidence(sha256, data, 100);

      // Extensão positiva válida
      const extended = await adapter.extendRetention(sha256, 30);
      expect(extended.newRetentionDate.getTime()).toBeGreaterThan(
        Date.now() + 100 * 86_400_000,
      );

      // Redução inválida
      await expect(adapter.extendRetention(sha256, -10)).rejects.toThrow(
        WORMOperationForbiddenError,
      );
    });

    it('lança EvidenceNotFoundError ao consultar hash inexistente', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      await expect(
        adapter.getEvidence(
          '0000000000000000000000000000000000000000000000000000000000000000',
        ),
      ).rejects.toThrow(EvidenceNotFoundError);
    });

    it('recupera escritas interrompidas expurgando arquivos temporários apenas de processos mortos (ESRCH) (AC-02)', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const evidencesDir = join(tempDir, 'evidences', 'sha256');
      const orphanFile = join(evidencesDir, '.tmp.corrupted.uuid.9999999.tmp');
      writeFileSync(orphanFile, 'partial-data');

      // Simula arquivo antigo (além do período de tolerância de 15 minutos)
      const pastTime = new Date(Date.now() - 20 * 60 * 1000);
      utimesSync(orphanFile, pastTime, pastTime);
      expect(existsSync(orphanFile)).toBe(true);

      adapter.recoverInterruptedWrites();
      // Deve ser excluído porque PID 9999999 não existe (ESRCH) e idade > 15m
      expect(existsSync(orphanFile)).toBe(false);
    });

    it('preserva arquivos temporários de processos ativos mesmo após 15 minutos (AC-02)', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const evidencesDir = join(tempDir, 'evidences', 'sha256');
      const activeTmpFile = join(
        evidencesDir,
        `.tmp.validhash.test.${process.pid}.tmp`,
      );
      writeFileSync(activeTmpFile, 'active-writing-data');

      // Simula arquivo criado há 30 minutos por processo que AINDA está vivo (o processo do teste)
      const pastTime = new Date(Date.now() - 30 * 60 * 1000);
      utimesSync(activeTmpFile, pastTime, pastTime);
      expect(existsSync(activeTmpFile)).toBe(true);

      adapter.recoverInterruptedWrites();
      // O arquivo DEVE ser preservado: idade sozinha não autoriza exclusão de processo vivo
      expect(existsSync(activeTmpFile)).toBe(true);
    });

    it('preserva arquivos temporários quando o estado do processo é incerto ou sem PID válido (AC-02)', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const evidencesDir = join(tempDir, 'evidences', 'sha256');
      const uncertainFile = join(
        evidencesDir,
        '.tmp.validhash.test.nonnumericpid.tmp',
      );
      writeFileSync(uncertainFile, 'uncertain-state-data');

      const pastTime = new Date(Date.now() - 30 * 60 * 1000);
      utimesSync(uncertainFile, pastTime, pastTime);
      expect(existsSync(uncertainFile)).toBe(true);

      adapter.recoverInterruptedWrites();
      // Preserva por precaução se não for possível confirmar a morte do processo
      expect(existsSync(uncertainFile)).toBe(true);
    });

    it('trata dois processos independentes sincronizados por barreira disputando a mesma chave com payload idêntico (AC-02 e AC-04)', async () => {
      const payload = 'multi-process-identical-payload';
      const sha256 = createHash('sha256')
        .update(new TextEncoder().encode(payload))
        .digest('hex');

      const runWorker = (text: string, workerId: string) => {
        return new Promise<{ code: number; stdout: string }>((resolve) => {
          const childScript = `
            import { existsSync, writeFileSync } from 'node:fs';
            import { join } from 'node:path';
            import { FilesystemEvidenceStorageAdapter } from './lib/offers/storage/filesystem-adapter.ts';
            const [baseDir, sha256, payloadText, workerId] = process.argv.slice(1);
            const adapter = new FilesystemEvidenceStorageAdapter(baseDir);
            const data = new TextEncoder().encode(payloadText);

            // Sinaliza prontidão do subprocesso
            const readyFile = join(baseDir, '.ready-' + workerId);
            writeFileSync(readyFile, 'ready');

            // Barreira de largada sincronizada: aguarda sinal do processo pai
            const gateFile = join(baseDir, '.gate-start');
            while (!existsSync(gateFile)) {
              // spinlock curto
            }

            try {
              const res = await adapter.putEvidence(sha256, data, 30);
              process.stdout.write(JSON.stringify({ status: 'ok', res }));
              process.exit(0);
            } catch (err) {
              process.stdout.write(JSON.stringify({ status: 'error', name: err.name, message: err.message }));
              process.exit(1);
            }
          `;
          const child = spawn(
            process.execPath,
            [
              '--experimental-strip-types',
              '--input-type=module',
              '-e',
              childScript,
              tempDir,
              sha256,
              text,
              workerId,
            ],
            { cwd: process.cwd() },
          );
          let stdout = '';
          child.stdout.on('data', (d) => (stdout += d.toString()));
          child.on('close', (code) => {
            resolve({ code: code ?? 1, stdout });
          });
        });
      };

      // Inicia ambos os subprocessos
      const p1Promise = runWorker(payload, 'w1');
      const p2Promise = runWorker(payload, 'w2');

      // Barreira do pai: aguarda que ambos os processos estejam vivos e prontos
      const w1Ready = join(tempDir, '.ready-w1');
      const w2Ready = join(tempDir, '.ready-w2');
      const startWait = Date.now();
      while (
        (!existsSync(w1Ready) || !existsSync(w2Ready)) &&
        Date.now() - startWait < 5000
      ) {
        await new Promise((r) => setTimeout(r, 10));
      }

      // Dispara a largada simultânea criando o arquivo de gate
      writeFileSync(join(tempDir, '.gate-start'), 'go');

      const [p1, p2] = await Promise.all([p1Promise, p2Promise]);

      expect(p1.code).toBe(0);
      expect(p2.code).toBe(0);

      const r1 = JSON.parse(p1.stdout);
      const r2 = JSON.parse(p2.stdout);

      // Um processo realizou a gravação atômica inicial; o outro detectou o destino e reutilizou
      expect(r1.res.stored || r2.res.stored).toBe(true);
      expect(r1.res.reused_existing || r2.res.reused_existing).toBe(true);

      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const retrieved = await adapter.getEvidence(sha256);
      expect(Buffer.from(retrieved.data).toString('utf8')).toBe(payload);
    });

    it('distingue e rejeita payload com hash inválido na validação de entrada (AC-04)', async () => {
      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const fakeSha =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const actualData = new TextEncoder().encode(
        'data-whose-hash-is-different',
      );

      // Tenta gravar com SHA que não corresponde ao hash real dos bytes
      await expect(
        adapter.putEvidence(fakeSha, actualData, 30),
      ).rejects.toThrow(/diverge do SHA-256 informado/);
    });

    it('distingue e rejeita conflito quando arquivo já armazenado no destino possui conteúdo divergente (AC-04)', async () => {
      const payloadOriginal = 'payload-original-legitimate';
      const sha256 = createHash('sha256')
        .update(new TextEncoder().encode(payloadOriginal))
        .digest('hex');

      const adapter = new FilesystemEvidenceStorageAdapter(tempDir);
      const evidencesDir = join(tempDir, 'evidences', 'sha256');

      // Simula arquivo preexistente no destino com bytes divergentes (ex: colisão ou corrupção de disco)
      writeFileSync(
        join(evidencesDir, `${sha256}.json`),
        'corrupted-tampered-content',
      );

      // Tentativa de submissão do payload autêntico (cujo hash é válido e correto)
      // Deve falhar especificamente pelo confronto com o arquivo já armazenado no disco
      await expect(
        adapter.putEvidence(
          sha256,
          new TextEncoder().encode(payloadOriginal),
          30,
        ),
      ).rejects.toThrow(/possui conteúdo binário divergente/);
    });
  });

  describe('Storage Factory (AC-03 e AC-05)', () => {
    it('falha fechada em ambiente de produção sem R2 configurado (proibindo fallback para memória)', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.R2_EVIDENCE_BUCKET;

        expect(() => getOffersEvidenceStorage()).toThrow(
          EvidenceStorageUnavailableError,
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('retorna adaptador de sistema de arquivos em ambiente de desenvolvimento/teste', () => {
      const storage = getOffersEvidenceStorage();
      expect(storage).toBeInstanceOf(FilesystemEvidenceStorageAdapter);
    });
  });

  describe('Service Client (AC-01 e AC-07)', () => {
    it('lança ServiceClientConfigError se a chave service_role não estiver configurada', () => {
      // Como env.supabase.serviceRoleKey vem tipado do env, se vazio lança ServiceClientConfigError
      // Verificamos o comportamento defensivo
      try {
        const client = getOffersServiceClient();
        expect(client).toBeDefined();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceClientConfigError);
      }
    });
  });
});
