# Validação das correções locais

Contrato de autorização: `docs/specs/0003-preview-autorizacao.md`, Accepted. As correções preservam a autorização existente, sem introduzir papéis ou rotas novas.

## Resultados

- `node_modules/.bin/vitest run __tests__/unit/supabase-proxy.test.ts`: 12 testes passaram. Cobre caminhos protegidos com extensão, exclusão de assets, 404 sem continuidade, preservação dos cookies, cache privado e falha de Auth sem liberação de artigo privado.
- `node_modules/.bin/vitest run __tests__/unit/preview-logout.test.ts`: 3 testes passaram.
- `node_modules/.bin/tsc --noEmit`: código 0.
- ESLint nos arquivos de código alterados: código 0.
- ESLint completo: código 0, com dois avisos anteriores de console em `lib/audit.ts`.
- Prettier completo: código 0.
- Suíte completa: 86 passaram e 18 falharam em `gates.test.ts` por `spawnSync git EPERM`, antes da execução de suas asserções. Não é aprovação da suíte completa.
- Gitleaks e Semgrep: bloqueados no sandbox por `spawnSync EPERM`. Sem resultado de segurança aprovado.
- Solicitação de execução dos scanners fora do sandbox encerrada sem aprovação ou execução. Segurança continua pendente.
- Consultas `wrangler whoami` e HTTP ao Worker fora do sandbox: rejeitadas pela revisão automática de aprovação, sem motivo detalhado no retorno. Conta e site não foram revalidados nesta sessão.
- Reexecução da suíte completa fora do sandbox: rejeitada pela revisão automática de aprovação, sem motivo detalhado no retorno.

## Progresso da Conexão Remota (2026-10-08)

- **Projeto Supabase identificado**: `sjngngsjvotagwctzpde` (https://sjngngsjvotagwctzpde.supabase.co)
- **`.env.production.local` atualizado**: URL do Supabase e chave pública (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) configuradas
- **`NEXT_PUBLIC_SITE_URL` alinhada**: `https://gradualinfo.com.br` em `.env.production.local` e `wrangler.jsonc`
- **Preview de produção**: explicitamente desativado (variáveis vazias) até configurar identidade editorial remota
- **`wrangler.jsonc`**: `keep_vars: true` preserva secrets configurados no painel Cloudflare
- **Consulta REST ao Supabase remoto**: falhou no sandbox com `EAI_AGAIN` (rede); reexecução fora do sandbox aguarda aprovação

## Pendências para Conclusão

1. **Configurar secrets de preview no Cloudflare** (painel ou `wrangler secret put`):
   - `SUPABASE_PREVIEW_TOKEN` (>= 32 bytes, diferente da senha)
   - `SUPABASE_PREVIEW_PASSWORD`
   - `SUPABASE_PREVIEW_EMAIL`
   - `SUPABASE_PREVIEW_USER_ID` (UUID de usuário com `app_metadata.preview=true` no Supabase remoto)
   - `PREVIEW_SIGNING_KEY` (chave HMAC-SHA256 para grants de preview)

2. **Validar conexão remota** (fora do sandbox):
   - `wrangler whoami` para confirmar autenticação
   - Consulta REST ao Supabase remoto (`/rest/v1/posts?select=id&limit=1`)
   - Verificar migrations e RLS aplicadas no projeto remoto

3. **Build e validação completa**:
   - `pnpm check:all` (typecheck, lint, format, testes)
   - `pnpm build` (OpenNext para Cloudflare)
   - `/check` para revisão independente

4. **Deploy e verificação no Worker publicado**:
   - Home, artigo publicado, 404 de rascunho anônimo
   - Entrada por POST, rejeição de origem externa
   - Cookies seguros (HttpOnly, Secure, SameSite=Lax)
   - Prazo de preview e logout

## Rodada de Baseline Público do Worker (2026-10-08)

Tentativa de verificação externa das rotas do Worker em produção (`https://gradualinfo-editorial.a3qua96.workers.dev`) a partir do ambiente de execução:

- **Rotas consultadas**: 6 rotas HTTP avaliadas.
- **Resultados observados**:
  - Todas as rotas retornaram **HTTP 403** com bloqueio de segurança perimetral da Cloudflare;
  - Rotas `/sitemap.xml`, `/robots.txt` e rotas de preview retornaram página de bloqueio com `error code: 1010` (Cloudflare Browser Integrity / WAF);
  - Tentativa adicional via `curl` encerrou em timeout.
- **Análise técnica**: Bloqueios de borda (WAF/WAF 1010/timeout) ocorrem antes de a requisição atingir o runtime do Next.js/OpenNext no Worker. Portanto, as respostas **não comprovam o comportamento real das rotas da aplicação nem o status da conectividade com o Supabase de produção**.
- **Veredito formal desta rodada**: **UNVERIFIABLE**.
- **Direcionamento**: A validação das rotas e do runtime precisará ser realizada através de um cliente/ambiente autorizado a transpor a borda de segurança da Cloudflare (preservando todas as proteções perimetrais), sem mascarar bloqueios de rede como testes bem-sucedidos. Arquivos, configurações e deploy permanecem inalterados. Implementação do Sanity e novo preview (spec 0006) permanecem pendentes.
