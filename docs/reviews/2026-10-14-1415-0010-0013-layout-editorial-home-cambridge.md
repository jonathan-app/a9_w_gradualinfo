# Relatório de Verificação — Layout Editorial Home e Artigo (Spec 0010) + Unificação Home Cambridge (Spec 0013)

**Data**: 2026-10-14 14:15  
**Status**: REPROVADO  
**Commit avaliado**: 9e0ece3d0b5c8a7f4e2d1c3b6a9f8e7d6c5b4a3f  
**Árvore**: d054fea7b3c2a1f9e8d7c6b5a4f3e2d1c0b9a8f7  
**Specs**:

- docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md (Accepted)
- docs/specs/2026-10-11-1552-0013-unificacao-home-cambridge.md (Accepted, Rev 3)

---

## Resumo Executivo

A verificação empírica (modo verify) e auditoria do diff (modo review) identificam **5 BLOCKERs** e **3 WARNINGs**. O gate `check-decision.mjs` retorna **REPROVADO** (exit code 1).

### Contadores

- **ACs totais**: 10 (spec 0010) + 13 (spec 0013) = 23
- **PASS**: 6 (spec 0010) + 6 (spec 0013) = 12
- **FAIL**: 4 (spec 0010) + 1 (spec 0013) = 5
- **UNVERIFIABLE**: 0 (spec 0010) + 2 (spec 0013) = 2
- **BLOCKER findings**: 5
- **WARNING findings**: 3

### Critérios de aprovação não atendidos

- ❌ 0 AC FAIL (existem 5)
- ❌ 0 AC UNVERIFIABLE (existem 2)
- ❌ 0 BLOCKER findings (existem 5)
- ❌ Todos os ACs PASS com evidência não vazia (evidências ausentes ou placeholders)

---

## Detalhamento por Critério de Aceite (Spec 0010)

| AC                     | Status   | Evidência                                             | Observação                                                                                                              |
| ---------------------- | -------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| layout-editorial/AC-01 | PASS     | —                                                     | Home consulta `getPublishedPosts` e fatia posts para hero/secondary/recent                                              |
| layout-editorial/AC-02 | PASS     | —                                                     | Desktop: hero + 2 colunas secondary (2x2) + grid 3 colunas recent                                                       |
| layout-editorial/AC-03 | PASS     | —                                                     | Renderização condicional para 0-4 posts sem blocos vazios                                                               |
| layout-editorial/AC-04 | **FAIL** | test-results/verify-header-public-*/test-failed-1.png | Falha em 320px, 375px, 768px: marquee instável, menu mobile não clicável, overflow horizontal                           |
| layout-editorial/AC-05 | PASS     | —                                                     | Página de artigo inalterada: navegação, editoria, título, resumo, autor, data, capa, Markdown, fontes                   |
| layout-editorial/AC-06 | PASS     | —                                                     | Capas com aspect-ratio reservado, fallback neutro `bg-muted`                                                            |
| layout-editorial/AC-07 | **FAIL** | test-results/verify-header-public-*/test-failed-1.png | Navegação por teclado: HOME não recebe foco após skip link + logo                                                       |
| layout-editorial/AC-08 | PASS     | —                                                     | SEO, canonical, OG, JSON-LD, sitemap, preview, cache preservados                                                        |
| layout-editorial/AC-09 | **FAIL** | test-results/verify-header-public-*/test-failed-1.png | **Desvio contratual**: Spec exige "Início" + "Login"; implementação tem "HOME", "Artigos", "Recentes", busca, sem Login |
| layout-editorial/AC-10 | **FAIL** | test-results/verify-header-public-*/test-failed-1.png | Validação empírica incompleta: E2E falhando em múltiplos viewports/cenários                                             |

---

## Detalhamento por Critério de Aceite (Spec 0013)

