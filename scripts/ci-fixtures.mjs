import { readFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const url = new URL(config.API_URL);
if (
  !['127.0.0.1', 'localhost'].includes(url.hostname) ||
  !process.env.GITHUB_ENV
)
  throw new Error('Fixtures somente na stack local descartável de CI.');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
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
const origin = 'https://localhost:3100';
const rows = [
  {
    title:
      'Fixture maliciosa </script><script>globalThis.__injected=1</script> & >',
    slug: 'fixture-malicioso',
    content:
      '# Subtítulo\nTexto seguro. <script>globalThis.__injected=1</script>',
    fontes_citadas: [],
  },
  {
    title: 'Fixture sem fontes',
    slug: 'fixture-sem-fontes',
    content: 'Artigo sem fontes.',
    fontes_citadas: [],
  },
].map((post) => ({
  ...post,
  excerpt: 'Resumo de teste',
  cover_image_url: `${origin}/logo.svg`,
  editoria: 'Programação',
  author_name: 'Autor de teste',
  status: 'publicado',
  published_at: new Date().toISOString(),
}));
const { error: insertError } = await admin
  .from('posts')
  .upsert(rows, { onConflict: 'slug' });
if (insertError) throw new Error('Falha ao preparar artigos descartáveis.');
const values = {
  NEXT_PUBLIC_SUPABASE_URL: config.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: config.ANON_KEY,
  SUPABASE_PREVIEW_TOKEN: token,
  SUPABASE_PREVIEW_PASSWORD: password,
  SUPABASE_PREVIEW_EMAIL: email,
  SUPABASE_PREVIEW_USER_ID: data.user.id,
  NEXT_PUBLIC_SITE_URL: origin,
  E2E_BASE_URL: origin,
  E2E_PRODUCTION: '1',
};
appendFileSync(
  process.env.GITHUB_ENV,
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n',
);
console.log('Fixtures locais e credenciais distintas provisionadas.');
