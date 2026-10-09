# Classificação dos 11 Achados Históricos de Segredos (gitleaks)

**Commit fonte:** `10eecbcd4323874a6feb62bde1e964188b2338a8` (2026-10-08T01:27:55Z)
**Arquivos afetados:** `.env.local.user`, `.env.local.devbak`, `.env.local.bak`
**Ação requerida:** Rotação **antes** de qualquer reescrita de histórico (force-push não revoga credenciais)

---

## Resumo por tipo

| Tipo                             | Quantidade | Credenciais expostas                          |
| -------------------------------- | ---------- | --------------------------------------------- |
| JWT (Supabase anon/service_role) | 4          | Chaves de API do Supabase (anon/service_role) |
| SUPABASE_PREVIEW_TOKEN           | 3          | Token de preview do Supabase                  |
| SUPABASE_PREVIEW_PASSWORD        | 2          | Senha de preview do Supabase                  |
| SUPABASE_SERVICE_ROLE / outros   | 2          | Service role key / configuração sensível      |

---

## Detalhamento individual

### `.env.local.user` (4 findings)

1. **JWT** (linha 2) — `NEXT_PUBLIC_SUPABASE_ANON_KEY` / chave anon do Supabase
   - Risco: Acesso anônimo ao banco, leitura de dados públicos
   - Ação: Rotacionar no painel Supabase → Settings → API

2. **SUPABASE_PREVIEW_TOKEN** (linha 3) — Token de preview
   - Risco: Emissão de sessões de preview não autorizadas
   - Ação: Revogar/regenerar no Supabase Vault ou painel de preview

3. **SUPABASE_PREVIEW_PASSWORD** (linha 4) — Senha de preview
   - Risco: Autenticação em endpoints de preview protegidos
   - Ação: Alterar no painel Supabase / configuração de preview

4. **JWT** (linha 7) — `CI_LOCAL_SERVICE_ROLE` / service_role key
   - Risco: **CRÍTICO** — Acesso admin completo ao banco (bypass RLS)
   - Ação: **Rotacionar imediatamente** no Supabase → Settings → API → service_role

---

### `.env.local.devbak` (5 findings)

5. **JWT** (linha 2) — `NEXT_PUBLIC_SUPABASE_ANON_KEY` (duplicata)
6. **JWT** (linha 7) — Service role key (duplicata)
7. **JWT** (linha 11) — Outro JWT (possível `SUPABASE_PREVIEW_TOKEN` em formato JWT)
8. **SUPABASE_PREVIEW_TOKEN** (linha 3) — Token de preview (duplicata)
9. **SUPABASE_PREVIEW_PASSWORD** (linha 4) — Senha de preview (duplicata)

---

### `.env.local.bak` (2 findings)

10. **JWT** (linha 2) — `NEXT_PUBLIC_SUPABASE_ANON_KEY` (duplicata)
11. **JWT** (linha 7) — Service role key (duplicata)

---

## Plano de rotação (ordem de prioridade)

1. **CRÍTICO** — Service Role Key (findings 4, 6, 7, 11): Rotacionar no Supabase Dashboard → Settings → API → "Reveal service_role key" → "Rotate"
2. **ALTO** — Preview Token/Password (findings 2, 3, 5, 8, 9): Regenerar na configuração de preview / Vault
3. **MÉDIO** — Anon Key (findings 1, 5, 10): Rotacionar no Supabase Dashboard → Settings → API → "Rotate anon key"

---

## Verificação pós-rotação

- [ ] `pnpm security:secrets` roda limpo (0 findings)
- [ ] Testes E2E passam com novas credenciais
- [ ] Deploy em staging validado
- [ ] Apenas então considerar `git filter-repo` / `git rebase` para limpar histórico

---

## Nota sobre force-push

> **Force-push não revoga credenciais.** Ele apenas remove o segredo do histórico Git visível. Qualquer clone anterior, fork, ou mirror (GitHub, CI, laptop de dev) ainda contém o segredo. A rotação no provedor (Supabase) é **obrigatória** antes de qualquer limpeza de histórico.
