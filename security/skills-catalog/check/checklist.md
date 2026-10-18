# Checklist de Validação: /check

> Usado pelo modo verify. Marque cada item. Qualquer FAIL, qualquer UNVERIFIABLE e qualquer
> BLOCKER reprova. A decisão final é a saída de `scripts/check-decision.mjs`.

## 1. Build e Qualidade de Código

- [ ] `pnpm build` passa sem erros
- [ ] `pnpm lint` passa sem erros
- [ ] `pnpm typecheck` (ou `tsc --noEmit`) passa sem erros
- [ ] `pnpm format:check` passa (Prettier)
- [ ] Nenhum `console.log` / `debugger` deixado no código
- [ ] Nenhum `@ts-ignore` / `@ts-expect-error` sem justificativa em comentário

## 2. Testes

- [ ] `pnpm test:run` (Vitest) passa 100%
- [ ] `pnpm test:e2e` (Playwright) passa nos fluxos críticos
- [ ] Cobertura de código não diminuiu em relação à base
- [ ] Novas funções têm testes unitários
- [ ] Novas páginas/fluxos têm teste E2E

## 3. Critérios de Aceite (da spec)

Cada AC recebe exatamente um estado: PASS, FAIL ou UNVERIFIABLE. PASS exige evidência; AC não
testável é UNVERIFIABLE, e UNVERIFIABLE reprova.

- [ ] AC-01 verificado (PASS / FAIL / UNVERIFIABLE) : evidência: ____
- [ ] AC-02 verificado (PASS / FAIL / UNVERIFIABLE) : evidência: ____
- [ ] AC-03 verificado (PASS / FAIL / UNVERIFIABLE) : evidência: ____
- [ ] (adicionar todos os ACs da spec)
- [ ] Nenhum AC ficou UNVERIFIABLE (cada um virou PASS com evidência ou FAIL corrigido)
- [ ] Toda reprovação tem reason acionável anotada (o que corrigir, onde, por quê)

## 4. Estados de UI (se aplicável)

- [ ] Estado de sucesso (dados carregam)
- [ ] Estado vazio (sem dados, mensagem amigável)
- [ ] Estado de carregamento (skeleton/spinner)
- [ ] Estado de erro (falha na API, retry disponível)

## 5. Segurança

- [ ] Nenhum segredo hardcoded (API key, senha, token)
- [ ] Input validado no servidor
- [ ] Nenhum endpoint exposto sem autorização
- [ ] Rate limiting em endpoints sensíveis
- [ ] `pnpm audit` sem vulnerabilidades críticas

## 6. Performance

- [ ] Lighthouse: Performance ≥ 90 (mobile)
- [ ] Lighthouse: Acessibilidade ≥ 90
- [ ] Lighthouse: SEO ≥ 90
- [ ] Imagens usam next/image com lazy loading
- [ ] Sem importações desnecessárias no bundle client

## 7. Acessibilidade

- [ ] axe-core sem erros críticos
- [ ] Navegação por teclado funciona
- [ ] Labels em todos os inputs
- [ ] Contraste de texto atende WCAG AA

## 8. SEO (para blog)

- [ ] Meta title e description presentes
- [ ] Open Graph tags presentes
- [ ] URL canônica definida
- [ ] Sitemap atualizado
- [ ] Structured data (Schema.org) onde aplicável

## 9. Git e Convenções

- [ ] Commits atômicos, em português, conventional commits
- [ ] Sem arquivos desnecessários no diff (node_modules, .next, .env)
- [ ] Branch atualizada com a base (main)
- [ ] PR template preenchido corretamente

## Resultado

Monte `{ "acs": [...], "findings": [...] }` e rode
`node scripts/check-decision.mjs <resultado.json>`. O exit code e o `verdict` impressos são a
decisão; não a reinterprete.

- [ ] **APROVADO** (exit 0) : pelo menos 1 AC verificado, todos PASS com evidência, 0 FAIL,
      0 UNVERIFIABLE, 0 BLOCKER → aciona /test
- [ ] **REPROVADO** (exit 1) : AC FAIL, AC UNVERIFIABLE, BLOCKER, lista de ACs vazia ou PASS
      sem evidência → reasons do script viram a lista de correções para /develop

**Revisor:** ____________ **Data:** ____________ **Spec:** docs/specs/____.md
