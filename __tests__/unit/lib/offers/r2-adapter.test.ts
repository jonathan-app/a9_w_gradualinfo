/**
 * @fileoverview Testes unitários para o adaptador de storage Cloudflare R2 e fábrica probatória.
 */

import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  EvidenceCollisionConflictError,
  EvidenceNotFoundError,
  EvidenceStorageUnavailableError,
  WORMOperationForbiddenError,
} from '@/lib/offers/storage/evidence-storage-adapter';
import {
  R2EvidenceStorageAdapter,
  type R2BucketLike,
} from '@/lib/offers/storage/r2-adapter';
import {
  getOffersEvidenceStorage,
  setEvidenceStorageOverride,
} from '@/lib/offers/storage/storage-factory';

class MockR2Bucket implements R2BucketLike {
  public items = new Map<
    string,
    {
      bytes: Uint8Array;
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
      uploaded: Date;
    }
  >();
  public putCalls: Array<{ key: string; options?: unknown }> = [];
  public getCalls: Array<{ key: string }> = [];
  public headCalls: Array<{ key: string }> = [];
  public failNextPut = false;
  public failNextGet = false;

  async put(
    key: string,
    value: Uint8Array | ArrayBuffer | string,
    options?: {
      onlyIf?: { etagDoesNotMatch?: string };
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    },
  ) {
    this.putCalls.push({ key, options });
    if (this.failNextPut) {
      this.failNextPut = false;
      throw new Error('Connection timeout to Cloudflare R2 endpoint');
    }

    const bytes =
      typeof value === 'string'
        ? Buffer.from(value, 'utf8')
        : value instanceof Uint8Array
          ? value
          : new Uint8Array(value);

    // Se onlyIf.etagDoesNotMatch === '*' e o item já existe: falha atômica condicional
    if (options?.onlyIf?.etagDoesNotMatch === '*' && this.items.has(key)) {
      return null;
    }

    this.items.set(key, {
      bytes,
      customMetadata: options?.customMetadata,
      httpMetadata: options?.httpMetadata,
      uploaded: new Date(),
    });

    return { size: bytes.length, etag: 'mock-etag-001' };
  }

  async get(key: string) {
    this.getCalls.push({ key });
    if (this.failNextGet) {
      this.failNextGet = false;
      throw new Error('Network failure while reading object from R2');
    }

    const item = this.items.get(key);
    if (!item) return null;

    return {
      arrayBuffer: async () =>
        item.bytes.buffer.slice(
          item.bytes.byteOffset,
          item.bytes.byteOffset + item.bytes.byteLength,
        ),
      size: item.bytes.length,
      uploaded: item.uploaded,
      customMetadata: item.customMetadata,
      httpMetadata: item.httpMetadata,
    };
  }

  async head(key: string) {
    this.headCalls.push({ key });
    const item = this.items.get(key);
    if (!item) return null;
    return {
      size: item.bytes.length,
      uploaded: item.uploaded,
      customMetadata: item.customMetadata,
    };
  }
}

