/**
 * @fileoverview Provisiona fixtures descartáveis para e2e e Lighthouse na stack local de CI.
 * @module scripts/ci-fixtures
 * @description Cria identidades no Supabase local (uma principal de preview + dois negativos:
 *   sem claim e com claim de outro dono), publica artigos — incluindo um com XSS de propósito
 *   e doze com datas escalonadas para ordenação — e exporta credenciais/URLs para os passos
 *   seguintes do job via `GITHUB_ENV`.
 * @dependencies @supabase/supabase-js (cliente admin), node:fs, node:crypto, node:process.
 *
 * Quando executado: CI (jobs `e2e` e `lighthouse`), logo após `supabase:reset --local`.
 * Lê: JSON de status do Supabase (`pnpm supabase:status`, 1º argumento) e `CI_FIXTURE_ORIGIN`/
 *   `E2E_NETWORK_FAULTS` do ambiente.
 * Escreve: apenas `GITHUB_ENV` (linhas `CHAVE=valor` anexadas); nenhum arquivo do repo.
 * Códigos de saída: 0 = fixtures provisionadas; 1 = qualquer falha ou chamada fora da stack
 *   local (nunca roda contra um projeto remoto).
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const url = new URL(config.API_URL);
// Trava de absurdo: este script cria usuários e artigos com credenciais descartáveis — só
// faz sentido na stack local de CI (host loopback) e com `GITHUB_ENV` para onde escrever.
// Sem as duas condições, é erro em vez de risco de poluir um projeto real.
if (
  !['127.0.0.1', 'localhost'].includes(url.hostname) ||
  !process.env.GITHUB_ENV
)
  throw new Error('Fixtures somente na stack local descartável de CI.');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
// Credenciais de teste são aleatórias a cada execução: nunca vêm do código nem de um valor
// fixo que sobreviva ao job.
const token = randomBytes(32).toString('hex');
const password = randomBytes(32).toString('hex');
const email = `preview-${randomBytes(6).toString('hex')}@example.invalid`;
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { preview: true },
});
if (error || !data.user)
  throw new Error('Falha ao preparar identidade descartável.');
// Negativos de autorização: um usuário sem o claim `preview` e outro com o claim alheio —
// são eles que provam que as rotas protegidas negam (e não só deixam passar o positivo).
const otherUsers = {};
for (const [name, claim] of [
  ['noClaim', false],
  ['otherIdentity', true],
]) {
  const otherPassword = randomBytes(32).toString('hex');
  const otherEmail = `${name}-${randomBytes(6).toString('hex')}@example.invalid`;
  const result = await admin.auth.admin.createUser({
    email: otherEmail,
    password: otherPassword,
    email_confirm: true,
    app_metadata: { preview: claim },
  });
  if (result.error || !result.data.user)
    throw new Error('Falha ao preparar negativo de identidade.');
  otherUsers[name] = {
    email: otherEmail,
    password: otherPassword,
    id: result.data.user.id,
  };
}
const origin = process.env.CI_FIXTURE_ORIGIN ?? 'https://localhost:3100';
const rows = [
  {
    // Artigo com XSS de propósito: o `<script>` no título e no conteúdo é matéria-prima das
    // asserções de sanitização — se o render vazar, o teste detecta, não o CI.
    title:
      'Fixture maliciosa </script><script>globalThis.__injected=1</script> & >',
    slug: 'fixture-malicioso',
    content:
      '# Subtítulo\nTexto **seguro**. <script>globalThis.__injected=1</script>\n\n| Cabeçalho |\n| --- |\n| Valor |',
    fontes_citadas: [],
  },
  {
    title: 'Fixture sem fontes',
    slug: 'fixture-sem-fontes',
    content: 'Artigo sem fontes.',
    fontes_citadas: [],
  },
  // Dezesseis artigos com datas e campos distintos provam o limite da grade e impedem que
  // valores fixos na apresentação passem por coincidência.
  ...Array.from({ length: 16 }, (_, index) => ({
    title: `Fixture ordenação ${index}`,
    slug: `fixture-ordenacao-${index}`,
    content: 'Artigo para provar limite e ordem.',
    fontes_citadas: [],
    published_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  })),
].map((post, index) => ({
  ...post,
  excerpt: `Resumo de teste ${index}`,
  cover_image_url: `${origin}/editorial-cover.svg?fixture=${index}`,
  editoria: `Programação ${index}`,
  author_name: 'Autor de teste',
  status: 'publicado',
  published_at: post.published_at ?? new Date().toISOString(),
}));
const { error: insertError } = await admin
  .from('posts')
  .upsert(rows, { onConflict: 'slug' });
if (insertError) throw new Error('Falha ao preparar artigos descartáveis.');
const values = {
  CI_LOCAL_SERVICE_ROLE: config.SERVICE_ROLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: config.SERVICE_ROLE_KEY,
  OFFERS_INGEST_SECRET:
    process.env.OFFERS_INGEST_SECRET || randomBytes(32).toString('hex'),
  // Com falhas de rede ligadas, o browser aponta para o proxy de falhas (3110), e o servidor
  // guarda o upstream real para o proxy rotear — é assim que o e2e simula rede ruim sem
  // derrubar a stack.
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.E2E_NETWORK_FAULTS === '1'
      ? 'http://127.0.0.1:3110'
      : config.API_URL,
  E2E_SUPABASE_UPSTREAM: config.API_URL,
  E2E_FAULT_SECRET: randomBytes(32).toString('hex'),
  E2E_NO_CLAIM: JSON.stringify(otherUsers.noClaim),
  E2E_OTHER_IDENTITY: JSON.stringify(otherUsers.otherIdentity),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: config.ANON_KEY,
  SUPABASE_PREVIEW_TOKEN: token,
  SUPABASE_PREVIEW_PASSWORD: password,
  SUPABASE_PREVIEW_EMAIL: email,
  SUPABASE_PREVIEW_USER_ID: data.user.id,
  NEXT_PUBLIC_SITE_URL: origin,
  E2E_BASE_URL: origin,
  E2E_PRODUCTION: '1',
  E2E_REAL_SUPABASE: '1',
  ADMIN_USER_ID: '11111111-1111-1111-1111-111111111111',
  ADMIN_EMAIL: 'ana@exemplo.dev',
};
// Mascaramento de credenciais efêmeras nos logs do runner do GitHub Actions
for (const secretVal of [
  config.SERVICE_ROLE_KEY,
  token,
  password,
  otherUsers.noClaim?.password,
  otherUsers.otherIdentity?.password,
  values.E2E_FAULT_SECRET,
  values.E2E_NO_CLAIM,
  values.E2E_OTHER_IDENTITY,
  values.SUPABASE_PREVIEW_TOKEN,
  values.SUPABASE_PREVIEW_PASSWORD,
  values.SUPABASE_SERVICE_ROLE_KEY,
  values.OFFERS_INGEST_SECRET,
]) {
  if (secretVal && typeof secretVal === 'string') {
    console.log(`::add-mask::${secretVal}`);
  }
}

// GITHUB_ENV é o canal de passagem entre passos do job: as credenciais nascem aqui e
// morrem com o runner — nada disso toca o repositório nem vira artefato.
appendFileSync(
  process.env.GITHUB_ENV,
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n',
);
console.log('Fixtures locais e credenciais distintas provisionadas.');
