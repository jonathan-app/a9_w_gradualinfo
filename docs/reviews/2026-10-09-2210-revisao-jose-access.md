# Revisão: uso de `jose` em `lib/admin/` e rejeições do Access JWT

**Data**: 2026-10-09 22:10 (America/Sao_Paulo)
**Escopo**: `lib/admin/access.ts` (verificador Access JWT), `lib/admin/auth.ts` (autorização UUID + AAL2)
**Contrato governante**: spec 0009 (`docs/specs/2026-10-09-1632-0009-admissao-admin-access.md`, Accepted)

## Uso de `jose`

`lib/admin/access.ts` usa três funções de `jose`:

1. `decodeProtectedHeader` — lê o header sem verificar, para checar `alg`, `kid`, `jku`, `x5u` antes de buscar a chave.
2. `importJWK` — importa a chave pública do JWKS para `CryptoKey`.
3. `jwtVerify` — verifica assinatura, algoritmo, `issuer`, `audience`, claims obrigatórios e prazos.

## Rejeições testadas

41 testes em `__tests__/unit/admin-access.test.ts`, todos verdes:

| Cenário                    | Status | Evidência                                                              |
| -------------------------- | ------ | ---------------------------------------------------------------------- |
| Assinatura corrompida      | PASS   | Teste `recusa assinatura corrompida mesmo com header e claims válidos` |
| Algoritmo `HS256`          | PASS   | Teste `recusa token com alg HS256 em vez de RS256`                     |
| Algoritmo `none`           | PASS   | Teste `recusa token com alg none mesmo sem assinatura`                 |
| `issuer` divergente        | PASS   | Teste `recusa claims divergentes` com `iss`                            |
| `audience` divergente      | PASS   | Teste `recusa claims divergentes` com `aud`                            |
| `exp` no passado           | PASS   | Teste `recusa token expirado há mais de 5s`                            |
| `iat` no futuro            | PASS   | Teste `recusa claims divergentes` com `iat` futuro                     |
| `nbf` no futuro além de 5s | PASS   | Teste `recusa token com nbf no futuro além da tolerância de 5s`        |
| `exp - iat > 3600`         | PASS   | Teste `recusa claims divergentes` com `exp` excedendo máximo           |
| `jku` no header            | PASS   | Teste `recusa header jku`                                              |
| `x5u` no header            | PASS   | Teste `recusa header x5u`                                              |
| Chave RSA inutilizável     | PASS   | Teste `chave RSA inutilizável é indisponibilidade técnica`             |
| Rede indisponível          | PASS   | Teste `falha de rede não libera token`                                 |

## Tolerância de relógio: 5s vs 60s

**Skill `jwt-validate`**: recomenda 60 segundos de tolerância.

**Contrato da aplicação (spec 0009)**: especifica 5 segundos.

**Decisão**: o contrato da aplicação prevalece. O código usa `clockTolerance: 5` e os testes confirmam que tokens expirados há mais de 5s são rejeitados. Os 60s da skill **não são adotados** porque o contrato é mais restritivo e a spec 0009 é Accepted.

Justificativa: o Access JWT tem validade máxima de 3600s. Uma tolerância de 60s permitiria que um token expirado há até 1 minuto ainda fosse aceito, o que é uma janela desnecessária para um token de curta duração. Os 5s cobrem o skew normal de relógio sem comprometer a segurança.

## Preservação de `ADMIN_USER_ID` e AAL2

O Access JWT é a camada de autenticação do Cloudflare Access. A autorização por `ADMIN_USER_ID` e AAL2 acontece depois, no Supabase Auth:

- `lib/admin/auth.ts:275`: lê `env.adminUserId`
- `lib/admin/auth.ts:278`: fail-closed se ausente
- `lib/admin/auth.ts:290`: `data.user.id !== adminId` → `unauthorized`
- `lib/admin/auth.ts:296`: `resolveAdminMfaLadder` exige `aal2`

Essas verificações são independentes do Access JWT e permanecem intactas.

## Conclusão

O uso de `jose` está correto e alinhado ao contrato da aplicação. As rejeições de assinatura, algoritmo, `issuer`, `audience` e prazos inválidos estão implementadas e testadas. A tolerância de 5s do contrato prevalece sobre os 60s da skill. `ADMIN_USER_ID` e AAL2 são preservados.

Nenhum token ou chave aparece neste relatório. Merge e deploy continuam sem autorização.
