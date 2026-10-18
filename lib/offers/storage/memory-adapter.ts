/**
 * @fileoverview lib/offers/storage/memory-adapter.ts — emulação local de Object Lock WORM
 * @module lib/offers/storage/memory-adapter
 * @description Implementação em memória do adaptador de storage WORM para desenvolvimento local
 *   e testes automatizados, emulando fielmente o comportamento de Object Lock Compliance Mode.
 * @dependencies node:crypto, ./evidence-storage-adapter
 */

import { createHash } from 'node:crypto';
import {
  type EvidenceStorageAdapter,
  type PutEvidenceResult,
  type GetEvidenceResult,
  EvidenceCollisionConflictError,
  EvidenceNotFoundError,
  EvidenceStorageUnavailableError,
  WORMOperationForbiddenError,
} from './evidence-storage-adapter';

interface StoredMemoryItem {
  data: Uint8Array;
  byte_size: number;
  sha256: string;
  storage_path: string;
  content_type: string;
  created_at: Date;
  retain_until: Date;
}

export class MemoryEvidenceStorageAdapter implements EvidenceStorageAdapter {
  private readonly items = new Map<string, StoredMemoryItem>();
  private simulateUnavailable = false;

  /**
   * Configura flag de simulação de indisponibilidade externa do storage.
   */
  public setSimulateUnavailable(flag: boolean): void {
    this.simulateUnavailable = flag;
  }

  /**
   * Limpa o estado armazenado em memória (utilitário para isolamento entre testes).
   */
  public clear(): void {
    this.items.clear();
    this.simulateUnavailable = false;
  }

  public async putEvidence(
    sha256: string,
    canonicalBytes: Uint8Array,
    retentionDays: number,
  ): Promise<PutEvidenceResult> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage WORM indisponível (falha simulada de conectividade).',
      );
    }

    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error(`Hash SHA-256 inválido: ${sha256}`);
    }

    // Validação criptográfica de integridade: os bytes devem bater rigorosamente com o hash
    const computedHash = createHash('sha256')
      .update(canonicalBytes)
      .digest('hex');
    if (computedHash !== sha256) {
      throw new EvidenceCollisionConflictError(
        `Divergência entre o hash declarado (${sha256}) e o hash computado dos bytes (${computedHash}).`,
      );
    }

    const existing = this.items.get(sha256);
    if (existing) {
      // Verifica se os bytes são idênticos
      const isIdentical =
        existing.byte_size === canonicalBytes.length &&
        Buffer.compare(
          Buffer.from(existing.data),
          Buffer.from(canonicalBytes),
        ) === 0;

      if (isIdentical) {
        return {
          stored: false,
          reused_existing: true,
          storage_path: existing.storage_path,
          byte_size: existing.byte_size,
          sha256,
          retention_until: existing.retain_until,
        };
      }

      // Colisão de hash com conteúdo divergente
      throw new EvidenceCollisionConflictError(
        `Colisão de hash detectada: já existe uma evidência gravada para o hash ${sha256} com bytes divergentes.`,
      );
    }

    const now = new Date();
    const retainUntil = new Date(now.getTime() + retentionDays * 86_400_000);
    const storagePath = `evidences/sha256/${sha256}.json`;

    const newItem: StoredMemoryItem = {
      data: new Uint8Array(canonicalBytes),
      byte_size: canonicalBytes.length,
      sha256,
      storage_path: storagePath,
      content_type: 'application/json',
      created_at: now,
      retain_until: retainUntil,
    };

    this.items.set(sha256, newItem);

    return {
      stored: true,
      reused_existing: false,
      storage_path: storagePath,
      byte_size: canonicalBytes.length,
      sha256,
      retention_until: retainUntil,
    };
  }

  public async getEvidence(sha256: string): Promise<GetEvidenceResult> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage WORM indisponível (falha simulada de conectividade).',
      );
    }

    const item = this.items.get(sha256);
    if (!item) {
      throw new EvidenceNotFoundError(`Evidência não encontrada: ${sha256}`);
    }

    return {
      data: new Uint8Array(item.data),
      byte_size: item.byte_size,
      sha256: item.sha256,
      content_type: item.content_type,
      created_at: new Date(item.created_at.getTime()),
      retention_until: new Date(item.retain_until.getTime()),
    };
  }

  public async headEvidence(
    sha256: string,
  ): Promise<{ exists: boolean; byte_size?: number }> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage WORM indisponível (falha simulada de conectividade).',
      );
    }

    const item = this.items.get(sha256);
    if (!item) {
      return { exists: false };
    }

    return {
      exists: true,
      byte_size: item.byte_size,
    };
  }

  public async getPresignedUrl(
    sha256: string,
    expiresInSeconds: number,
  ): Promise<string> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage WORM indisponível (falha simulada de conectividade).',
      );
    }

    const item = this.items.get(sha256);
    if (!item) {
      throw new EvidenceNotFoundError(`Evidência não encontrada: ${sha256}`);
    }

    const clampedExpires = Math.min(Math.max(expiresInSeconds, 60), 900); // máx 15 min
    const expiryTimestamp = Math.floor(Date.now() / 1000) + clampedExpires;

    return `https://storage.gradualinfo.local/evidences/sha256/${sha256}.json?exp=${expiryTimestamp}&mock_signature=worm_compliance_verified`;
  }

  public async extendRetention(
    sha256: string,
    additionalDays: number,
  ): Promise<{ newRetentionDate: Date }> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage WORM indisponível (falha simulada de conectividade).',
      );
    }

    const item = this.items.get(sha256);
    if (!item) {
      throw new EvidenceNotFoundError(`Evidência não encontrada: ${sha256}`);
    }

    if (additionalDays <= 0) {
      throw new WORMOperationForbiddenError(
        'A extensão de retenção em Object Lock Compliance só permite avançar o período; reduções são proibidas.',
      );
    }

    const newRetentionDate = new Date(
      item.retain_until.getTime() + additionalDays * 86_400_000,
    );
    item.retain_until = newRetentionDate;

    return { newRetentionDate };
  }

  /**
   * Operação de deleção terminantemente proibida no modelo WORM.
   */
  public deleteEvidence(): never {
    throw new WORMOperationForbiddenError(
      'Deleção de evidência WORM é sumariamente proibida pela política de conformidade e integridade probatória.',
    );
  }
}

let globalMemoryStorageInstance: MemoryEvidenceStorageAdapter | null = null;

/**
 * Retorna a instância padrão do adaptador de storage em memória para desenvolvimento e testes locais.
 */
export function getEvidenceStorage(): MemoryEvidenceStorageAdapter {
  if (!globalMemoryStorageInstance) {
    globalMemoryStorageInstance = new MemoryEvidenceStorageAdapter();
  }
  return globalMemoryStorageInstance;
}

/**
 * Reinicia a instância do storage em memória para testes limpos.
 */
export function resetEvidenceStorage(): void {
  if (globalMemoryStorageInstance) {
    globalMemoryStorageInstance.clear();
  }
}
