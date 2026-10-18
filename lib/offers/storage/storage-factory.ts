/**
 * @fileoverview lib/offers/storage/storage-factory.ts — fábrica centralizada do subsistema de storage probatório
 * @module lib/offers/storage/storage-factory
 * @description Fábrica com política fail-closed para resolução do adaptador de storage de evidências (Spec 0021, AC-02, AC-03 e AC-09).
 *   Em produção (ou quando OFFERS_STORAGE_BACKEND=r2), exige adaptador Cloudflare R2 com retenção imutável homologada (Bucket Locks).
 *   A simples configuração do binding ou credenciais R2 NÃO autoriza a concessão de selos enquanto o AC-09 permanecer UNVERIFIABLE
 *   (trava de execução fail-closed: OFFERS_STORAGE_WORM_VERIFIED=true exigido).
 *   Em produção, é terminantemente proibido qualquer fallback para memória volátil ou sistema de arquivos local.
 *   Em desenvolvimento e testes locais, utiliza FilesystemEvidenceStorageAdapter para retenção durável de testes.
 * @dependencies @opennextjs/cloudflare, ./evidence-storage-adapter, ./filesystem-adapter, ./r2-adapter
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  type EvidenceStorageAdapter,
  EvidenceStorageUnavailableError,
} from './evidence-storage-adapter';
import { FilesystemEvidenceStorageAdapter } from './filesystem-adapter';
import { R2EvidenceStorageAdapter, type R2BucketLike } from './r2-adapter';

let activeStorageInstance: EvidenceStorageAdapter | null = null;

/**
 * Permite injetar explicitamente uma instância customizada (utilizado em suítes de testes isoladas).
 */
export function setEvidenceStorageOverride(
  adapter: EvidenceStorageAdapter | null,
): void {
  activeStorageInstance = adapter;
}

/**
 * Resolve o adaptador de storage probatório adequado para o ambiente de execução atual.
 *
 * @throws {EvidenceStorageUnavailableError} Se executado em produção sem o storage de nuvem configurado e homologado com WORM.
 * @returns Instância compatível com a interface EvidenceStorageAdapter.
 */
export function getOffersEvidenceStorage(): EvidenceStorageAdapter {
  if (activeStorageInstance) {
    return activeStorageInstance;
  }

  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.CF_PAGES) ||
    Boolean(process.env.WORKERS_ENV === 'production');

  const useR2 = isProduction || process.env.OFFERS_STORAGE_BACKEND === 'r2';

  if (useR2) {
    // 1. Tenta resolver binding nativo do Worker no contexto Cloudflare
    let bindingFromContext: R2BucketLike | undefined;
    try {
      const cfEnv = getCloudflareContext().env as Record<string, unknown>;
      bindingFromContext = (cfEnv?.EVIDENCE_BUCKET ||
        cfEnv?.R2_EVIDENCE_BUCKET) as R2BucketLike | undefined;
    } catch {
      // Fora do runtime do Worker ou sem contexto ativo
    }

    // 2. Verificação de configuração de bucket R2 via binding ou credenciais
    const bucketName = process.env.R2_EVIDENCE_BUCKET?.trim();
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

    const r2Configured = Boolean(
      bindingFromContext ||
      (bucketName && accountId && accessKeyId && secretAccessKey),
    );

    if (!r2Configured) {
      throw new EvidenceStorageUnavailableError(
        'Storage imutável de evidências em nuvem (R2 Bucket Locks) não configurado para o ambiente de produção. Fallback para memória ou filesystem é terminantemente proibido.',
      );
    }

    // 3. Trava de execução de imutabilidade WORM (Spec 0021 AC-09):
    // Configurar o binding/credenciais, isoladamente, NÃO basta para liberar concessão de selos.
    // Exige homologação física comprovada de Bucket Lock no provedor (OFFERS_STORAGE_WORM_VERIFIED=true).
    const isWormHomologated =
      process.env.OFFERS_STORAGE_WORM_VERIFIED === 'true';
    if (!isWormHomologated) {
      throw new EvidenceStorageUnavailableError(
        'Storage Cloudflare R2 configurado, mas retenção física WORM (Bucket Locks) permanece não homologada no provedor (AC-09 UNVERIFIABLE). Concessão de selos bloqueada em 503 fail-closed.',
      );
    }

    activeStorageInstance = new R2EvidenceStorageAdapter({
      bucket: bindingFromContext,
      bucketName: bucketName || 'gradualinfo-evidencias',
    });
    return activeStorageInstance;
  }

  // Ambiente de desenvolvimento ou testes locais: persistência física durável no disco local
  activeStorageInstance = new FilesystemEvidenceStorageAdapter();
  return activeStorageInstance;
}
