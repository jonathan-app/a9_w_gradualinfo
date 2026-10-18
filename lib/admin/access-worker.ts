/**
 * @fileoverview Primeira barreira administrativa antes do fetch OpenNext.
 * @module lib/admin/access-worker
 * @description Isola contexto por requisição e mantém leitura pública sem admissão.
 * @dependencies lib/admin/access.
 */
import {
  admitAdminAccess,
  accessFailureResponse,
  classifyAdminPath,
} from './access';

/**
 * Envolve o despacho sem escrever env compartilhado ou headers de autorização.
 * @param request - Request recebido diretamente pelo Worker.
 * @param bindings - Env original, anterior à inicialização OpenNext.
 * @param dispatch - Fetch OpenNext, recebe cópia de env específica desta requisição.
 * @returns Resposta de admissão ou resposta delegada privada.
 */
export async function dispatchWithAdminAccess(
  request: Request,
  bindings: Record<string, unknown>,
  dispatch: (
    request: Request,
    bindings: Record<string, unknown>,
  ) => Promise<Response>,
): Promise<Response> {
  const classification = classifyAdminPath(new URL(request.url).pathname);
  const scoped: Record<string, unknown> = {
    ...bindings,
    ADMIN_ACCESS_REQUEST_CONTEXT: undefined,
  };
  if (classification === 'ambiguous')
    return accessFailureResponse(request, 400);
  const headers = new Headers(request.headers);
  headers.delete('forwarded');
  headers.delete('x-forwarded-host');
  headers.delete('cf-access-jwt-assertion');
  headers.delete('cf-access-authenticated-user-email');
  // Cookies Access pertencem à borda; o Next recebe apenas os demais cookies.
  const cookies = headers.get('cookie');
  if (cookies) {
    const remaining = cookies
      .split(';')
      .filter(
        (part) =>
          !['CF_Authorization', 'CF_Binding'].includes(
            part.trim().split('=')[0] ?? '',
          ),
      )
      .join(';');
    if (remaining.trim()) headers.set('cookie', remaining);
    else headers.delete('cookie');
  }
  const forwarded = new Request(request, { headers });
  if (classification === 'public') return dispatch(forwarded, scoped);
  const admission = await admitAdminAccess(request, bindings);
  if (admission instanceof Response) return admission;
  scoped.ADMIN_ACCESS_REQUEST_CONTEXT = admission;
  const response = await dispatch(forwarded, scoped);
  const result = new Response(response.body, response);
  result.headers.set('Cache-Control', 'private, no-store');
  result.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return result;
}
