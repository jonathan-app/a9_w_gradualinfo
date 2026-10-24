---
name: e2e-critical
description: Garante ou implementa os sete fluxos E2E críticos do GradualInfo com Playwright (e MCP Playwright quando a prova exigir chamada MCP real).
license: MIT
compatibility: opencode
metadata:
  project: gradualinfo
  phase: agency-10
  spec: 0011-mcp
---

## Quando usar

Escrever, corrigir ou verificar E2E dos caminhos que definem qualidade de agência. Para prova MCP da spec 0011, a navegação deve usar a ferramenta MCP Playwright — não só `pnpm exec playwright`.

## Sete fluxos críticos

1. Leitura pública: home → artigo → busca
2. Preview autorizado + logout de preview
3. Login admin → MFA → dashboard
4. Recovery de senha admin
5. Ingest de oferta → avaliar selo → evidência (ou API coberta por teste de integração se E2E full for inviável)
6. Rate limit / bloqueio de acesso admin
7. Indisponibilidade Sanity: 503 ou banner honesto, sem fallback silencioso para catálogo local em produção

## Fonte de verdade

1. `e2e/`, `playwright.config.ts`, `playwright.editorial.config.ts`
2. Spec 0011 MCP: prova com descoberta da ferramenta, URL local, status, captura/hash
3. `app/api/health`, `proxy.ts`, guards em `lib/admin/**`

## Passos

1. Inventariar specs existentes vs os sete fluxos; listar buracos.
2. Preferir seletores estáveis (role/label); evitar texto de artigo volátil sem fixture.
3. Isolar suítes legadas se flakiness for conhecido (ver histórico em `workflow/STATE.md`).
4. Para verify MCP: subir app local, usar Playwright MCP para abrir `http://127.0.0.1:<porta>/api/health`, registrar 200 e evidência.
5. Rodar `pnpm test:e2e` ou subset documentado; não esconder flake.

## Restrições

- Não gravar credenciais reais de admin em fixture versionada.
- Não apontar E2E de CI para produção por padrão.
- Catálogo `EDITORIAL_LOCAL` só em dev/loopback.

## Critério de pronto

- Matriz fluxo × status (existe / flaky / ausente).
- Pelo menos os buracos priorizados com teste ou issue documentada.
- Comandos exatos para reproduzir localmente.