/**
 * @fileoverview lib/offers/storage/filesystem-adapter.ts — adaptador local de storage probatório em disco (trabalho preliminar sujeito a revisão)
 * @module lib/offers/storage/filesystem-adapter
 * @description Implementação local do adaptador de storage probatório para desenvolvimento e testes (Spec 0021, AC-02 e AC-04).
 *   ATENÇÃO: Código preliminar experimental sujeito a revisão durante o status Proposed da Spec 0021.
 *   Opera com criação atômica sem substituição de destino via linkagem física POSIX (`fs.linkSync`), detecção de concorrência,
 *   recuperação de escritas interrompidas com filtro de PID ativo, e permissão restritiva de leitura local (0o444).
 *   Não substitui nem comprova imutabilidade regulatória de nuvem (R2 Bucket Locks) em produção.
 * @dependencies node:fs, node:path, node:crypto, ./evidence-storage-adapter
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  linkSync,
  unlinkSync,
  readdirSync,
  statSync,
  chmodSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  type EvidenceStorageAdapter,
  type PutEvidenceResult,
  type GetEvidenceResult,
  EvidenceCollisionConflictError,
  EvidenceNotFoundError,
  EvidenceStorageUnavailableError,
  WORMOperationForbiddenError,
} from './evidence-storage-adapter.ts';

interface FileMetadata {
  sha256: string;
  byte_size: number;
  content_type: string;
  created_at: string;
  retention_until: string;
  storage_path: string;
}

export class FilesystemEvidenceStorageAdapter implements EvidenceStorageAdapter {
  private readonly baseDir: string;
  private readonly evidencesDir: string;
  private simulateUnavailable = false;

  constructor(baseDir?: string) {
    this.baseDir = baseDir
      ? resolve(baseDir)
      : resolve(process.cwd(), 'supabase/.evidence-storage');
    this.evidencesDir = join(this.baseDir, 'evidences', 'sha256');
    this.ensureDirs();
    this.recoverInterruptedWrites();
  }

  private ensureDirs(): void {
    if (!existsSync(this.evidencesDir)) {
      mkdirSync(this.evidencesDir, { recursive: true });
    }
  }

  /**
   * Recupera o ambiente de teste expurgando arquivos temporários órfãos de escritas interrompidas.
   * Filtra e preserva temporários cujo processo originário permaneça ativo dentro da janela de tolerância.
   */
  public recoverInterruptedWrites(): void {
    if (!existsSync(this.evidencesDir)) return;
    const now = Date.now();
    const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutos de tolerância para processos ativos

    try {
      const files = readdirSync(this.evidencesDir);
      for (const file of files) {
        if (file.startsWith('.tmp.') && file.endsWith('.tmp')) {
          const filePath = join(this.evidencesDir, file);
          try {
            const stat = statSync(filePath);
            const ageMs = now - stat.mtimeMs;

            // Extrai PID do formato: .tmp.<sha256>.<uuid>.<pid>.tmp ou .tmp.<sha256>.meta.<uuid>.<pid>.tmp
            const parts = file.split('.');
            const pidStr = parts[parts.length - 2];
            const pid = pidStr ? parseInt(pidStr, 10) : NaN;

            // Se o PID não puder ser determinado com segurança, estado é incerto: preserva
            if (Number.isNaN(pid) || pid <= 0) {
              continue;
            }

            let isProcessDead = false;
            try {
              process.kill(pid, 0);
              // Processo ainda está ativo: preserva sempre, idade não autoriza exclusão
              continue;
            } catch (err: unknown) {
              const code = (err as { code?: string })?.code;
              if (code === 'ESRCH') {
                // ESRCH confirma que o processo não existe mais no sistema operacional
                isProcessDead = true;
              } else {
                // EPERM ou erro desconhecido indica processo existente ou estado incerto: preserva
                continue;
              }
            }

            // Expurga apenas se comprovadamente morto (ESRCH) e decorrido o período mínimo de tolerância
            if (isProcessDead && ageMs >= GRACE_PERIOD_MS) {
              unlinkSync(filePath);
            }
          } catch {
            // Ignora falha em arquivo individual
          }
        }
      }
    } catch {
      // Ignora falhas de leitura em pastas sem permissão
    }
  }

  public setSimulateUnavailable(flag: boolean): void {
    this.simulateUnavailable = flag;
  }

  private getFilePath(sha256: string): string {
    return join(this.evidencesDir, `${sha256}.json`);
  }

  private getMetaPath(sha256: string): string {
    return join(this.evidencesDir, `${sha256}.meta.json`);
  }

  public async putEvidence(
    sha256: string,
    canonicalBytes: Uint8Array,
    retentionDays: number,
  ): Promise<PutEvidenceResult> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage em disco indisponível (falha simulada).',
      );
    }

    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error(`SHA-256 inválido: ${sha256}`);
    }

    const calculatedHash = createHash('sha256')
      .update(canonicalBytes)
      .digest('hex');

    if (calculatedHash !== sha256) {
      throw new EvidenceCollisionConflictError(
        `O hash do conteúdo (${calculatedHash}) diverge do SHA-256 informado (${sha256}).`,
      );
    }

    this.ensureDirs();
    const dataPath = this.getFilePath(sha256);
    const metaPath = this.getMetaPath(sha256);
    const storagePath = `evidences/sha256/${sha256}.json`;

    // Idempotência local preliminar: se o arquivo canônico já existir fisicamente
    if (existsSync(dataPath)) {
      const existingBytes = readFileSync(dataPath);
      if (Buffer.compare(existingBytes, Buffer.from(canonicalBytes)) !== 0) {
        throw new EvidenceCollisionConflictError(
          `Conflito no storage local: o arquivo existente para ${sha256} possui conteúdo binário divergente.`,
        );
      }

      let retentionUntil = new Date(Date.now() + retentionDays * 86_400_000);
      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(
            readFileSync(metaPath, 'utf8'),
          ) as FileMetadata;
          retentionUntil = new Date(meta.retention_until);
        } catch {
          // Mantém valor calculado caso o metadado esteja inacessível
        }
      }

      return {
        stored: false,
        reused_existing: true,
        storage_path: storagePath,
        byte_size: existingBytes.length,
        sha256,
        retention_until: retentionUntil,
      };
    }

    const now = new Date();
    const retentionUntil = new Date(now.getTime() + retentionDays * 86_400_000);

    const metadata: FileMetadata = {
      sha256,
      byte_size: canonicalBytes.length,
      content_type: 'application/json',
      created_at: now.toISOString(),
      retention_until: retentionUntil.toISOString(),
      storage_path: storagePath,
    };

    // Criação atômica via arquivo temporário com UUID e PID para segurança concorrente
    const tmpSuffix = `${randomUUID()}.${process.pid}.tmp`;
    const tmpDataPath = join(this.evidencesDir, `.tmp.${sha256}.${tmpSuffix}`);
    const tmpMetaPath = join(
      this.evidencesDir,
      `.tmp.${sha256}.meta.${tmpSuffix}`,
    );

    try {
      writeFileSync(tmpDataPath, Buffer.from(canonicalBytes));
      writeFileSync(tmpMetaPath, JSON.stringify(metadata, null, 2), 'utf8');

      // Aplica permissão restritiva de leitura antes da linkagem atômica
      try {
        chmodSync(tmpDataPath, 0o444);
      } catch {
        // Ignora em sistemas operacionais que não suportam chmod
      }

      // Linkagem atômica POSIX link(2): falha atômica com EEXIST caso o destino já exista,
      // impedindo que processos concorrentes sobrescrevam o arquivo gravado.
      let destinationExisted = false;
      try {
        linkSync(tmpDataPath, dataPath);
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'EEXIST') {
          destinationExisted = true;
        } else {
          throw err;
        }
      }

      try {
        linkSync(tmpMetaPath, metaPath);
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'EEXIST') {
          destinationExisted = true;
        } else {
          throw err;
        }
      }

      // Se o destino já existia previamente ou foi linkado concorrentemente
      if (destinationExisted) {
        const existingBytes = readFileSync(dataPath);
        if (Buffer.compare(existingBytes, Buffer.from(canonicalBytes)) !== 0) {
          throw new EvidenceCollisionConflictError(
            `Conflito concorrente no storage local: o arquivo existente para ${sha256} possui conteúdo binário divergente.`,
          );
        }
        return {
          stored: false,
          reused_existing: true,
          storage_path: storagePath,
          byte_size: existingBytes.length,
          sha256,
          retention_until: retentionUntil,
        };
      }
    } finally {
      // Limpeza segura dos temporários após linkagem ou sob falha
      if (existsSync(tmpDataPath)) {
        try {
          unlinkSync(tmpDataPath);
        } catch {
          // Ignora falha de unlink se o arquivo já foi limpo
        }
      }
      if (existsSync(tmpMetaPath)) {
        try {
          unlinkSync(tmpMetaPath);
        } catch {
          // Ignora falha de unlink se o arquivo já foi limpo
        }
      }
    }

    return {
      stored: true,
      reused_existing: false,
      storage_path: storagePath,
      byte_size: canonicalBytes.length,
      sha256,
      retention_until: retentionUntil,
    };
  }

  public async getEvidence(sha256: string): Promise<GetEvidenceResult> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage em disco indisponível (falha simulada).',
      );
    }

    const dataPath = this.getFilePath(sha256);
    const metaPath = this.getMetaPath(sha256);

    if (!existsSync(dataPath)) {
      throw new EvidenceNotFoundError(
        `Evidência não encontrada no storage local para o hash ${sha256}.`,
      );
    }

    const data = readFileSync(dataPath);
    let createdAt = new Date();
    let retentionUntil = new Date(Date.now() + 730 * 86_400_000);
    let contentType = 'application/json';

    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as FileMetadata;
        createdAt = new Date(meta.created_at);
        retentionUntil = new Date(meta.retention_until);
        contentType = meta.content_type || 'application/json';
      } catch {
        // Fallback para atributos do arquivo se meta falhar
        const stat = statSync(dataPath);
        createdAt = stat.birthtime || stat.mtime;
      }
    }

    return {
      data: new Uint8Array(data),
      byte_size: data.length,
      sha256,
      content_type: contentType,
      created_at: createdAt,
      retention_until: retentionUntil,
    };
  }

  public async headEvidence(
    sha256: string,
  ): Promise<{ exists: boolean; byte_size?: number }> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage em disco indisponível (falha simulada).',
      );
    }

    const dataPath = this.getFilePath(sha256);
    if (!existsSync(dataPath)) {
      return { exists: false };
    }

    const stat = statSync(dataPath);
    return { exists: true, byte_size: stat.size };
  }

  public async getPresignedUrl(
    sha256: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const head = await this.headEvidence(sha256);
    if (!head.exists) {
      throw new EvidenceNotFoundError(
        `Evidência não encontrada para ${sha256}.`,
      );
    }

    const expiryTime = Date.now() + Math.min(expiresInSeconds, 900) * 1000;
    return `/api/admin/evidencias/${sha256}?expires=${expiryTime}&local=1`;
  }

  public async extendRetention(
    sha256: string,
    additionalDays: number,
  ): Promise<{ newRetentionDate: Date }> {
    if (this.simulateUnavailable) {
      throw new EvidenceStorageUnavailableError(
        'Storage em disco indisponível (falha simulada).',
      );
    }

    if (!Number.isSafeInteger(additionalDays) || additionalDays <= 0) {
      throw new WORMOperationForbiddenError(
        'A extensão de retenção exige um valor positivo de dias adicionais.',
      );
    }

    const metaPath = this.getMetaPath(sha256);
    if (!existsSync(metaPath)) {
      throw new EvidenceNotFoundError(
        `Metadados não encontrados para ${sha256}.`,
      );
    }

    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as FileMetadata;
    const currentRetention = new Date(meta.retention_until);
    const newRetention = new Date(
      currentRetention.getTime() + additionalDays * 86_400_000,
    );

    meta.retention_until = newRetention.toISOString();
    writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    return { newRetentionDate: newRetention };
  }

  /**
   * Operação de exclusão é terminantemente proibida pela API de aplicação.
   */
  public async deleteEvidence(_sha256: string): Promise<never> {
    throw new WORMOperationForbiddenError(
      'Operação de exclusão é proibida pela interface de armazenamento probatório.',
    );
  }
}
