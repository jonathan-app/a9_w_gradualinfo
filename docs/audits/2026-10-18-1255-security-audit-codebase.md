# Relatório de Auditoria de Segurança: GradualInfo Codebase

**Data e Hora:** 2026-10-18 12:55 (UTC-3)  
**Alvo:** Repositório `jonathan-app/a9_w_gradualinfo`  
**Commit:** `18b4e86` (HEAD em `main`)  
**Metodologia:** `cloudflare/security-audit-skill` (source-first, defensivo, execução local isolada)  
**Status do Trabalho:** Concluído

---

## 1. Resumo Executivo

Esta auditoria de segurança avaliou as fronteiras de confiança, mecanismos criptográficos, autorização administrativa, superfícies de ingestão externa, mitigação de open redirect e integridade transacional do portal GradualInfo.

A análise confirmou que as salvaguardas perimetrais principais estão robustas: a admissão por Cloudflare Access higieniza cabeçalhos e cookies antes da camada da aplicação, o redirecionamento de afiliados em `/api/out/[id]` valida estritamente o domínio do lojista prevenindo open redirect, e a RPC transacional de avaliação de ofertas implementa bloqueio concorrente `FOR UPDATE` com verificação dupla de idempotência determinística.

Foram identificadas vulnerabilidades e fragilidades de implementação na rota de ingestão de ofertas e no subsistema de nonces que justificam o endurecimento formal planejado na Fase 5 do escopo de backend ([docs/scope/2026-10-14-2135-backend-auth-operacoes.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/scope/2026-10-14-2135-backend-auth-operacoes.md)).

---

## 2. Varreduras Automatizadas de Linha de Base

| Ferramenta                              | Escopo                                        | Resultado            | Observações                                          |
| :-------------------------------------- | :-------------------------------------------- | :------------------- | :--------------------------------------------------- |
| **Gitleaks** (`pnpm security:secrets`)  | Histórico Git completo e árvore               | **0 findings**       | Nenhuma credencial ou token privado exposto          |
| **Semgrep SAST** (`pnpm security:sast`) | Regras de segurança em `security/semgrep.yml` | **0 findings ERROR** | Sem vazamento de chaves de serviço em clientes       |
| **Vitest Unit** (`pnpm test:run`)       | 83 arquivos de testes unitários               | **858/858 PASS**     | Regras de autorização, canonização e hashing válidas |

---

## 3. Mapeamento de Fronteiras de Confiança e Superfícies de Ataque

```
[Cliente Público / Internet]
        │
        ▼ (HTTPS)
[Cloudflare Edge: WAF / Workers]
        │
        ├─► [Proxy Next.js: proxy.ts] ──► Limpeza de Headers Access / Renova Sessão
        │
        ├─► [/api/ingest/ofertas] ─────► HMAC-SHA256 ──► DB Nonces ──► Storage WORM ──► RPC SQL
        │
        ├─► [/api/out/[id]] ──────────► Validação de Hostname ──► Redirecionamento 307
        │
        └─► [/admin-dashboard/*] ─────► Cloudflare Access + AAL2 MFA TOTP ──► Painel
```

### Fronteira 1: Borda e Admissão Administrativa (`proxy.ts` / `lib/admin/*`)

- **Controle:** O Worker intercepta requisições em `scripts/cloudflare-worker.ts` e delega a `lib/admin/access-worker.ts`.
- **Avaliação:** **Seguro.** Cabeçalhos sensíveis (`cf-access-jwt-assertion`, `x-forwarded-host`, etc.) e cookies da Cloudflare são removidos do payload despachado para a aplicação interna, impedindo spoofing de identidade a partir de injeção em upstream.

### Fronteira 2: Despacho de Afiliados e Prevenção de Open Redirect (`app/api/out/[id]/route.ts`)

- **Controle:** A função `validateAffiliateUrl` restringe estritamente o protocolo (`https:` exclusivo), proíbe credenciais na URL, limita a porta a 443 e impõe correspondência estrita de hostname (exato ou subdomínio direto do `merchant_domain` registrado).
- **Avaliação:** **Seguro.** Mitiga bypasses clássicos de open redirect (ex: `https://user:pass@evil.com` ou `https://example.com.evil.com`).

### Fronteira 3: Sessão Administrativa e Elevação de Fator (`lib/admin/auth.ts`)

- **Controle:** Exigência de sessão autenticada restrita ao `ADMIN_USER_ID` e fator de autenticação elevado `aal2` (TOTP validado).
- **Avaliação:** **Seguro.** Deslogados ou usuários com apenas AAL1 são rejeitados antes de qualquer consulta aos dados de auditoria ou configurações.

---

## 4. Achados da Auditoria (Vulnerabilidades e Fragilidades)

### SEC-01 · Exaustão de Memória por Limite de Corpo Tardio (Denial of Service)

