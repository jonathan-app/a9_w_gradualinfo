/**
 * @fileoverview app/api/admin/evidencias/[hash]/route.ts — consulta de auditoria e download assinado
 * @module app/api/admin/evidencias/[hash]/route
 * @description Rota restrita para auditores com MFA AAL2 obterem links assinados temporários
 *   (máx 15 min) para conferência e download de evidências no storage WORM (Spec 0017 / Fatia 4).
 * @dependencies @/lib/admin/auth, @/lib/offers/storage/memory-adapter, @/lib/offers/storage/evidence-storage-adapter
 */

import { NextResponse } from 'next/server';
import { assertAdminApiAuth } from '@/lib/admin/auth';
import {
  EvidenceNotFoundError,
  EvidenceStorageUnavailableError,
  type EvidenceStorageAdapter,
} from '@/lib/offers/storage/evidence-storage-adapter';
import { getEvidenceStorage } from '@/lib/offers/storage/memory-adapter';

const HASH_REGEX = /^[a-f0-9]{64}$/;

export interface EvidenciaRouteDependencies {
  storage?: EvidenceStorageAdapter;
}

export async function handleGetEvidencia(
  request: Request,
  context: { params: Promise<{ hash: string }> },
  deps: EvidenciaRouteDependencies = {},
): Promise<Response> {
  const auth = await assertAdminApiAuth(request, 'admin');
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const hash = params?.hash?.toLowerCase();

  if (!hash || !HASH_REGEX.test(hash)) {
    return NextResponse.json(
      {
        error: 'invalid_evidence_hash',
        message:
          'O parâmetro hash deve ser um resumo SHA-256 de 64 caracteres hexadecimais.',
      },
      { status: 400 },
    );
  }

  const storage = deps.storage || getEvidenceStorage();

  try {
    const head = await storage.headEvidence(hash);
    if (!head.exists) {
      return NextResponse.json(
        {
          error: 'evidence_not_found',
          message: 'Evidência probatória não encontrada.',
        },
        { status: 404 },
      );
    }

    const downloadUrl = await storage.getPresignedUrl(hash, 900); // 15 minutos

    return NextResponse.json(
      {
        evidence_hash: hash,
        storage_path: `evidences/sha256/${hash}.json`,
        byte_size: head.byte_size,
        download_url: downloadUrl,
        expires_in_seconds: 900,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof EvidenceNotFoundError) {
      return NextResponse.json(
        { error: 'evidence_not_found', message: 'Evidência não encontrada.' },
        { status: 404 },
      );
    }
    if (err instanceof EvidenceStorageUnavailableError) {
      return NextResponse.json(
        {
          error: 'storage_unavailable',
          message: 'Storage de evidências temporariamente indisponível.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'Erro ao consultar evidência probatória.',
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ hash: string }> },
): Promise<Response> {
  return handleGetEvidencia(request, context);
}
