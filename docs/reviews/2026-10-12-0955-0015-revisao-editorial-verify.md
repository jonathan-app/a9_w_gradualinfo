# Relatório de Verificação Formal — Spec 0015 (/check verify)

**Data:** 2026-10-12 09:55 (America/Sao_Paulo)  
**Spec Avaliada:** `docs/specs/2026-10-12-0828-0015-revisao-editorial-seis-rascunhos.md` (Accepted)  
**Artefato de Resultado:** `docs/reviews/evidence/2026-10-12-0955-0015-revisao-editorial/2026-10-12-0955-resultado.json`  
**Decisão da Autoridade (`scripts/check-decision.mjs`):** **APROVADO** (exit code 0)

---

## 1. Resumo da Decisão da Autoridade

A avaliação da Spec 0015 foi executada pela autoridade canônica do repositório (`node scripts/check-decision.mjs`).

```json
{
  "approved": true,
  "verdict": "APROVADO",
  "counts": {
    "totalACs": 8,
    "PASS": 8,
    "FAIL": 0,
    "UNVERIFIABLE": 0,
    "missingEvidence": 0,
    "BLOCKER": 0,
    "WARNING": 0
  },
  "reasons": []
}
```

- **Total de ACs:** 8 de 8 avaliados com sucesso.
- **PASS:** 8
- **FAIL:** 0
- **UNVERIFIABLE:** 0
- **Missing Evidence:** 0
- **Blockers:** 0
- **Warnings:** 0
- **Motivos de reprovação (`reasons`):** nenhum (lista vazia).

---

## 2. Matriz de Verificação Empírica por Critério de Aceite

| Critério de Aceite           | Descrição Sintética                                                                         |  Status  | Evidência Empírica                                                                                          |
| :--------------------------- | :------------------------------------------------------------------------------------------ | :------: | :---------------------------------------------------------------------------------------------------------- |
| **`editorial-review/AC-01`** | Padrão de estrutura e leitura adotado nos 6 rascunhos com auditoria do artigo de referência | **PASS** | `docs/reviews/evidence/2026-10-12-0955-0015-revisao-editorial/evidence.md` (seção 1.1)                      |
| **`editorial-review/AC-02`** | Matriz de checagem factual com fontes primárias oficiais e datas de consulta                | **PASS** | `docs/reviews/2026-10-12-0939-0015-revisao-editorial-seis-rascunhos.md` e `evidence.md` (seção 1.2)         |
| **`editorial-review/AC-03`** | Nenhuma afirmação não verificada como fato; dados do GradualInfo comprovados no repo        | **PASS** | `evidence.md` (seção 1.3): auditoria direta em `proxy.ts`, `lib/admin/auth.ts`, `lib/preview/session-do.ts` |
| **`editorial-review/AC-04`** | Tom instrutivo para estudantes e inclusão de procedimento prático reprodutível              | **PASS** | `evidence.md` (seção 1.4): validação de blocos de código e tabelas nos 6 rascunhos                          |
| **`editorial-review/AC-05`** | Metadados frontmatter padronizados, imagens em `public/` e catálogo local sincronizado      | **PASS** | `evidence.md` (seção 1.5): 6 posts em `lib/editorial/local-posts.json` com capas existentes                 |
| **`editorial-review/AC-06`** | `alt=""` para capas decorativas e preservação dos 8 arquivos protegidos (100% hash match)   | **PASS** | `evidence.md` (seção 1.6): 8 de 8 arquivos com 0% de divergência contra `preservados.json`                  |
| **`editorial-review/AC-07`** | Ordem pedagógica sugerida de publicação registrada sem disparar publicação                  | **PASS** | `evidence.md` (seção 1.7) e Spec 0015 (seção "Ordem Sugerida de Publicação")                                |
| **`editorial-review/AC-08`** | Separação estrita de estados: sem publicação no Sanity Studio e sem deploy de produção      | **PASS** | `evidence.md` (seção 1.8): dataset Sanity e Cloudflare intocados                                            |

---

## 3. Integridade dos 8 Arquivos Protegidos do Leitor

A conferência byte a byte contra `scratch/entregas-arquivadas/gradualinfo-home-cambridge/preservados.json` atesta total integridade:

| Arquivo Protegido                        | Hash Calculado (SHA-256)                                           | Status  |
| :--------------------------------------- | :----------------------------------------------------------------- | :-----: |
| `app/globals.css`                        | `7321b6c2bebc8b9b6cc16eff5e84f598842487fe415f54e43612d4a7b564b9ae` | ✓ MATCH |
| `app/layout.tsx`                         | `4c137e8eb68e5675a4642b9e5d285e80981405317de3cbda8ed7d7224c397562` | ✓ MATCH |
| `components/layout/site-header.tsx`      | `4bcc0df4c73a1af3f477c785b981768081c175c8aa49a14ac63eba6023639b6e` | ✓ MATCH |
| `app/artigos/[slug]/page.tsx`            | `74353e2c3bc972c9a62773b3aa76f8b28208f288fe5616910899af52ccd03155` | ✓ MATCH |
| `components/editorial/article-body.tsx`  | `1a83d6ff5f31b094db7ae29286466f612bd1d04235aad7474787d107d316fa2f` | ✓ MATCH |
| `components/editorial/article-share.tsx` | `d8e7fbb4ab8ed51c641ca4b5c1961315762491aece11cbf7af41abeb8ebdb7e4` | ✓ MATCH |
| `components/shared/editorial-cover.tsx`  | `7885910f1ef2dec0f2c62f9cf874681e739ecf35942889f93337eb9a45b05371` | ✓ MATCH |
| `lib/editorial/reading.ts`               | `f62fb1c41ee27656f2bc9ad7d0ba5f8c81c3724caf58e03a0683af8ce347c586` | ✓ MATCH |

Divergência: **0.00%**.

---

## 4. Portões de Testes e Confiabilidade

1. **Vitest Unit Suite:** 583/583 testes aprovados em 53 arquivos de teste (`pnpm test:run` com exit code 0).
2. **Playwright Editorial E2E:** 15/15 cenários aprovados em 56.0s (`pnpm test:editorial` com exit code 0), cobrindo responsividade da home (320px, 390px, 768px, 1280px nos modos claro e escuro) e o leitor de artigos locais.
3. **Servidor Local Editorial:** Disponível para navegação local em `http://127.0.0.1:3000/`.
