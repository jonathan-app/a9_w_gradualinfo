# Evidência home-pendentes/AC-09: menu público sem entrada administrativa

## Critério

O menu público (desktop e mobile) não deve expor nenhum link para a área administrativa.

## Verificação Empírica

1. Teste "AC-09: menu público não expõe entrada administrativa" (1440x900) e "AC-09 (mobile): menu não expõe entrada administrativa" (375x667, com o menu nativo `<details>` aberto) de `e2e/verify-home-pendentes.spec.ts`.
2. A contagem de `header a[href*="admin"]` foi 0 nas duas larguras.
3. Registros no `run-log.jsonl`: `ac-09-sem-admin-desktop` e `ac-09-sem-admin-mobile`, ambos com `adminLinks: 0`.
4. Captura: `screenshots/ac-09-menu-mobile-aberto.png` (SHA-256 `89619b56adf288ea4ecd1258c68e5ba93ee902aa142fa2cb4499642efcd93e5f`).
5. A rota administrativa permanece acessível apenas por URL direta, como decidido no bastão de 2026-10-12.

## Veredito

**PASS**
