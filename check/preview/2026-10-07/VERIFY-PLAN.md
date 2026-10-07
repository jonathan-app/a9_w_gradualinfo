# Plano de verificação

Estado: Not run. Contratos: `docs/specs/0003-preview-autorizacao.md`,
`docs/specs/0004-gate-revisao-ci.md` e md-0002 Accepted.

- preview/AC-01: observar GET 405 e POST válido, URL e cookies sem segredo.
- preview/AC-02: configurações ausentes, iguais e UUID inválido negam acesso.
- preview/AC-03: usuário permitido, sem claim, claim em user_metadata e UUID
  diferente. Somente identidade e claim verificadas concedem leitura.
- preview/AC-04: prazo absoluto de 1800 segundos e sessão Auth expirada
  independentes. Renovação Auth não renova grant. Troca de session_id nega.
- preview/AC-05: produção HTTPS, Secure, HttpOnly, SameSite lax e no-store.
- preview/AC-06: logout bem sucedido e erro remoto, incluindo exceção, limpam
  cookies locais; erro real responde 503 e mantém acesso público sem preview.
- preview/AC-07: servir título malicioso em produção compilada, JSON-LD
  parseável preserva valores sem injetar script ou elemento.
- preview/AC-08: origem diferente recebe 403, slug inválido é negado,
  Host e x-forwarded-host adulterados não alteram destino do redirect.
- gate/AC-01 a AC-04: fixtures Git descartáveis, conjunto exato, decisão
  ausente/malformada/reprovada, hash alterado, commit novo e árvore suja
  reprovam. Caso positivo da mesma revisão e evidências íntegras passa.
- gate/AC-05: jobs com fixtures próprias, servidor compilado, typecheck E2E,
  scanners locais e versões pinadas. Obter execução CI, não inferir por YAML.
- md-0002/AC-01 a AC-13: usar matriz canônica e 12 cenários do inventário
  `docs/reviews/2026-10-07-md0002-inventario.md`. Registrar observações por AC.

O plano não é evidência de execução ou aceite de entrega.
