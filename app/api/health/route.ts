import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';

/**
 * app/api/health/route.ts — sonda de liveness
 *
 * Por que Hono e não um handler puro
 * A mesma base de código serve API, webhook e rota de borda. O Hono dá
 * roteamento, validação e middleware (como o rate limiter) sem trocar de
 * linguagem; no final ele vira um `fetch` handler do Next, sem custo de
 * runtime.
 *
 * Por que o rate limiter aqui
 * Um endpoint público sem limite é um alvo trivial: basta um laço de requisição
 * para derrubar o Worker. `hono-rate-limiter` conta por IP, com janela de um
 * minuto. Trocar o storage em memória pelo KV do Cloudflare é o próximo passo
 * quando houver mais de uma instância — em memória, o limite vale só por
 * instância.
 */
const app = new Hono().basePath('/api/health');

app.use(
  '*',
  rateLimiter({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: 'draft-7',
    // Na Cloudflare o IP real chega no cabeçalho injetado pela borda. Ler o IP
    // de `c.env` (que o Hono só tem no runtime do Bun/Node) quebraria no
    // Worker; o cabeçalho é a única fonte confiável aqui.
    keyGenerator: (c) =>
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      'desconhecido',
  }),
);

app.get('/', (c) =>
  c.json({
    status: 'ok',
    runtime: 'cloudflare-workers',
    timestamp: new Date().toISOString(),
  }),
);

app.notFound((c) => c.json({ error: 'not_found' }, 404));

/**
 * O Hono é um objeto Request -> Response. `export const GET` entrega uma função
 * com a assinatura que o App Router espera, e o fetch do request que o Next
 * construiu é repassado sem adaptação.
 */
export const GET = (request: Request) => app.fetch(request);
