# Classificação Individual dos 11 Achados Históricos de Segredos

> **Escopo:** Varredura estática de segurança (`pnpm security:secrets` / `gitleaks`)  
> **Commit de Incidência:** `10eecbcd4323874a6feb62bde1e964188b2338a8`  
> **Mensagem do Commit:** `chore: add environment backup configurations and documentation archive`  
> **Data:** 2026-10-08T01:27:55Z  
> **Autor:** Aqua9 (`contato@aqua9.com.br`)  
> **Status no Código Atual:** Os arquivos foram removidos da árvore ativa (`HEAD`), mas permanecem rastreados no histórico Git.

---

## 1. Tabela de Classificação Individual

| #      | Arquivo Histórico   | Linha | Regra Gitleaks    | Variável Detectada              | Conteúdo / Emissor             | Escopo & Diagnóstico                                                                                             | Nível de Risco                             |
| ------ | ------------------- | ----- | ----------------- | ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **1**  | `.env.local.user`   | L2    | `jwt`             | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT com `iss: "supabase-demo"` | Chave anon padrão do container Supabase Docker local (`127.0.0.1:54321`). Não acessa projeto remoto de produção. | **Baixo** (Credencial de template local)   |
| **2**  | `.env.local.user`   | L3    | `generic-api-key` | `SUPABASE_PREVIEW_TOKEN`        | Token hexadecimal de teste     | Token estático utilizado no mock local do fluxo de preview editorial. Não vinculado a APIs de produção.          | **Médio** (Segredo compartilhado de teste) |
| **3**  | `.env.local.user`   | L4    | `generic-api-key` | `SUPABASE_PREVIEW_PASSWORD`     | Senha hexadecimal de teste     | Credencial estática para endpoint de teste local de preview. Sem efeito no Supabase Cloud.                       | **Médio** (Segredo compartilhado de teste) |
| **4**  | `.env.local.user`   | L7    | `jwt`             | `SUPABASE_SERVICE_ROLE_KEY`     | JWT com `iss: "supabase-demo"` | Chave `service_role` padrão da CLI do Supabase local (`127.0.0.1:54321`). Sem privilégios em instâncias remotas. | **Médio** (Service role de ambiente local) |
| **5**  | `.env.local.devbak` | L2    | `jwt`             | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT com `iss: "supabase-demo"` | Cópia de backup da chave anon local de desenvolvimento (`127.0.0.1:54321`).                                      | **Baixo** (Credencial de template local)   |
| **6**  | `.env.local.devbak` | L3    | `generic-api-key` | `SUPABASE_PREVIEW_TOKEN`        | Token hexadecimal de teste     | Cópia de backup do token de teste local de preview.                                                              | **Médio** (Segredo compartilhado de teste) |
| **7**  | `.env.local.devbak` | L4    | `generic-api-key` | `SUPABASE_PREVIEW_PASSWORD`     | Senha hexadecimal de teste     | Cópia de backup da senha de teste local de preview.                                                              | **Médio** (Segredo compartilhado de teste) |
| **8**  | `.env.local.devbak` | L7    | `jwt`             | `SUPABASE_SERVICE_ROLE_KEY`     | JWT com `iss: "supabase-demo"` | Cópia de backup da chave service_role do Supabase local.                                                         | **Médio** (Service role de ambiente local) |
| **9**  | `.env.local.devbak` | L11   | `jwt`             | `CI_LOCAL_SERVICE_ROLE`         | JWT com `iss: "supabase-demo"` | Chave service_role duplicada para pipelines de CI locais. Identica à do container demo.                          | **Médio** (Service role de ambiente local) |
| **10** | `.env.local.bak`    | L2    | `jwt`             | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT com `iss: "supabase-demo"` | Cópia de backup histórico da chave anon local de desenvolvimento.                                                | **Baixo** (Credencial de template local)   |
| **11** | `.env.local.bak`    | L7    | `jwt`             | `SUPABASE_SERVICE_ROLE_KEY`     | JWT com `iss: "supabase-demo"` | Cópia de backup histórico da chave service_role local.                                                           | **Médio** (Service role de ambiente local) |

---

## 2. Análise Técnica e Conclusões

1. **Ausência de Chaves de Produção:**
   - Nenhuma das 11 ocorrências expôs chaves ou segredos do projeto remoto do Supabase Cloud (`sjngngsjvotagwctzpde.supabase.co`).
   - Todos os tokens JWT analisados possuem emissor `"iss": "supabase-demo"` com URL `http://127.0.0.1:54321`.
2. **Impacto Operacional e Risco:**
   - Embora restritos ao ambiente local/demonstração, o scanner de segurança gitleaks classifica corretamente essas ocorrências como vulnerabilidade por estarem registradas em formato de segredo no histórico versionado do Git.
   - Qualquer rotação de segredo real no Supabase Cloud ou Sanity deve preceder qualquer tentativa de saneamento do histórico.
3. **Tratamento Recomendado:**
   - As credenciais de teste para preview (`SUPABASE_PREVIEW_TOKEN` e `SUPABASE_PREVIEW_PASSWORD`) devem ser regeneradas se houver reaproveitamento em outros ambientes.
   - A reescrita do histórico (`git filter-repo` / `git filter-branch`) permanece suspensa até autorização expressa, pois invalida SHAs referenciados por revisões anteriores e exige coordenação de repositório.
