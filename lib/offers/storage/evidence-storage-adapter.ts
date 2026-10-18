/**
 * @fileoverview lib/offers/storage/evidence-storage-adapter.ts — contratos do storage WORM
 * @module lib/offers/storage/evidence-storage-adapter
 * @description Define a interface abstrata do adaptador de storage de evidências probatórias,
 *   erros tipados correspondentes e regras de imutabilidade da Spec 0017 (Fatia 4).
 * @dependencies none
 */

export class EvidenceCollisionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceCollisionConflictError';
  }
}

export class EvidenceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceNotFoundError';
  }
}

export class EvidenceStorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceStorageUnavailableError';
  }
}

export class WORMOperationForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WORMOperationForbiddenError';
  }
}

export interface PutEvidenceResult {
  stored: boolean;
  reused_existing: boolean;
  storage_path: string;
  byte_size: number;
  sha256: string;
  retention_until: Date;
}

export interface GetEvidenceResult {
  data: Uint8Array;
  byte_size: number;
  sha256: string;
  content_type: string;
  created_at: Date;
  retention_until: Date;
}

export interface EvidenceStorageAdapter {
  /**
   * Persiste uma evidência com retenção legal WORM.
   * Se já existir com o mesmo SHA-256 e bytes idênticos: retorna reused_existing = true.
   * Se já existir com o mesmo SHA-256 mas bytes divergentes: lança EvidenceCollisionConflictError.
   *
   * @param sha256 - Resumo SHA-256 (64 hexadecimais minúsculos).
   * @param canonicalBytes - Conteúdo serializado em UTF-8 estrito.
   * @param retentionDays - Prazo inicial de retenção em dias (ex: 730 para hot storage).
   */
  putEvidence(
    sha256: string,
    canonicalBytes: Uint8Array,
    retentionDays: number,
  ): Promise<PutEvidenceResult>;

  /**
   * Recupera os bytes de uma evidência já armazenada.
   *
   * @param sha256 - Resumo SHA-256.
   */
  getEvidence(sha256: string): Promise<GetEvidenceResult>;

  /**
   * Consulta a existência e tamanho de uma evidência sem fazer download integral do corpo.
   *
   * @param sha256 - Resumo SHA-256.
   */
  headEvidence(
    sha256: string,
  ): Promise<{ exists: boolean; byte_size?: number }>;

  /**
   * Gera uma URL temporária assinada para download direto pelo auditor.
   *
   * @param sha256 - Resumo SHA-256.
   * @param expiresInSeconds - Tempo de expiração da assinatura (máximo 900s / 15 min).
   */
  getPresignedUrl(sha256: string, expiresInSeconds: number): Promise<string>;

  /**
   * Estende preventivamente a data de retenção de um objeto retido sob Object Lock Compliance.
   * A data só pode ser aumentada no futuro; reduções são sumariamente proibidas.
   *
   * @param sha256 - Resumo SHA-256.
   * @param additionalDays - Quantidade de dias a somar à data de retenção atual.
   */
  extendRetention(
    sha256: string,
    additionalDays: number,
  ): Promise<{ newRetentionDate: Date }>;
}
