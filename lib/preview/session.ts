/**
 * @fileoverview Grant de preview: emissão, assinatura e verificação.
 * @module lib/preview/session
 * @description O cookie de preview é `payload.assinatura` em base64url. A assinatura usa
 *   HMAC-SHA256 com separação de chave (chave derivada do segredo com domínio fixo) e a
 *   verificação roda em tempo constante, cobrindo formato, assinatura, schema e prazo.
 *   Falha sempre com `null`, nunca exceção: quem chama está no meio de um request.
 * @dependencies node:crypto (createHash, createHmac, timingSafeEqual).
 *
 * Quem emite: a rota de login do preview. Quem lê: middleware e serviços de artigo.
 * Lê/escreve: nada em disco; opera sobre string e `Date.now()` — o parâmetro `now`
 *   existe para teste determinístico.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Nome fixo do cookie. Middleware, rotas e serviços leem por esta constante:
 * string solta espalhada pelo código é como nome de cookie diverge.
 */
export const PREVIEW_COOKIE = 'gradualinfo-preview';

/**
 * Validade do grant em segundos (1800 = 30 min). Janela curta porque preview é
 * sessão temporária de quem está revisando, não login permanente.
 */
export const PREVIEW_TTL = 1800;

/**
 * UUID canônico, aceito como `sub` e `session_id`. Testar o formato cedo
 * evita confiar em payload fora do contrato antes de qualquer outra leitura.
 */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Payload do grant. `version` trava o formato: mudar a estrutura exige nova
 * versão, porque a verificação rejeita qualquer `version !== 1` — não existe
 * parse tolerante. `issued_at`/`expires_at` em segundos unix para JSON curto.
 */
export interface PreviewGrant {
  version: 1;
  sub: string;
  session_id: string;
  issued_at: number;
  expires_at: number;
}

/**
 * Compara dois segredos em tempo constante, sem vazar o ponto de divergência
 * por medição de tempo.
 *
 * @param value - Valor apresentado (ex.: a senha digitada).
 * @param expected - Valor correto.
 * @returns `true` se idênticos. Os dois lados são hasheados antes porque
 *   `timingSafeEqual` exige buffers do mesmo tamanho — e o hash também esconde
 *   o comprimento real do segredo.
 */
export function equalSecret(value: string, expected: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(value).digest(),
    createHash('sha256').update(expected).digest(),
  );
}

/**
 * Assinatura em dois HMAC (key separation): o segredo deriva uma chave com o
 * domínio `gradualinfo-preview:v1`, e só essa chave assina o payload. O domínio
 * impede que uma assinatura feita com o mesmo segredo em outro protocolo seja
 * aproveitada aqui.
 */
function signature(payload: string, secret: string): Buffer {
  const key = createHmac('sha256', secret)
    .update('gradualinfo-preview:v1')
    .digest();
  return createHmac('sha256', key).update(payload).digest();
}

/**
 * Emite um grant assinado, pronto para virar cookie.
 *
 * @param sub - UUID do usuário dono da sessão de preview.
 * @param sessionId - UUID desta emissão; permite distinguir sessões do mesmo
 *   usuário (é o campo que um coletor usaria para revogar por sessão).
 * @param secret - Segredo de assinatura (variável de ambiente).
 * @param [now] - Timestamp em ms; passável em teste para controlar expiração.
 * @returns `payload.assinatura` em base64url.
 */
export function issuePreviewGrant(
  sub: string,
  sessionId: string,
  secret: string,
  now = Date.now(),
): string {
  const issuedAt = Math.floor(now / 1000);
  const grant: PreviewGrant = {
    version: 1,
    sub,
    session_id: sessionId,
    issued_at: issuedAt,
    expires_at: issuedAt + PREVIEW_TTL,
  };
  const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
  return `${payload}.${signature(payload, secret).toString('base64url')}`;
}

/**
 * Valida um grant vindo do cookie e devolve o payload confiável.
 *
 * @param value - Conteúdo bruto do cookie (`undefined` quando ausente).
 * @param secret - Mesmo segredo usado na emissão.
 * @param [now] - Timestamp em ms; passável em teste.
 * @returns O grant validado, ou `null` em qualquer anomalia: cookie ausente,
 *   formato fora de `payload.mac`, assinatura divergente, schema inválido,
 *   `issued_at` no futuro, TTL diferente do contratado ou prazo vencido.
 *   `null` em vez de exceção porque quem chama está no meio do request.
 */
export function readPreviewGrant(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): PreviewGrant | null {
  // Tamanho máximo (2048) recusado antes de qualquer parse: um cookie absurdo
  // não deve custar CPU de split/hash/JSON.
  if (!value || !secret || value.length > 2048) return null;
  try {
    const [payload, mac, extra] = value.split('.');
    // Formato estrito: exatamente dois campos base64url. Um terceiro pedaço é
    // adulteração ou lixo, e nunca payload legítimo emitido por aqui.
    if (
      !payload ||
      !mac ||
      extra ||
      !/^[A-Za-z0-9_-]+$/.test(payload) ||
      !/^[A-Za-z0-9_-]+$/.test(mac)
    )
      return null;
    const supplied = Buffer.from(mac, 'base64url');
    const expected = signature(payload, secret);
    // Comprimento checado antes: timingSafeEqual lança exceção se os buffers
    // tiverem tamanhos diferentes — e lançar aqui viraria 500 em vez de 404.
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      return null;
    const grant: PreviewGrant = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    const seconds = Math.floor(now / 1000);
    // Schema e prazo, depois da assinatura validada: rejeita payload fora do
    // contrato, `issued_at` no futuro (grant pré-datado), TTL que não seja o
    // contratado e qualquer grant já vencido no relógio informado.
    if (
      grant.version !== 1 ||
      typeof grant.sub !== 'string' ||
      !UUID_PATTERN.test(grant.sub) ||
      typeof grant.session_id !== 'string' ||
      !UUID_PATTERN.test(grant.session_id) ||
      !Number.isSafeInteger(grant.issued_at) ||
      !Number.isSafeInteger(grant.expires_at) ||
      grant.issued_at > seconds ||
      grant.expires_at - grant.issued_at !== PREVIEW_TTL ||
      seconds >= grant.expires_at
    )
      return null;
    return grant;
  } catch {
    return null;
  }
}
