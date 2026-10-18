# Integridade das skills

**Status**: Accepted
**Decision source**: aceite explícito do dono em 2026-10-10 à spec 0011 completa, incluindo este contrato filho, após revisão independente e correções autorizadas.

## Summary

O catálogo local deve passar na guarda antes de ser tratado como aprovado.

## Requirements

- **skills/AC-01**: nomes, origem e hashes do lock, allowlist e instalação local coincidem; divergência reprova.
- **skills/AC-02**: adicionar uma skill exige revisar origem, conteúdo, permissões e alcance antes de atualizar a baseline.
- **skills/AC-03**: CI materializa o catálogo aprovado a partir de arquivos versionados e roda `skills:check` e a checagem de portabilidade no checkout da revisão, com testes negativos para extra, ausência e conteúdo alterado.
- **skills/AC-04**: um checkout limpo reproduz byte a byte as skills e os ponteiros aprovados; arquivo ausente ou hash divergente reprova antes de executar a skill.

## Decision

Versionar o conteúdo aprovado em `security/skills-catalog/<nome>/`, inclusive arquivos de apoio de cada skill, e os adaptadores em `security/skills-catalog-pointers/<nome>/SKILL.md`. Um script de materialização copia esses bytes para `.agents/skills/<nome>/` e `.claude/skills/<nome>/` antes das guardas, sem baixar código em tempo de CI. O manifesto `security/skills-allowlist.json` contém os hashes de caminho e conteúdo desse catálogo. `skills-lock.json` registra origem e revisão imutável de aquisição; a cópia versionada é a fonte dos bytes executados. O script falha se um arquivo estiver ausente, extra ou divergente e não atualiza hashes. A admissão de `jwt-validate` exige revisão específica; o simples fato de estar no lock não basta. Corrigir os 35 apontamentos de portabilidade que são defeitos reais e ajustar regras do verificador quando marcarem nomes técnicos válidos como prosa indevida. Só atualizar hashes depois dessas correções e revisão do diff.

## Standard definition

| Item              | Regra                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| Canonical pattern | Lock, allowlist e conteúdo instalado concordam antes do uso.                           |
| Enforcement       | `node scripts/check-skills.mjs` e `node scripts/check-portability.mjs` na CI.          |
| Exceção           | Skill em quarentena não conta como instalada.                                          |
| Rollout           | Revisar `jwt-validate`, resolver os 35 resultados, atualizar a baseline e ligar o job. |
| Reversão          | Voltar a revisão do catálogo e sua baseline juntos; manter o job fechado em falha.     |

## Consequences

Uma instalação local ignorada pelo Git pode divergir entre máquinas. A CI deve materializar o catálogo versionado antes de executar as guardas. A instalação ignorada pelo Git continua local, mas deve corresponder byte a byte ao catálogo.

## Rationale

Um hash atualizado sem revisão transforma uma mudança desconhecida em aprovada. A baseline é uma decisão humana sustentada por conteúdo verificável.
