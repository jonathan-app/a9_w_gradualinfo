/**
 * @fileoverview Matrícula explícita de TOTP para a conta administrativa.
 * @module app/api/admin/auth/mfa/enroll
 * @description Não repete o segredo nem matrícula existente; falhas encerram a operação.
 * @dependencies next/server, lib/admin/auth, lib/admin/session-response, lib/env.
 */
import { guardAdminAccess } from '@/lib/admin/access-guard';
import { NextResponse } from 'next/server';
import { validateAdminRequestOrigin } from '@/lib/admin/auth';
import { createAdminSessionResponse } from '@/lib/admin/session-response';
import { env } from '@/lib/env';
import { UUID_PATTERN } from '@/lib/preview/session';

const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

/**
 * Matricula somente após ação explícita, identidade válida e corpo vazio limitado.
 * @param request - Requisição JSON da folha de setup.
 * @returns Resposta privada, sem detalhe interno de erro.
 */
export async function POST(request: Request) {
  const admissionFailure = guardAdminAccess(request);
  if (admissionFailure) return admissionFailure;
  const fail = (status: number, error: string, next?: string) =>
    NextResponse.json(
      { ok: false, error, ...(next ? { next } : {}) },
      { status, headers },
    );
  if (!validateAdminRequestOrigin(request)) return fail(403, 'forbidden');
  const adminId = env.adminUserId.trim();
  if (!UUID_PATTERN.test(adminId)) return fail(503, 'mfa_unavailable');
  try {
    const { supabase, finish } = await createAdminSessionResponse();
    const reply = (status: number, error: string, next?: string) =>
      finish(fail(status, error, next));
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || user.user?.id !== adminId) return reply(403, 'forbidden');
    if (
      request.headers.get('content-type')?.split(';')[0]?.trim() !==
      'application/json'
    )
      return reply(415, 'unsupported_content_type');
    const reader = request.body?.getReader();
    if (!reader) return reply(400, 'invalid_body');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024) {
          await reader.cancel();
          return reply(413, 'body_too_large');
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const body: unknown = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      );
      if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length
      )
        return reply(400, 'invalid_body');
    } catch {
      return reply(400, 'invalid_body');
    } finally {
      reader.releaseLock();
    }

    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unavailable = () => reply(503, 'mfa_unavailable');
    const conflict = () =>
      reply(409, 'factor_exists', '/admin-dashboard/mfa/verify');
    const work = async () => {
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (expired || aalError || !aal?.currentLevel) return unavailable();
      if (aal.currentLevel === 'aal2')
        return reply(409, 'already_verified', '/admin-dashboard');
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (expired || factorsError || !factors) return unavailable();
      if (
        factors.all.some(
          (f: { factor_type: string }) => f.factor_type === 'totp',
        )
      )
        return conflict();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'GradualInfo',
        friendlyName: 'Admin Authenticator',
      });
      if (expired) return unavailable();
      if (error || !data) {
        const { data: current, error: readError } =
          await supabase.auth.mfa.listFactors();
        if (expired || readError || !current) return unavailable();
        return current.all.some(
          (f: { factor_type: string; friendly_name?: string }) =>
            f.factor_type === 'totp' &&
            f.friendly_name === 'Admin Authenticator',
        )
          ? conflict()
          : unavailable();
      }
      return finish(
        NextResponse.json(
          {
            ok: true,
            factorId: data.id,
            qrCode: data.totp.qr_code,
            secret: data.totp.secret,
            uri: data.totp.uri,
          },
          { headers },
        ),
      );
    };
    try {
      return await Promise.race([
        work(),
        new Promise<NextResponse>((resolve) => {
          timer = setTimeout(() => {
            expired = true;
            resolve(unavailable());
          }, 10000);
        }),
      ]);
    } catch {
      return unavailable();
    } finally {
      expired = true;
      if (timer) clearTimeout(timer);
    }
  } catch {
    return fail(503, 'mfa_unavailable');
  }
}
