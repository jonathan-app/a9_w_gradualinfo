# Motivos da decisão 0011

## Context

A auditoria de 2026-10-10 encontrou guarda de skills reprovada, portabilidade reprovada, CI sem essas guardas, gate de `/check` fixo em `md-0002`, índice SDD desatualizado e configurações MCP distintas. O repositório já tem autoridade por spec e regras de evidência vinculadas ao Git. O problema é a seleção das revisões exigidas e a diferença entre um recurso declarado e um recurso comprovado.

## Options considered

1. Manter o gate fixo e confiar nos relatórios manuais para outras specs. Tem baixo custo imediato, mas o verde da CI é fácil de interpretar como aprovação geral.
2. Rodar todas as specs Accepted em toda revisão. Parece completo, mas mistura contratos históricos, referências e funcionalidades sem ambiente pronto; a CI ficaria vermelha sem relação clara com a entrega.
3. Selecionar explicitamente as specs exigidas por entrega e agregar vereditos por SHA e árvore. Exige manter um manifesto pequeno, mas torna a cobertura revisável e a falha atribuível. Esta é a recomendação.

Para skills, a alternativa de recalcular todos os hashes imediatamente foi rejeitada porque aprovaria conteúdo sem revisão. Para MCP, um único arquivo executável para todos os clientes foi rejeitado porque os esquemas e as instalações já diferem.

## Rationale

A autoridade da spec 0004 já protege o resultado individual. O novo padrão deve preservar essa autoridade e fechar a lacuna de seleção. Integridade de skills exige uma baseline reproduzível na CI. MCP requer prova no cliente e no ambiente efetivo. Nenhum desses sinais, isolado, autoriza publicação.

## Evidência local

- `docs/audits/2026-10-10-2151-auditoria-sdd-skills-check-mcp.md` registra comandos e arquivos examinados.
- `scripts/check-contract.mjs` fixa `DEFAULT_SPEC` em `md-0002`; `scripts/ci-check-results.mjs` usa esse valor.
- `.github/workflows/ci.yml` aponta a `main`, enquanto o bastão registra ausência de `main` no remoto. A configuração remota precisa ser consultada antes de afirmar que a CI está ativa.
