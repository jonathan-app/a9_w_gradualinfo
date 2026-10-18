# /check verify — proteção local de arquivos de ambiente

**Data:** 2026-10-11 23:43 (America/Sao_Paulo)  
**Escopo:** `.gitignore`, `scripts/check-env-leak.mjs`, `.husky/pre-commit` e o modelo `.env.example`.  
**Resultado do gate formal:** **REPROVADO**. A verificação local deste recorte passou, mas não aprova uma spec nem o merge.

## Evidência empírica do recorte

| Verificação                                                                               | Resultado | Evidência                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.dev.vars`, variantes e `.env.local` na raiz e subpasta são ignorados                    | PASS      | `git check-ignore -v` apontou `.gitignore:19` e `:45` para todos os caminhos testados.                                                                                                             |
| Arquivos locais confidenciais já rastreados                                               | PASS      | `git ls-files -ci --exclude-standard` sem saída; `node scripts/check-env-leak.mjs` exit 0.                                                                                                         |
| Tentativa de `git add` comum e forçado num repositório temporário, com valores sintéticos | PASS      | [`2026-10-11-2343-force-add.json`](evidence/2026-10-11-2343-env-protection/2026-10-11-2343-force-add.json): add comum bloqueado, `.env.example` permitido, add forçado detectado em dois arquivos. |
| Hook e qualidade do verificador                                                           | PASS      | `sh -n .husky/pre-commit`, ESLint, Prettier e `git diff --check` exit 0. O hook contém chamada a `node scripts/check-env-leak.mjs`.                                                                |

Nenhum conteúdo de `.env.local` ou `.dev.vars` foi lido ou incluído nas evidências. O teste isolado usou apenas `SYNTHETIC=placeholder`.

## Limites e decisão

Não há spec `Accepted` com ACs numerados específicos para esta alteração. A spec 0008 é um checklist de segurança de IA, não um contrato para proteção de dotenv; a spec 0009 cobre admissão administrativa completa. `pnpm build`, aplicação real, navegador e validação remota não foram executados para este recorte. A árvore de trabalho contém mudanças de outras sessões; `git write-tree` não pôde criar `.git/index.lock` porque o índice está somente para leitura, então não há snapshot Git novo da árvore alterada.

O comando `node scripts/check-decision.mjs` foi executado com o resultado em [`2026-10-11-2343-check-result.json`](evidence/2026-10-11-2343-env-protection/2026-10-11-2343-check-result.json). [Decisão](evidence/2026-10-11-2343-env-protection/2026-10-11-2343-decision.json): `approved=false`, `verdict=REPROVADO`. Motivos exatos:

- `Spec não está Accepted.`
- `Spec sem conjunto único de ACs.`

**Próximo trabalho legítimo:** `/architect` pode registrar um contrato específico para proteção de arquivos de ambiente, com ACs testáveis. Depois, `/check verify` deve executar o gate sobre snapshot vinculado ao diff final. A proteção local comprovada neste relatório já funciona; a reprovação é do gate formal e não implica que os arquivos locais estejam sendo rastreados.
