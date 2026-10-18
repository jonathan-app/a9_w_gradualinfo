# CI e /check

**Status**: Accepted
**Decision source**: aceite explícito do dono em 2026-10-10 à spec 0011 completa, incluindo este contrato filho, após revisão independente e correções autorizadas.

## Summary

A CI deve provar todas as specs exigidas pela entrega avaliada, sem atribuir o PASS de uma spec às demais.

## Requirements

- **ci/AC-01**: o manifesto de revisão enumera specs exigidas por caminho; caminhos ausentes, duplicados, fora de `docs/specs/` ou com status diferente de Accepted reprovam.
- **ci/AC-02**: cada spec exigida recebe artefato próprio com commit, árvore, hash da spec, conjunto exato de ACs e hashes de evidência; qualquer resultado ausente ou reprovado bloqueia a agregação.
- **ci/AC-03**: o job é acionado para o branch padrão remoto vigente e PRs dirigidos a ele; a configuração é conferida contra o remoto antes de declarar o gate efetivo.
- **ci/AC-04**: manifesto vazio, spec omitida em relação ao escopo, resultado de outro commit ou retirada de cobertura sem alteração revisada do escopo reprovam.
- **ci/AC-05**: aprovação mecânica não concede aceite editorial, merge ou deploy.

## Decision

Usar `workflow/check-targets.json` versionado, com `schemaVersion: 1` e uma lista não vazia de caminhos `specs`. A seção `At a glance` do escopo vigente e os ponteiros de spec das fatias `in-progress` são a fonte de seleção, junto com `md-0002` como baseline. A guarda compara exatamente esse conjunto ao manifesto. Retirar uma spec exige mudar a fatia do escopo na mesma revisão e expor a remoção no diff. Uma entrega sem spec fica reprovada até ser ligada a uma spec Accepted. Rodar a autoridade existente por arquivo com `--spec` explícito e agregar somente resultados do mesmo commit e árvore. O gerador `ci-check-results.mjs` precisa deixar de aplicar os casos exclusivos de `md-0002` às demais specs: cada spec ganha seu avaliador de evidência; sem avaliador ou prova, seus ACs ficam UNVERIFIABLE. O manifesto não aceita seleção pelo próprio artefato de resultado. A spec 0004 continua definindo a validação de cada resultado; esta decisão acrescenta seleção e agregação. O branch `main` escrito na CI não é tomado como fato remoto.

## Standard definition

| Item         | Regra                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Seleção      | Manifesto versionado no checkout, atualizado com a entrega e revisado no diff.                                               |
| Falha        | Spec exigida sem prova, com UNVERIFIABLE ou com BLOCKER reprova.                                                             |
| Proveniência | Mesmo SHA completo e árvore para manifesto, spec e resultado.                                                                |
| Rollout      | Preservar `md-0002` como primeira spec; validar a agregação com outra spec em teste; depois ampliar conforme o escopo ativo. |
| Reversão     | Reverter a ampliação do job para a versão anterior, sem declarar cobertura das specs adicionais; preservar os relatórios.    |

## Consequences

A expansão pode deixar o CI vermelho enquanto ambiente e evidências das specs 0006, 0007, 0009 e 0010 não estiverem disponíveis. Isso deve aparecer como resultado reprovado, não ser ocultado por um PASS legado.

## Rationale

Um gate fixo é simples, mas só prova `md-0002`. Uma matriz explícita mantém o contrato 0004 e torna visível o que falta para cada entrega.
