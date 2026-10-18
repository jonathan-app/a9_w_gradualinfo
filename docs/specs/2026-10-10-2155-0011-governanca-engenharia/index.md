# 0011. Governança de engenharia

**Date**: 2026-10-10
**Status**: Accepted
**Decision source**: aceite explícito do dono em 2026-10-10 à proposta completa da spec 0011, após revisão independente e incorporação das quatro correções autorizadas. Auditoria de origem: `docs/audits/2026-10-10-2151-auditoria-sdd-skills-check-mcp.md`.

## Summary

Cada resultado de qualidade deve dizer qual revisão e qual spec avaliou. O catálogo de skills deve corresponder à lista aprovada. A configuração MCP deve identificar o cliente e comprovar a ferramenta antes de uma verificação que dependa dela.

## Structure

- [CI e /check](0011-ci-check.md): define cobertura, vínculo das evidências e acionamento da CI.
- [Skills](0011-skills.md): define admissão, integridade e portabilidade.
- [MCP](0011-mcp.md): define configuração e prova de disponibilidade por cliente.

## Requirements

- **governance/AC-01**: toda revisão exigida para uma entrega identifica spec, commit, árvore e evidências; ausência ou falha de uma revisão exigida impede aprovação mecânica.
- **governance/AC-02**: a guarda de skills detecta skill extra, ausente ou alterada e a CI executa essa guarda no checkout avaliado.
- **governance/AC-03**: uma verificação dependente de MCP registra o cliente, a ferramenta disponível e um teste de uso; configuração declarada sozinha não recebe PASS.
- **governance/AC-04**: estado da decisão, resultado mecânico, aceite editorial e publicação permanecem distintos.

## Decision

Adotar os três contratos filhos como um padrão de governança do repositório. A revisão usa um manifesto explícito de specs exigidas para o escopo da mudança. Uma spec aceita define um contrato de construção, mas não comprova que seu código passou em `/check`. O índice e cada contrato filho têm status próprio e entram no manifesto quando exigidos. O resultado de cada arquivo passa pela autoridade de `check-decision.mjs` e `check-gate.mjs`; a agregação reprova se qualquer resultado exigido reprovar ou faltar. A CI se aciona no branch padrão real do remoto e nos PRs destinados a ele, após conferência da configuração remota. Nenhum teste local ou arquivo de configuração substitui a prova de runtime.

**Implementation skills**: `/develop` para os scripts e CI, `/check` para verificar o gate, `/test` para regressões e `/sync` para o contexto durável. São skills do fluxo já descritas em `AGENTS.md`.

## Standard definition

| Campo             | Contrato                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical pattern | Specs aceitas e escopo ativo determinam quais revisões são exigidas; artefatos e guardas pertencem ao mesmo checkout.                                           |
| Replaces          | A inferência de cobertura total a partir do gate fixo `md-0002`, a suposição de que a skill instalada é aprovada e a suposição de que MCP declarado está ativo. |
| Enforcement       | CI falha quando falta resultado exigido ou falha uma guarda; `/check verify` registra prova real por AC e ferramenta.                                           |
| Rollout           | Primeiro fechar a baseline de skills, depois ampliar o gate em uma spec piloto, então cobrir as demais specs ativas e as ferramentas MCP necessárias.           |
| Exceptions        | Dependência de ambiente ausente gera UNVERIFIABLE no AC correspondente. A exceção não aprova o gate.                                                            |

## Consequences

A CI pode permanecer vermelha até existirem evidências completas. A lista de specs exigidas precisa acompanhar o escopo e a revisão; um arquivo Accepted sem entrega ativa não entra automaticamente no gate. MCP de desenvolvimento não recebe acesso ao banco de produção. Os contratos filhos indicam como manter a operação e como reverter cada mudança.

## Follow-up

- Reconciliar `docs/specs/2026-10-08-2228-INDICE.md` com as specs 0009, 0010 e 0011 após aceite, registrando a convenção real de IDs e de branch.
- Reconciliar o `Bastão atual` sem apagar o histórico, preservando as frentes de deploy e provisionamento.

## Rationale

Motivos e alternativas: [rationale.md](rationale.md).