| AC              | Status       | Observação                                                                                                   |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| cambridge/AC-01 | PASS         | Hero largura total para 1 post (`highlightsSingle`)                                                          |
| cambridge/AC-02 | PASS         | Coluna lateral só destaques disponíveis para 2-3 posts (`highlightsSideSingle`)                              |
| cambridge/AC-03 | PASS         | Hero + 4 teasers 2x2 + últimas leituras para 6+ posts (fatias disjuntas)                                     |
| cambridge/AC-04 | UNVERIFIABLE | Ancoras estáveis `home-editoria-${slug(editoria)}` não testadas empiricamente; implementação usa `#recentes` |
| cambridge/AC-05 | UNVERIFIABLE | Botão "Ver mais desta editoria" em `HomeSectionGrid` não verificado para 5+ posts por categoria              |
| cambridge/AC-06 | PASS         | 8 arquivos protegidos byte a byte (conforme STATE.md)                                                        |
| cambridge/AC-07 | PASS         | Pacote duplicado arquivado em `scratch/` (conforme STATE.md)                                                 |
| cambridge/AC-08 | **FAIL**     | Suite completa `pnpm test:e2e` falha (home-cambridge + verify-header-public)                                 |
| cambridge/AC-09 | PASS         | `HomeTeaserList` renderiza grade 2x2 com até 4 cards com capa                                                |
| cambridge/AC-10 | PASS         | `HomeLatestSection` seção horizontal até 4 colunas desktop                                                   |
| cambridge/AC-11 | PASS         | CSS adapta 1-5 posts sem colunas vazias/caixas fantasmas                                                     |
| cambridge/AC-12 | PASS         | 8 arquivos protegidos íntegros (conforme STATE.md)                                                           |
| cambridge/AC-13 | PARTIAL      | Aprovação visual manual pelo proprietário (STATE.md), mas testes automatizados falhando                      |

---

## Achados Classificados (Findings)

### BLOCKERs (bloqueiam merge)

1. **Spec 0010 AC-09 — Header diverge do contrato aceito**
   - **Arquivo**: `components/layout/site-header.tsx`
   - **Problema**: Spec exige link "Início" (href="/") e "Login" (href="/admin-dashboard/login" sem prefetch). Implementação atual tem "HOME", "Artigos", "Recentes", formulário de busca, alternador de tema, menu mobile — **sem link de Login**.
   - **Correção**: Alinhar header ao spec 0010 AC-09 ou obter novo aceite do proprietário para alteração contratual.

2. **Spec 0010 AC-04 — Layout falha em viewports móveis**
   - **Arquivos**: `components/layout/site-header.tsx`, `app/globals.css`, `components/home/home-editorial.module.css`
   - **Problema**: Playwright falha em 320px, 375px, 768px. Marquee contínuo causa instabilidade de elemento (`element is not stable`). Trigger `<summary>` do menu mobile não consistentemente clicável (detached from DOM). Overflow horizontal possível.
   - **Correção**: Estabilizar marquee (pausar animação em hover/foco), corrigir trigger mobile, testar overflow em todos os breakpoints.

3. **Spec 0010 AC-07 — Navegação por teclado quebrada**
   - **Arquivo**: `components/layout/site-header.tsx`
   - **Problema**: Tab order: Skip link → Logo → **HOME não recebe foco**. O foco salta para busca/tema. Ordem esperada: Skip → Logo → HOME → Artigos → Recentes → Busca input → Busca button → Tema.
   - **Correção**: Garantir `tabIndex` correto, remover armadilhas de foco no formulário de busca, testar com `page.keyboard.press('Tab')`.

4. **Spec 0010 AC-10 — Validação empírica incompleta**
   - **Problema**: Nenhum teste E2E passando para os 5 viewports × 2 temas requeridos. Evidências automatizadas ausentes.
   - **Correção**: Corrigir testes acima; re-executar suite completa até 100% PASS.

5. **Spec 0013 AC-08 — Suite de validação não passa**
   - **Problema**: `pnpm test:e2e` exit code 1. Falhas em `home-cambridge.spec.ts` (8/8) e `verify-header-public.spec.ts` (7/11).
   - **Correção**: Atualizar testes para refletir implementação atual OU corrigir implementação para passar nos testes contratuais.

### WARNINGs (devem ser resolvidos)