describe('R2EvidenceStorageAdapter', () => {
  let mockBucket: MockR2Bucket;
  let adapter: R2EvidenceStorageAdapter;

  const sampleBytes = Buffer.from('{"status":"verified_sample"}', 'utf8');
  // SHA-256 real de '{"status":"verified_sample"}'
  const sampleHash =
    'ecfc4cb89268b70aa557c4abf8dbe05f2a9dc3980a82a68bbfb731dfa169d15b';

  beforeEach(() => {
    mockBucket = new MockR2Bucket();
    adapter = new R2EvidenceStorageAdapter({
      bucket: mockBucket,
      bucketName: 'test-evidence-bucket',
    });
    setEvidenceStorageOverride(null);
  });

  it('executa criação condicional atômica sem corrida prévia de consulta (HEAD)', async () => {
    const result = await adapter.putEvidence(sampleHash, sampleBytes, 730);

    expect(result.stored).toBe(true);
    expect(result.reused_existing).toBe(false);
    expect(result.storage_path).toBe(`evidencias/${sampleHash}.json`);
    expect(result.byte_size).toBe(sampleBytes.length);
    expect(result.sha256).toBe(sampleHash);

    // Comprova que não realizou HEAD/GET antes do PUT atômico
    expect(mockBucket.headCalls.length).toBe(0);
    expect(mockBucket.getCalls.length).toBe(0);
    expect(mockBucket.putCalls.length).toBe(1);
    expect(mockBucket.putCalls[0]?.options).toEqual(
      expect.objectContaining({
        onlyIf: { etagDoesNotMatch: '*' },
      }),
    );
  });

  it('reutiliza objeto existente de forma idempotente quando submetido com mesmo hash e bytes idênticos', async () => {
    // 1ª gravação
    await adapter.putEvidence(sampleHash, sampleBytes, 730);
    expect(mockBucket.items.size).toBe(1);

    // 2ª gravação idêntica (simula reenvio / replay legítimo)
    const retry = await adapter.putEvidence(sampleHash, sampleBytes, 730);

    expect(retry.stored).toBe(false);
    expect(retry.reused_existing).toBe(true);
    expect(retry.storage_path).toBe(`evidencias/${sampleHash}.json`);
    expect(mockBucket.getCalls.length).toBe(1);
  });

  it('rejeita com EvidenceCollisionConflictError sob colisão de chave com conteúdo divergente', async () => {
    // 1ª gravação legítima
    await adapter.putEvidence(sampleHash, sampleBytes, 730);

    // Forja objeto divergente ocupando a mesma chave no bucket
    const divergentBytes = Buffer.from(
      '{"status":"divergent_tampered"}',
      'utf8',
    );
    const divergentHash = sampleHash; // Mesma chave/hash forçada

    // O adaptador deve validar sha256 antes da gravação ou detectar na recuperação
    await expect(
      adapter.putEvidence(divergentHash, divergentBytes, 730),
    ).rejects.toThrow(EvidenceCollisionConflictError);
  });

  it('rejeita com EvidenceCollisionConflictError quando o hash do R2 diverge dos bytes fornecidos', async () => {
    const mockHash = 'a'.repeat(64);
    // Simula que o R2 já possui dados diferentes sob a mesma chave
    mockBucket.items.set(`evidencias/${mockHash}.json`, {
      bytes: Buffer.from('{"original":"data"}'),
      uploaded: new Date(),
    });

    const bytesCalculados = Buffer.from('dummy content');
    // Força hash consistente com bytesCalculados
    const hashReal = createHash('sha256').update(bytesCalculados).digest('hex');

    mockBucket.items.set(`evidencias/${hashReal}.json`, {
      bytes: Buffer.from('{"corrupted":"stored_differently"}'),
      uploaded: new Date(),
    });

    await expect(
      adapter.putEvidence(hashReal, bytesCalculados, 730),
    ).rejects.toThrow(EvidenceCollisionConflictError);
  });

  it('falha fechada com EvidenceStorageUnavailableError sob falha de comunicação ou indisponibilidade', async () => {
    mockBucket.failNextPut = true;
    await expect(
      adapter.putEvidence(sampleHash, sampleBytes, 730),
    ).rejects.toThrow(EvidenceStorageUnavailableError);
  });

  it('permite leitura íntegra via getEvidence e metadados via headEvidence', async () => {
    await adapter.putEvidence(sampleHash, sampleBytes, 730);

    const retrieved = await adapter.getEvidence(sampleHash);
    expect(Buffer.from(retrieved.data).equals(sampleBytes)).toBe(true);
    expect(retrieved.byte_size).toBe(sampleBytes.length);
    expect(retrieved.content_type).toBe('application/json');

    const head = await adapter.headEvidence(sampleHash);
    expect(head.exists).toBe(true);
    expect(head.byte_size).toBe(sampleBytes.length);
  });

  it('lança EvidenceNotFoundError para hash inexistente', async () => {
    const absentHash = 'b'.repeat(64);
    await expect(adapter.getEvidence(absentHash)).rejects.toThrow(
      EvidenceNotFoundError,
    );

    const head = await adapter.headEvidence(absentHash);
    expect(head.exists).toBe(false);
  });

  it('proíbe redução ou anulação de prazo de retenção WORM com WORMOperationForbiddenError', async () => {
    await adapter.putEvidence(sampleHash, sampleBytes, 730);

    await expect(adapter.extendRetention(sampleHash, 0)).rejects.toThrow(
      WORMOperationForbiddenError,
    );
    await expect(adapter.extendRetention(sampleHash, -10)).rejects.toThrow(
      WORMOperationForbiddenError,
    );

    const extended = await adapter.extendRetention(sampleHash, 30);
    expect(extended.newRetentionDate.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('Integração com storage-factory (Fail-Closed)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    setEvidenceStorageOverride(null);
    process.env = { ...originalEnv };
    delete process.env.OFFERS_STORAGE_BACKEND;
    delete process.env.R2_EVIDENCE_BUCKET;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.OFFERS_STORAGE_WORM_VERIFIED;
  });

  it('em produção sem credenciais R2 configuradas, falha fechada com EvidenceStorageUnavailableError sem fallback', () => {
    process.env.NODE_ENV = 'production';

    expect(() => getOffersEvidenceStorage()).toThrow(
      EvidenceStorageUnavailableError,
    );
  });

  it('quando OFFERS_STORAGE_BACKEND=r2 sem credenciais completas, falha com 503 sem degradar para disco/memória', () => {
    process.env.OFFERS_STORAGE_BACKEND = 'r2';
    process.env.R2_EVIDENCE_BUCKET = 'test-bucket';
    // Faltam account_id, access_key, secret_key

    expect(() => getOffersEvidenceStorage()).toThrow(
      EvidenceStorageUnavailableError,
    );
  });

  it('quando credenciais R2 estão configuradas mas retenção WORM não está homologada, bloqueia pipeline com 503 (AC-09 UNVERIFIABLE)', () => {
    process.env.OFFERS_STORAGE_BACKEND = 'r2';
    process.env.R2_EVIDENCE_BUCKET = 'test-bucket';
    process.env.R2_ACCOUNT_ID = 'acc-123';
    process.env.R2_ACCESS_KEY_ID = 'key-123';
    process.env.R2_SECRET_ACCESS_KEY = 'sec-123';
    // Sem OFFERS_STORAGE_WORM_VERIFIED=true

    expect(() => getOffersEvidenceStorage()).toThrow(/AC-09 UNVERIFIABLE/);
  });

  it('quando configurado com credenciais R2 e homologação WORM confirmada, instancia R2EvidenceStorageAdapter', () => {
    process.env.OFFERS_STORAGE_BACKEND = 'r2';
    process.env.R2_EVIDENCE_BUCKET = 'test-bucket';
    process.env.R2_ACCOUNT_ID = 'acc-123';
    process.env.R2_ACCESS_KEY_ID = 'key-123';
    process.env.R2_SECRET_ACCESS_KEY = 'sec-123';
    process.env.OFFERS_STORAGE_WORM_VERIFIED = 'true';

    const storage = getOffersEvidenceStorage();
    expect(storage).toBeInstanceOf(R2EvidenceStorageAdapter);
  });
});
