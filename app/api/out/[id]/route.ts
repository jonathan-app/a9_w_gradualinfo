/**
 * @fileoverview app/api/out/[id]/route.ts — redirecionamento seguro para parceiros de afiliados
 * @module app/api/out/[id]/route
 * @description Implementa despacho protegido de links de afiliados com validação de fronteira
 *   de hostname contra open redirect, HTTP 410 para ofertas inativas/esgotadas e headers restritivos (Spec 0017 / Fatia 4).
 * @dependencies @/lib/supabase/server
 */

import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/server';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface OutRouteDependencies {
  supabaseClient?: unknown;
}

/**
 * Valida estritamente uma URL de afiliado contra o domínio oficial cadastrado do lojista.
 */
export function validateAffiliateUrl(
  rawUrl: string,
  merchantDomain: string,
): { valid: boolean; reason?: string; safeUrl?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'malformed_url' };
  }

  // 1. Apenas protocolo seguro https:
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'insecure_protocol_requires_https' };
  }

  // 2. Rejeição de credenciais embutidas (evita https://user:pass@evil.com)
  if (parsed.username !== '' || parsed.password !== '') {
    return { valid: false, reason: 'credentials_in_url_forbidden' };
  }

  // 3. Rejeição de portas não padrão (apenas porta 443 padrão ou vazia)
  if (parsed.port !== '' && parsed.port !== '443') {
    return { valid: false, reason: 'non_standard_port_forbidden' };
  }

  // 4. Boundary match estrito de hostname contra o domínio do lojista
  // shortcut: Validação estrita de domínio único contra open redirect. Redes intermediárias de afiliados (ex: Lomadee, Awin) exigirão allowlist explícita antes de uso em produção.
  const cleanTargetHost = parsed.hostname.toLowerCase();
  const cleanMerchantDomain = merchantDomain.toLowerCase().trim();

  if (!cleanMerchantDomain) {
    return { valid: false, reason: 'merchant_domain_missing' };
  }

  const isExactMatch = cleanTargetHost === cleanMerchantDomain;
  const isSubdomainMatch = cleanTargetHost.endsWith(`.${cleanMerchantDomain}`);

  if (!isExactMatch && !isSubdomainMatch) {
    return { valid: false, reason: 'merchant_domain_boundary_mismatch' };
  }

  return { valid: true, safeUrl: parsed.toString() };
}

export async function handleOutRedirect(
  request: Request,
  context: { params: Promise<{ id: string }> },
  deps: OutRouteDependencies = {},
): Promise<Response> {
  const params = await context.params;
  const offerId = params?.id;

  if (!offerId || !UUID_V4_REGEX.test(offerId)) {
    return NextResponse.json(
      { error: 'invalid_offer_id', message: 'Identificador de oferta inválido.' },
      { status: 400 },
    );
  }

  const supabase = (deps.supabaseClient ||
    createPublicClient()) as ReturnType<typeof createPublicClient>;

  const { data: offer, error } = await supabase
    .from('offers')
    .select(`
      id,
      status,
      affiliate_url,
      merchants (
        domain,
        is_active
      )
    `)
    .eq('id', offerId)
    .single();

  if (error || !offer) {
    return NextResponse.json(
      { error: 'offer_not_found', message: 'Oferta não encontrada.' },
      { status: 404 },
    );
  }

  const rawMerchant = Array.isArray(offer.merchants)
    ? offer.merchants[0]
    : offer.merchants;
  const merchantDomain = rawMerchant?.domain ?? '';
  const isMerchantActive = rawMerchant?.is_active ?? false;

  // 1. Tratamento de ofertas esgotadas, pausadas ou lojista inativo -> HTTP 410 Gone
  if (
    offer.status === 'esgotada' ||
    offer.status === 'pausada' ||
    !isMerchantActive
  ) {
    const htmlGone = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Oferta Indisponível — GradualInfo</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; box-sizing: border-box; }
    .card { max-width: 480px; background: #111827; border: 1px solid #1f2937; padding: 2rem; border-radius: 12px; text-align: center; }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #f87171; }
    p { color: #9ca3af; line-height: 1.5; margin-bottom: 1.5rem; }
    a { display: inline-block; background: #2563eb; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 500; }
    a:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Esta oferta foi encerrada</h1>
    <p>A oferta que você procurava está esgotada ou foi pausada temporariamente pelo parceiro. Nossos robôs de auditoria mantêm os links atualizados em tempo real.</p>
    <a href="/">Voltar para o portal GradualInfo</a>
  </div>
</body>
</html>`;

    return new Response(htmlGone, {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 2. Validação rigorosa de segurança do link de afiliado
  const validation = validateAffiliateUrl(offer.affiliate_url, merchantDomain);

  if (!validation.valid || !validation.safeUrl) {
    return NextResponse.json(
      {
        error: 'forbidden_redirect',
        message: 'Destino de redirecionamento rejeitado por violação de fronteira de domínio.',
        reason: validation.reason,
      },
      { status: 403 },
    );
  }

  // 3. Despacho legítimo via HTTP 307 Temporary Redirect
  return new Response(null, {
    status: 307,
    headers: {
      Location: validation.safeUrl,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleOutRedirect(request, context);
}