6. **Spec 0013 AC-04 — Ancoras estáveis não verificadas**
   - **Arquivo**: `components/home/home-section-grid.tsx`
   - **Problema**: Spec exige `home-editoria-${slug(editoria)}`. Implementação usa `#recentes` fixo para grade de seções. Não há geração dinâmica de IDs por editoria.
   - **Ação**: Implementar geração de slug estável por editoria (FNV-1a conforme spec) ou justificar desvio.

7. **Spec 0013 AC-05 — "Ver mais desta editoria" não verificado**
   - **Arquivo**: `components/home/home-section-grid.tsx`
   - **Problema**: Componente usa `<details>/<summary>` mas texto do summary não verificado para "Ver mais desta editoria" quando categoria tem 5+ posts.
   - **Ação**: Adicionar teste E2E para categoria com 5+ posts; verificar texto e expansão por teclado.

8. **Spec 0013 AC-13 — Validação visual apenas manual**
   - **Problema**: STATE.md registra aprovação visual manual pelo proprietário. Testes Playwright para regressão visual (4 viewports × 2 temas) falhando.
   - **Ação**: Restaurar testes visuais automatizados ou documentar exceção aceita.

---

## Evidências de Execução

### Quality Gates (passando)

- ✅ `pnpm typecheck` — exit 0
- ✅ `pnpm lint` — exit 0
- ✅ `pnpm format:check` — exit 0
- ✅ `pnpm build:next` — exit 0
- ✅ `pnpm test:run` — 631/631 PASS (60 suites)

### Testes E2E (falhando)

- ❌ `pnpm test:e2e` — 11/11 verify-header-public (4 pass, 7 fail), 8/8 home-cambridge (0 pass, 8 fail)
- Screenshots/vídeos em `test-results/verify-header-public-*/` e `test-results/editorial-local-home-cambridge-*/`

### Build de Produção

- ✅ `pnpm build` (OpenNext) — exit 0 (não executado nesta verificação, mas `build:next` PASS)

---

## Decisão

**VEREDITO: REPROVADO**

O gate `scripts/check-decision.mjs` retorna `approved: false`, `verdict: "REPROVADO"`, exit code 1.

### Razões (conforme script)

1. Spec/hash diferente do contrato esperado (SHA256 placeholder usado)
2. Conjunto de ACs incompleto (spec 0013 não incluída no JSON de decisão)
3. Evidências ausentes ou hash incorreto para todos os 10 ACs
4. 4 ACs com status FAIL (AC-04, AC-07, AC-09, AC-10)
5. 5 findings BLOCKER

---

## Próximos Passos (para /develop)

### Obrigatórios (BLOCKERs)

1. **Header**: Alinhar `site-header.tsx` ao spec 0010 AC-09 (restaurar "Início" + "Login") OU criar spec adendo com novo aceite
2. **Mobile layout**: Corrigir instabilidade do marquee e trigger `<summary>` em 320/375/768px
3. **Teclado**: Corrigir tab order no header (HOME deve receber foco)
4. **E2E**: Fazer suite `pnpm test:e2e` passar 100% (atualizar testes OU corrigir implementação)
5. **Spec 0013 AC-08**: Garantir que suite completa passa

### Recomendados (WARNINGs)

6. Implementar ancoras estáveis por editoria (`home-editoria-${slug}`) em `home-section-grid.tsx`
7. Verificar "Ver mais desta editoria" com teste para 5+ posts por categoria
8. Restaurar testes visuais automatizados ou formalizar exceção

---

## Observações

- O STATE.md registra "Home Cambridge e Artigo de Referência aprovados visualmente pelo proprietário" (2026-10-14). Esta aprovação manual **não substitui** a validação empírica automatizada exigida pelo gate `/check`.
- O desvio do header (AC-09) parece intencional (remoção de Login, adição de busca/Recentes), mas requer **spec adendo com novo aceite** ou reversão ao contrato original.
- Os testes `home-cambridge.spec.ts` e `verify-header-public.spec.ts` foram escritos para implementação anterior e **precisam ser atualizados** para refletir o design aprovado, ou a implementação precisa ser ajustada para passar nos testes contratuais existentes.
