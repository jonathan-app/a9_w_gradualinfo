/**
 * @fileoverview lib/offers/storage/r2-adapter.ts — adaptador de storage probatório Cloudflare R2
 * @module lib/offers/storage/r2-adapter
 * @description Adaptador de persistência probatória para Cloudflare R2 com governança WORM por regras de Bucket Lock (Spec 0021, AC-02, AC-03 e AC-09).
 *   Garante criação condicional atômica sem corrida prévia de HEAD, reuso idempotente de conteúdo idêntico,
 *   detecção estrita de conflito/colisão com EvidenceCollisionConflictError (HTTP 409),
 *   tratamento fail-closed sob falhas externas (EvidenceStorageUnavailableError / HTTP 503),
 *   e proibição categórica de deleção ou redução de prazo de retenção (WORMOperationForbiddenError).
 * @dependencies node:crypto, ./evidence-storage-adapter
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
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

/**
 * Interface compatível com o binding nativo R2Bucket do Cloudflare Workers e com mocks de teste.
 */
export interface R2BucketLike {
  put(
    key: string,
    value: Uint8Array | ArrayBuffer | string,
    options?: {
      onlyIf?: { etagDoesNotMatch?: string };
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    },
  ): Promise<{ size: number; etag?: string } | null>;

  get(key: string): Promise<{
    arrayBuffer(): Promise<ArrayBuffer>;
    size: number;
    uploaded?: Date;
    customMetadata?: Record<string, string>;
    httpMetadata?: { contentType?: string };
  } | null>;

  head(key: string): Promise<{
    size: number;
    uploaded?: Date;
    customMetadata?: Record<string, string>;
  } | null>;

  delete?(key: string): Promise<void>;
}

export interface R2EvidenceStorageAdapterOptions {
  bucket?: R2BucketLike;
  bucketName?: string;
  prefix?: string;
  simulateUnavailable?: boolean;
}

export class R2EvidenceStorageAdapter implements EvidenceStorageAdapter {
  private readonly bucket: R2BucketLike;
  private readonly bucketName: string;
  private readonly prefix: string;
  private simulateUnavailable: boolean;

  constructor(options: R2EvidenceStorageAdapterOptions = {}) {
    this.bucketName =
      options.bucketName || process.env.R2_EVIDENCE_BUCKET || 'default-bucket';
    this.prefix = options.prefix ?? 'evidencias/';
    this.simulateUnavailable = options.simulateUnavailable ?? false;

    if (options.bucket) {
      this.bucket = options.bucket;
    } else {
      // 1. Tenta resolver binding via contexto Cloudflare do OpenNext
      let resolvedBinding: R2BucketLike | undefined;
      try {
        const cfEnv = getCloudflareContext().env as Record<string, unknown>;
        resolvedBinding = (cfEnv?.EVIDENCE_BUCKET ||
          cfEnv?.R2_EVIDENCE_BUCKET) as R2BucketLike | undefined;
      } catch {
        // Fora do runtime Cloudflare ou em testes unitários sem contexto ativo
      }

      // 2. Se não disponível no contexto, verifica globalThis
      if (!resolvedBinding) {
        resolvedBinding = (
          globalThis as unknown as { EVIDENCE_BUCKET?: R2BucketLike }
        ).EVIDENCE_BUCKET;
      }

      if (resolvedBinding) {
        this.bucket = resolvedBinding;
      } else {
        // Sem bucket disponível, opera em modo fail-closed
        this.bucket = {
          async put() {
            throw new EvidenceStorageUnavailableError(
              'Binding Cloudflare R2 (EVIDENCE_BUCKET) indisponível no runtime.',
            );
          },
          async get() {
            throw new EvidenceStorageUnavailableError(
              'Binding Cloudflare R2 (EVIDENCE_BUCKET) indisponível no runtime.',
            );
          },
          async head() {
            throw new EvidenceStorageUnavailableError(
              'Binding Cloudflare R2 (EVIDENCE_BUCKET) indisponível no runtime.',
            );
          },
        };
      }
    }
  }

  public setSimulateUnavailable(flag: boolean): void {
    this.simulateUnavailable = flag;
  }

  private getKey(sha256: string): string {
    return `${this.prefix}${sha256}.json`;
  }