- **Severidade:** Alta (P1 / CWE-400 / CWE-770)
- **Localização:** `app/api/ingest/ofertas/route.ts:101-102` e `app/api/admin/ofertas/[id]/avaliar-selo/route.ts:96-98`
- **Mecanismo:** O código avalia o tamanho do corpo através de `Buffer.byteLength(rawBodyText)` **após** executar `await request.text()`.
- **Impacto:** Um cliente malicioso pode enviar um stream HTTP com dezenas de megabytes sem cabeçalho `Content-Length` (ou com transfer-encoding chunked), forçando o runtime a alocar o buffer completo em memória antes de aplicar a rejeição 413, provocando esgotamento de memória no Worker.
- **Remediação Obrigatória:** Interromper o consumo do stream do corpo imediatamente ao atingir 524.288 bytes (512 KB), abortando a conexão sem alocar o excedente.

### SEC-02 · Exposição de Detalhes Internos em Respostas de Erro (Information Disclosure)

- **Severidade:** Média (P1 / CWE-209)
- **Localização:** `app/api/ingest/ofertas/route.ts:494-495, 537`
- **Mecanismo:** Ao ocorrer falha na RPC SQL ou exceção não tratada, a rota devolve `rpcError.message`, `rpcError.code` e `err.message` no payload JSON público.
- **Impacto:** Nomes de tabelas, identificadores internos de constraints, mensagens de erro do PostgreSQL e detalhes de infraestrutura são expostos a coletores externos.
- **Remediação Obrigatória:** Retornar códigos de erro padronizados e genéricos (ex: `evaluation_transaction_failed` e `internal_error`), registrando detalhes sensíveis exclusivamente no log de auditoria interno acompanhados de identificador de correlação (`correlation_id`).

### SEC-03 · Retenção Indefinida e Falta de Validação Estrutural na Tabela de Nonces

- **Severidade:** Média (P1 / CWE-770 / CWE-20)
- **Localização:** `supabase/migrations/20261016230000_modulo_ofertas_ingest_idempotencia.sql:6-11`
- **Mecanismo:** A tabela `offers_ingest_nonces` armazena `(collector_id, nonce, consumed_at)` sem constraints de comprimento máximo ou formato para `collector_id` e `nonce`, e sem rotina de limpeza/particionamento para registros expirados.
- **Impacto:** Crescimento indefinido da tabela de nonces no banco de dados e risco de esgotamento de espaço por requisições legítimas repetidas ou coletores comprometidos.
- **Remediação Obrigatória:** Adicionar restrições de formato (`check (length(collector_id) <= 64)` e `check (length(nonce) between 16 and 128)`) e criar rotina operacional segura de expurgo para registros com `consumed_at < now() - interval '10 minutes'`.

### SEC-04 · Coexistência de Anti-Replay em Memória vs Banco Compartilhado

- **Severidade:** Média (P2 / CWE-362)
- **Localização:** `lib/offers/webhook-auth.ts:16-63` vs `lib/offers/ingest-auth.ts`
- **Mecanismo:** A rota `/api/admin/ofertas/[id]/avaliar-selo` ainda consome `verifyWebhookSignature`, que depende de `MemoryNonceCache` local na instância, enquanto `/api/ingest/ofertas` utiliza a tabela compartilhada `offers_ingest_nonces`.
- **Impacto:** Em ambiente multi-edge (Cloudflare Workers), requisições paralelas direcionadas a edges distintos podem contornar a detecção de replay na rota de avaliar selo.
- **Remediação Obrigatória:** Unificar a validação anti-replay de todas as rotas receptoras de ofertas sob a mesma tabela compartilhada ou banir o uso de webhooks que dependam de memória efêmera.

### SEC-05 · Parsing Permissivo de Timestamp em Assinaturas

- **Severidade:** Baixa (P2 / CWE-20)
- **Localização:** `lib/offers/ingest-auth.ts:107`
- **Mecanismo:** Uso de `Number.parseInt(timestampStr, 10)` sem validar regex estrita de dígitos.
- **Impacto:** Strings contendo sufixos não numéricos são convertidas parcialmente para inteiros válidos, introduzindo discrepância na validação semântica da entrada.
- **Remediação Obrigatória:** Exigir correspondência exata com o padrão `/^\d{10,13}$/` antes da conversão para inteiro.

---

## 5. Plano de Ação e Rastreabilidade

Os achados identificados estão mapeados para as features já cadastradas na **Fase 5** do escopo de backend ([docs/scope/2026-10-14-2135-backend-auth-operacoes.md](file:///home/jonathan/Workspace/Projetos_Ativos/a9_w_gradualinfo/docs/scope/2026-10-14-2135-backend-auth-operacoes.md)):

1. **Feature 8 (Prioridade imediata): Defesa de borda, sanitização pública e ciclo de vida de nonces**
   - Resolução de SEC-01 (limite em stream de 512 KB).
   - Resolução de SEC-02 (sanitização de erros da RPC).
   - Resolução de SEC-03 e SEC-05 (validação e expurgo de nonces, regex estrita de timestamp).
   - Resolução de SEC-04 (eliminação do anti-replay efêmero em memória).
2. **Feature 9 (Segunda etapa): Concorrência transacional, isolamento de privilégios e reconciliação**
   - Reconciliação entre storage e banco de dados para evitar objetos órfãos.
   - Segregação de credenciais por coletor e auditoria do cliente privilegiado `service_role`.
