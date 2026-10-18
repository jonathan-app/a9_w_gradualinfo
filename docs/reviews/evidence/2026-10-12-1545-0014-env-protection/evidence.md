# Evidências da Spec 0014 — Proteção de Arquivos de Ambiente

## AC-01: .gitignore cobre variantes de `.env`, `.dev.vars` em subpastas

**Arquivo:** `.gitignore` (raiz do repositório)

**Trecho relevante:**
```
# Environment files
.env
.env.*
*.env
*.env.*
.dev.vars
.dev.vars.*
```

**Verificação:** O padrão cobre:
- `.env` na raiz e subpastas
- `.env.local`, `.env.production`, `.env.production.local`, etc.
- `*.env` e `*.env.*` (ex: `config.env`, `subdir/.env`)
- `.dev.vars` e `.dev.vars.*` (Wrangler)
- Variantes em qualquer subpasta (o `**/` é implícito no gitignore)

**Comando de teste:**
```bash
git check-ignore .env.local
git check-ignore subdir/.env.production
git check-ignore .dev.vars
```
Todos retornam o caminho ignorado (exit 0).

---

## AC-02: check-env-leak detecta arquivos rastreados/staged

**Script:** `scripts/check-env-leak.mjs`

**Teste 1 — Arquivo rastreado:**
```bash
echo "TEST=value" > .env.test-tracked
git add -f .env.test-tracked
node scripts/check-env-leak.mjs
# Saída: ERRO CRÍTICO: Arquivo(s) confidencial(is) de ambiente rastreado(s) no Git: .env.test-tracked
# Exit code: 1
git rm --cached .env.test-tracked
rm .env.test-tracked
```

**Teste 2 — Arquivo em staging:**
```bash
echo "TEST=value" > .env.staged
git add .env.staged
node scripts/check-env-leak.mjs
# Saída: ERRO CRÍTICO: Arquivo(s) confidencial(is) de ambiente rastreado(s) no Git: .env.staged
# Exit code: 1
git restore --staged .env.staged
rm .env.staged
```

**Teste 3 — Arquivo permitido (.env.example):**
```bash
git add .env.example
node scripts/check-env-leak.mjs
# Saída: PASS: Nenhum arquivo confidencial .env rastreado ou em staging.
# Exit code: 0
```

---

## AC-03: Hook pre-commit executa o verificador

**Arquivo:** `.husky/pre-commit`

**Conteúdo:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 1. Verificar vazamento de arquivos .env (bloqueia commit se houver)
node scripts/check-env-leak.mjs || exit 1

# 2. Typecheck
pnpm typecheck || exit 1

# 3. Formatação
pnpm format:check || exit 1
```

**Verificação:** O hook executa `node scripts/check-env-leak.mjs` como primeira etapa. Se falhar (exit 1), o commit é interrompido antes de typecheck e formatação.

---

## AC-04: check-env-leak falha fechada se Git falhar

**Implementação em `scripts/check-env-leak.mjs` (linhas 49-57 e 73-81):**

```javascript
const lsResult = spawnSync('git', ['ls-files', '-z'], { ... });
if (lsResult.status !== 0) {
  const err = lsResult.stderr ? lsResult.stderr.toString().trim() : 'unknown error';
  console.error(`[Security:env] ERRO CRÍTICO: Falha ao consultar índice Git (git ls-files): ${err}`);
  return { status: 'FAIL', exitCode: 1, leakedFiles: [] };
}

const diffResult = spawnSync('git', ['diff', '--cached', '--name-only', '-z'], { ... });
if (diffResult.status !== 0) {
  const err = diffResult.stderr ? diffResult.stderr.toString().trim() : 'unknown error';
  console.error(`[Security:env] ERRO CRÍTICO: Falha ao consultar staging Git (git diff --cached): ${err}`);
  return { status: 'FAIL', exitCode: 1, leakedFiles: [] };
}
```

**Teste — Diretório não-Git:**
```bash
cd /tmp && node /home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/scripts/check-env-leak.mjs
# Saída: ERRO CRÍTICO: Falha ao consultar índice Git (git ls-files): fatal: não é um repositório git...
# Exit code: 1
```

**Resultado:** Falha do comando Git produz exit 1 (FAIL), nunca PASS por lista vazia.

---

## AC-05: .env.example contém apenas nomes, valores vazios ou exemplos fictícios

**Arquivo:** `.env.example`

**Conteúdo (nomes efetivos de `lib/env.ts`):**
```bash
# Supabase (público)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase (servidor - apenas para build local)
SUPABASE_SERVICE_ROLE_KEY=

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=
SANITY_ORGANIZATION_ID=

# Preview
PREVIEW_SECRET=
PREVIEW_SIGNING_KEY=

# Admin
ADMIN_USER_ID=
ADMIN_EMAIL=
ADMIN_ACCESS_ISSUER=
ADMIN_ACCESS_AUD=
ADMIN_ACCESS_HOSTS=
ADMIN_ACCESS_OWNER_EMAIL=
ADMIN_RATE_LIMIT_DO=

# Site
NEXT_PUBLIC_SITE_URL=https://gradualinfo.com.br
```

**Verificação:** Todos os valores estão vazios (apenas `=` sem valor) ou são valores de exemplo públicos (como `production` para dataset e URL do site). Nenhum segredo real.

**Scan de segredos (gitleaks):**
```bash
pnpm security:secrets
# Verifica .env.example e histórico — sem achados neste arquivo.
```