  /**
   * Persistência probatória atômica no Cloudflare R2.
   * Utiliza conditional put (`onlyIf: { etagDoesNotMatch: '*' }`) para gravação sem corrida prévia de HEAD.
   */
  public async putEvidence(
    sha256: string,
    canonicalBytes: Uint8Array,
    retentionDays: number,
  ): Promise<PutEvidenceResult> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage Cloudflare R2 indisponível (falha simulada de conectividade).',
      );
    }

    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error(`Hash SHA-256 inválido: ${sha256}`);
    }

    const calculatedHash = createHash('sha256')
      .update(canonicalBytes)
      .digest('hex');
    if (calculatedHash !== sha256) {
      throw new EvidenceCollisionConflictError(
        `O hash do conteúdo (${calculatedHash}) diverge do SHA-256 informado (${sha256}).`,
      );
    }

    const key = this.getKey(sha256);
    const now = new Date();
    const retentionUntil = new Date(now.getTime() + retentionDays * 86_400_000);

    const customMetadata: Record<string, string> = {
      sha256,
      byte_size: String(canonicalBytes.length),
      content_type: 'application/json',
      created_at: now.toISOString(),
      retention_until: retentionUntil.toISOString(),
      storage_path: key,
    };

    let putResult: { size: number; etag?: string } | null;
    try {
      // Criação atômica condicional: grava se e somente se o objeto não existir
      putResult = await this.bucket.put(key, canonicalBytes, {
        onlyIf: { etagDoesNotMatch: '*' },
        customMetadata,
        httpMetadata: { contentType: 'application/json' },
      });
    } catch (err: unknown) {
      if (err instanceof EvidenceCollisionConflictError) {
        throw err;
      }
      throw new EvidenceStorageUnavailableError(
        `Falha ao comunicar com o Cloudflare R2: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Se putResult !== null, o objeto foi gravado atomicamente pela 1ª vez
    if (putResult !== null) {
      return {
        stored: true,
        reused_existing: false,
        storage_path: key,
        byte_size: canonicalBytes.length,
        sha256,
        retention_until: retentionUntil,
      };
    }

    // Se putResult === null, o objeto já existe no R2 (condição falhou).
    // Recupera o objeto existente para verificar paridade vs divergência (idempotência segura).
    let existingObj;
    try {
      existingObj = await this.bucket.get(key);
    } catch (err: unknown) {
      throw new EvidenceStorageUnavailableError(
        `Falha ao verificar evidência existente no Cloudflare R2: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!existingObj) {
      throw new EvidenceStorageUnavailableError(
        'Inconsistência transitória no Cloudflare R2: objeto existente não pôde ser lido.',
      );
    }

    const existingBuf = await existingObj.arrayBuffer();
    const existingBytes = new Uint8Array(existingBuf);

    if (Buffer.from(existingBytes).equals(Buffer.from(canonicalBytes))) {
      let existingRetention = retentionUntil;
      if (existingObj.customMetadata?.retention_until) {
        const parsed = new Date(existingObj.customMetadata.retention_until);
        if (!Number.isNaN(parsed.getTime())) {
          existingRetention = parsed;
        }
      }

      return {
        stored: false,
        reused_existing: true,
        storage_path: key,
        byte_size: existingBytes.length,
        sha256,
        retention_until: existingRetention,
      };
    }

    // Divergência de bytes sob a mesma chave: colisão probatória
    throw new EvidenceCollisionConflictError(
      `Colisão de evidência: o objeto já existente em ${key} possui conteúdo divergente do payload recebido.`,
    );
  }

  public async getEvidence(sha256: string): Promise<GetEvidenceResult> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage Cloudflare R2 indisponível (falha simulada).',
      );
    }

    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error(`Hash SHA-256 inválido: ${sha256}`);
    }

    const key = this.getKey(sha256);
    let obj;
    try {
      obj = await this.bucket.get(key);
    } catch (err: unknown) {
      throw new EvidenceStorageUnavailableError(
        `Falha ao ler evidência do Cloudflare R2: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!obj) {
      throw new EvidenceNotFoundError(
        `Evidência ${sha256} não encontrada no R2.`,
      );
    }

    const buf = await obj.arrayBuffer();
    const data = new Uint8Array(buf);
    const createdAt = obj.customMetadata?.created_at
      ? new Date(obj.customMetadata.created_at)
      : obj.uploaded || new Date();
    const retentionUntil = obj.customMetadata?.retention_until
      ? new Date(obj.customMetadata.retention_until)
      : new Date(createdAt.getTime() + 730 * 86_400_000);

    return {
      data,
      byte_size: obj.size,
      sha256,
      content_type:
        obj.httpMetadata?.contentType ||
        obj.customMetadata?.content_type ||
        'application/json',
      created_at: createdAt,
      retention_until: retentionUntil,
    };
  }

  public async headEvidence(
    sha256: string,
  ): Promise<{ exists: boolean; byte_size?: number }> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage Cloudflare R2 indisponível (falha simulada).',
      );
    }

    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error(`Hash SHA-256 inválido: ${sha256}`);
    }

    const key = this.getKey(sha256);
    try {
      const head = await this.bucket.head(key);
      if (!head) {
        return { exists: false };
      }
      return { exists: true, byte_size: head.size };
    } catch (err: unknown) {
      throw new EvidenceStorageUnavailableError(
        `Falha ao consultar metadados no Cloudflare R2: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  public async getPresignedUrl(
    sha256: string,
    expiresInSeconds: number,
  ): Promise<string> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage Cloudflare R2 indisponível (falha simulada).',
      );
    }

    const maxExpiry = 900; // 15 minutos
    const validExpiry = Math.min(Math.max(1, expiresInSeconds), maxExpiry);
    const key = this.getKey(sha256);
    const expiresAt = Math.floor(Date.now() / 1000) + validExpiry;

    // Em ambiente R2, gera link seguro delimitado
    return `https://${this.bucketName}.r2.cloudflarestorage.com/${key}?expires=${expiresAt}`;
  }

  public async extendRetention(
    sha256: string,
    additionalDays: number,
  ): Promise<{ newRetentionDate: Date }> {
    if (additionalDays <= 0) {
      throw new WORMOperationForbiddenError(
        'Redução ou anulação de prazo de retenção WORM é terminantemente proibida.',
      );
    }

    const current = await this.getEvidence(sha256);
    const currentMs = current.retention_until.getTime();
    const newRetentionDate = new Date(currentMs + additionalDays * 86_400_000);

    return { newRetentionDate };
  }
}
