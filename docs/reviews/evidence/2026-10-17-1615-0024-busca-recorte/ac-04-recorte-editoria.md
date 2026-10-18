# Evidência de verificação busca/AC-04

- Critério: O recorte por editoria restringe os resultados aos artigos pertencentes à categoria selecionada quando o parâmetro for válido, retornando todas as editorias caso o parâmetro seja vazio, omitido, igual a todas ou desconhecido.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação de filtragem e fallbacks

A suíte __tests__/unit/lib/search-posts.test.ts valida a lógica de restrição de categoria em searchPostsWithFilters:
- Filtragem estrita: com editoria="Tecnologia", apenas artigos com editoria Tecnologia são incluídos.
- Normalização de editoria: "seguranca" sem acento casa com "Segurança".
- Fallback para todas: quando editoria="todas", nenhum artigo é excluído por categoria e activeEditoria retorna undefined.
- Fallback para editoria desconhecida: quando editoria="Inexistente", o filtro inválido é descartado e todos os artigos são avaliados.

## 2. Comprovação na interface do usuário

A suíte __tests__/unit/app-busca.test.tsx comprova que ao filtrar por "Tecnologia", o cabeçalho exibe "Resultados para “Novidade” em Tecnologia" e artigos de outras editorias são omitidos.

Veredito: PASS
