# /test config-admin-access · execução 2026-10-10-1804

## Escopo

Um arquivo fonte não commitado, classificado como `cli`:

- `scripts/config-admin-access.mjs` (não rastreado): helper que valida os bindings
  `ADMIN_ACCESS_*` e os publica no Worker `gradualinfo` via `wrangler secret put`.

Contrato governante: `docs/specs/2026-10-09-1632-0009-admissao-admin-access.md`
(spec 0009, admin-access/AC-04, AC-11, AC-13). Sem `verify.md` ao lado da spec;
critérios lidos da seção `## Requirements`.

## Portão de segurança (entrada)

- `pnpm security:sast` (semgrep): **0 findings**, exit 0.
- `pnpm security:secrets` (gitleaks 8.28.0): exit 1 com 57 findings redigidos,
  nenhum na cobertura deste teste:
  - 56 no manifesto de evidência `docs/reviews/evidence/2026-10-10-1527-verify-0853696/2026-10-10-1527-source-before.json`,
    todos do commit histórico `9e0ece31` (pré-existente, fora do escopo).
  - 1 em `wrangler.jsonc:56`, valor `NEXT_PUBLIC_SUPABASE_ANON_KEY` no formato
    `sb_publishable_*`, público por design (variável `NEXT_PUBLIC_`, embarcada no
    bundle de cliente), documentado no próprio arquivo e no STATE. Arquivo de
    configuração, fora do escopo de teste deste skill.
- `scripts/config-admin-access.mjs`: zero findings. O script não contém valores,
  só nomes, e nunca imprime o que recebe.

Veredito: entrada liberada para o código coberto; o finding de `wrangler.jsonc`
é valor público intencional, não achado Critical/High exposto pelo código testado.

## Comando executado e resultado

```
pnpm exec vitest run __tests__/unit/config-admin-access.test.ts --reporter=dot
```

- Exit code: **0** · 21 passed, 0 failed, 1 arquivo.
- Regressão da suíte completa: `pnpm test:run` → **531 passed** (era 510; +21).
- `pnpm exec eslint __tests__/unit/config-admin-access.test.ts` → exit 0.
- `pnpm exec prettier --write/--check` no arquivo → exit 0.
- `pnpm typecheck` (tsc --noEmit) → exit 0.

## Identidade da versão testada

- Node v22.23.1, Vitest 5.0.3 (linux-x64), pnpm.
- HEAD `9e0ece3137288f7f1bdb7637f447ab2ffdeefba1`, árvore `03470ee17728797aa7c7cf9dc992e70eba871f50`.
- Árvore de trabalho suja no momento do teste, com `scripts/config-admin-access.mjs`
  e `__tests__/unit/config-admin-access.test.ts` não rastreados. O teste executa o
  script do working tree, que é exatamente a versão sob avaliação.

## Cobertura por critério (rastro no arquivo de teste)

| Critério (spec 0009)                                                                                  | Cobertura | Provas                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| admin-access/AC-04 (validar configuração antes de qualquer uso; paridade com `readAdminAccessConfig`) | SIM       | 10 casos `it.each` de rejeição (issuer sem HTTPS, host fora do cloudflareaccess.com, issuer sem subdomínio, issuer com path, issuer com credencial, issuer não URL, e-mail sem @, host com maiúscula, host com `..`, host vazio na lista) mais espaços sobrando, linha vazia, stdin curto e agregação de múltiplos erros |
| admin-access/AC-11 (nunca ecoar token, e-mail ou host em log ou saída)                                | SIM       | valor sentinela nunca aparece em stdout/stderr no caminho de erro                                                                                                                                                                                                                                                        |
| admin-access/AC-13 (configuração local autorizada; publicação remota exige ação explícita)            | SIM       | dry-run aceita válidos sem chamar o wrangler (zero chamadas), aceita CRLF; caminho de publicação chama `wrangler secret put <NOME> --name gradualinfo` quatro vezes com o valor pelo stdin; falha do wrangler interrompe no primeiro nome                                                                                |
| admin-access/AC-05 (configuração inválida reprovada localmente)                                       | indireto  | a paridade de validação evita publicar binding que causaria 503                                                                                                                                                                                                                                                          |

## Critérios não cobertos

- Nenhum AC da spec 0009 deixado de fora por incapacidade de automação neste
  escopo. O que a suíte não prova é ambiente real (Worker publicado, JWT real,
  MFA), que permanece para `/check verify`.
- Caminho TTY do script (raw mode, leitura byte a byte): não automatizável sem
  TTY real; o teste cobre o caminho de pipe, que é o usado pela CI.
- Efeito real do `wrangler secret put` na Cloudflare: fora do escopo, exige
  autorização específica (AC-13).

## Saída de apoio (resumo)

```
Test Files  1 passed (1)
     Tests  21 passed (21)
```

Falhas durante a escrita: 1 (expectativa minha, não do código). O caso
"issuer com credencial na URL" esperava a mensagem do branch de credenciais, mas
`url.origin` exclui credenciais e a checagem de origem vem primeiro, igual em
`lib/env.ts:143`. Comportamento do script (rejeitar) estava correto; a expectativa
foi corrigida para a mensagem observável.
