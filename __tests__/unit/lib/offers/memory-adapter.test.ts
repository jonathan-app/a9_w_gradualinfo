/**
 * @fileoverview Testes unitários para o adaptador de storage WORM em memória da Spec 0017 (Fatia 4).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  EvidenceCollisionConflictError,
  EvidenceNotFoundError,
  EvidenceStorageUnavailableError,
  WORMOperationForbiddenError,
} from '@/lib/offers/storage/evidence-storage-adapter';
import {
  type MemoryEvidenceStorageAdapter,
  getEvidenceStorage,
  resetEvidenceStorage,
} from '@/lib/offers/storage/memory-adapter';

describe('MemoryEvidenceStorageAdapter (WORM Compliance)', () => {
  let adapter: MemoryEvidenceStorageAdapter;

  beforeEach(() => {
    resetEvidenceStorage();
    adapter = getEvidenceStorage();
  });

  const sampleBytes = Buffer.from('{"status":"verified_sample"}', 'utf8');
  // SHA-256 real de '{"status":"verified_sample"}'
  const sampleHash =
    'ecfc4cb89268b70aa557c4abf8dbe05f2a9dc3980a82a68bbfb731dfa169d15b';

  it('persiste evidência com retenção quente inicial de 730 dias', async () => {
    const result = await adapter.putEvidence(sampleHash, sampleBytes, 730);
    expect(result.stored).toBe(true);
    expect(result.reused_existing).toBe(false);
    expect(result.storage_path).toBe(`evidences/sha256/${sampleHash}.json`);
    expect(result.byte_size).toBe(sampleBytes.length);
    expect(result.sha256).toBe(sampleHash);

    const diffDays = Math.round(
      (result.retention_until.getTime() - Date.now()) / 86_400_000,
    );
    expect(diffDays).toBe(730);
  });

  it('é estritamente idempotente quando submetido com mesmo hash e bytes idênticos', async () => {
    await adapter.putEvidence(sampleHash, sampleBytes, 730);
    const retry = await adapter.putEvidence(sampleHash, sampleBytes, 730);

    expect(retry.stored).toBe(false);
    expect(retry.reused_existing).toBe(true);
    expect(retry.storage_path).toBe(`evidences/sha256/${sampleHash}.json`);
  });

  it('rejeita com conflito 409 quando o hash declarado não corresponde aos bytes fornecidos', async () => {
    const fakeHash =
      '0000000000000000000000000000000000000000000000000000000000000000';
    await expect(
      adapter.putEvidence(fakeHash, sampleBytes, 730),
    ).rejects.toThrow(EvidenceCollisionConflictError);
  });

  it('rejeita com colisão 409 se a chave já existir mas os bytes recebidos divergirem', async () => {
    await adapter.putEvidence(sampleHash, sampleBytes, 730);

    // Cria bytes adulterados diretamente injetados sob a mesma chave
    // para testar colisão de chave no storage
    const differentBytes = Buffer.from('{"status":"tampered_bytes"}', 'utf8');
    // Para testar o ramo da colisão de chave com bytes divergentes, usamos o método putEvidence
    // simulando a chave existente
    await expect(
      adapter.putEvidence(sampleHash, differentBytes, 730),
    ).rejects.toThrow(EvidenceCollisionConflictError);
  });

  it('permite leitura íntegra e head request da evidência armazenada', async () => {
    await adapter.putEvidence(sampleHash, sampleBytes, 730);

    const head = await adapter.headEvidence(sampleHash);
    expect(head.exists).toBe(true);
    expect(head.byte_size).toBe(sampleBytes.length);

    const headInexistent = await adapter.headEvidence(
      '1111111111111111111111111111111111111111111111111111111111111111',
    );
    expect(headInexistent.exists).toBe(false);

    const getRes = await adapter.getEvidence(sampleHash);
    expect(getRes.sha256).toBe(sampleHash);
    expect(Buffer.from(getRes.data).toString('utf8')).toBe(
      '{"status":"verified_sample"}',
    );
  });

  it('lança EvidenceNotFoundError ao consultar hash não armazenado', async () => {
    await expect(
      adapter.getEvidence(
        '2222222222222222222222222222222222222222222222222222222222222222',
      ),
    ).rejects.toThrow(EvidenceNotFoundError);
  });

  it('gera URL assinada temporária respeitando limite máximo de 15 minutos', async () => {
    await adapter.putEvidence(sampleHash, sampleBytes, 730);

    const url = await adapter.getPresignedUrl(sampleHash, 1800); // solicita 30 min
    expect(url).toContain(`evidences/sha256/${sampleHash}.json`);
    expect(url).toContain('mock_signature=worm_compliance_verified');

    // Confere que limitou em no máximo 900s (15 min)
    const match = url.match(/exp=(\d+)/);
    expect(match).not.toBeNull();
    const expSeconds = Number(match?.[1]);
    const maxAllowedExp = Math.floor(Date.now() / 1000) + 900 + 5;
    expect(expSeconds).toBeLessThanOrEqual(maxAllowedExp);
  });

  it('permite estender a retenção legal para frente e proíbe reduções', async () => {
    const res = await adapter.putEvidence(sampleHash, sampleBytes, 730);
    const initialExpiry = res.retention_until.getTime();

    const extended = await adapter.extendRetention(sampleHash, 30);
    expect(extended.newRetentionDate.getTime()).toBeGreaterThan(initialExpiry);
    const diff = Math.round(
      (extended.newRetentionDate.getTime() - initialExpiry) / 86_400_000,
    );
    expect(diff).toBe(30);

    // Tentativa de reduzir ou somar zero dias é proibida
    await expect(adapter.extendRetention(sampleHash, 0)).rejects.toThrow(
      WORMOperationForbiddenError,
    );
    await expect(adapter.extendRetention(sampleHash, -10)).rejects.toThrow(
      WORMOperationForbiddenError,
    );
  });

  it('proíbe expressamente operações de exclusão em modelo WORM', () => {
    expect(() => adapter.deleteEvidence()).toThrow(WORMOperationForbiddenError);
  });

  it('falha fechado com EvidenceStorageUnavailableError quando há indisponibilidade simulada', async () => {
    adapter.setSimulateUnavailable(true);

    await expect(
      adapter.putEvidence(sampleHash, sampleBytes, 730),
    ).rejects.toThrow(EvidenceStorageUnavailableError);
    await expect(adapter.getEvidence(sampleHash)).rejects.toThrow(
      EvidenceStorageUnavailableError,
    );
    await expect(adapter.headEvidence(sampleHash)).rejects.toThrow(
      EvidenceStorageUnavailableError,
    );
  });
});
